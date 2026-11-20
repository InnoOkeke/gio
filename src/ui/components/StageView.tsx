import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { clampPan, clampZoom, MAX_ZOOM, MIN_ZOOM, pinchCenter, pinchDistance, zoomAbout, type Point, type ZoomView } from '../responsive/zoom';

export interface StageViewHandle {
  /** Back to the whole picture. */
  reset(): void;
}

interface StageViewProps {
  /** True while a game is running: then one finger never pans, only two fingers pinch. */
  isGame(): boolean;
  /** Called once a zoom has settled, so the canvas can be drawn sharp at that scale. */
  onSettle(scale: number): void;
  children: ReactNode;
}

const FIT: ZoomView = { scale: 1, x: 0, y: 0 };
const SETTLE_MS = 160;
const DOUBLE_TAP_MS = 320;
const TAP_SLOP = 10;
const STEP = 1.5;

/**
 * Pinch, pan and zoom for the stage. The canvases, guide and turtle share one CSS transform.
 * Page scroll keeps working at the whole-picture view (touch-action: pan-y), and once zoomed in
 * one finger pans the picture instead.
 */
export const StageView = forwardRef<StageViewHandle, StageViewProps>(function StageView({ isGame, onSettle, children }, ref) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [view, setViewState] = useState<ZoomView>(FIT);
  const viewRef = useRef<ZoomView>(FIT);
  const pointers = useRef(new Map<number, Point>());
  const last = useRef<{ dist: number; center: Point } | null>(null);
  const tap = useRef<{ at: number; x: number; y: number; moved: boolean }>({ at: 0, x: 0, y: 0, moved: false });
  const downAt = useRef<{ x: number; y: number; time: number } | null>(null);
  const settleTimer = useRef<number>();
  const callbacks = useRef({ isGame, onSettle });
  callbacks.current = { isGame, onSettle };

  const size = () => {
    const el = layerRef.current;
    return { width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 };
  };

  const setView = useCallback((next: ZoomView, settle = true) => {
    viewRef.current = next;
    setViewState(next);
    if (!settle) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => callbacks.current.onSettle(viewRef.current.scale), SETTLE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  useImperativeHandle(ref, () => ({ reset: () => setView(FIT) }), [setView]);

  const local = (e: { clientX: number; clientY: number }): Point => {
    const rect = layerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const zoomTo = useCallback(
    (scale: number, anchor?: Point) => {
      const s = size();
      const at = anchor ?? { x: s.width / 2, y: s.height / 2 };
      setView(zoomAbout(viewRef.current, { scale, anchorX: at.x, anchorY: at.y, size: s }));
    },
    [setView],
  );

  // Ctrl or Cmd with the wheel zooms on a desktop. It needs a non-passive listener to stop the page zoom.
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomTo(viewRef.current.scale * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, local(e));
    try {
      layerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      last.current = { dist: pinchDistance(a, b), center: pinchCenter(a, b) };
      downAt.current = null;
    } else if (pointers.current.size === 1) {
      downAt.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const known = pointers.current.get(e.pointerId);
    if (!known) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    const origin = downAt.current;
    if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > TAP_SLOP) downAt.current = null;

    if (pointers.current.size >= 2 && last.current) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      const dist = pinchDistance(a, b);
      const center = pinchCenter(a, b);
      if (last.current.dist > 0) {
        const s = size();
        const zoomed = zoomAbout(viewRef.current, { scale: viewRef.current.scale * (dist / last.current.dist), anchorX: center.x, anchorY: center.y, size: s });
        setView(clampPan({ ...zoomed, x: zoomed.x + (center.x - last.current.center.x), y: zoomed.y + (center.y - last.current.center.y) }, s));
      }
      last.current = { dist, center };
      return;
    }
    // One finger or the mouse: pan, but only when zoomed in and not playing a game.
    if (pointers.current.size === 1 && viewRef.current.scale > MIN_ZOOM && !callbacks.current.isGame()) {
      const v = viewRef.current;
      setView(clampPan({ scale: v.scale, x: v.x + (now.x - known.x), y: v.y + (now.y - known.y) }, size()));
    }
  };

  const release = (e: ReactPointerEvent, cancelled: boolean) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    try {
      layerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (pointers.current.size < 2) last.current = null;
    const origin = downAt.current;
    downAt.current = null;
    if (cancelled || !origin || pointers.current.size > 0) return;
    // A quick second tap in the same spot goes back to the whole picture.
    const now = performance.now();
    const previous = tap.current;
    if (now - previous.at < DOUBLE_TAP_MS && Math.hypot(e.clientX - previous.x, e.clientY - previous.y) < 40) {
      tap.current = { at: 0, x: 0, y: 0, moved: false };
      if (viewRef.current.scale > MIN_ZOOM) setView(FIT);
      return;
    }
    tap.current = { at: now, x: e.clientX, y: e.clientY, moved: false };
  };

  const zoomed = view.scale > MIN_ZOOM;
  return (
    <>
      <div
        ref={layerRef}
        className="stage-gesture"
        style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
      >
        <div className="stage-view" data-scale={view.scale.toFixed(3)} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          {children}
        </div>
      </div>
      <div className="zoom-control" role="group" aria-label="Zoom the drawing">
        <button type="button" className="zoom-btn" aria-label="Zoom in" onClick={() => zoomTo(clampZoom(viewRef.current.scale * STEP))} disabled={view.scale >= MAX_ZOOM}>
          +
        </button>
        <button type="button" className="zoom-btn" aria-label="Zoom out" onClick={() => zoomTo(clampZoom(viewRef.current.scale / STEP))} disabled={!zoomed}>
          &minus;
        </button>
        <button type="button" className="zoom-btn zoom-fit" aria-label="Fit the whole drawing" onClick={() => setView(FIT)} disabled={!zoomed}>
          Fit
        </button>
      </div>
    </>
  );
});
