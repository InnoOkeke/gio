import { useEffect, useRef, type RefObject } from 'react';
import { dragOffset, dragVelocity, DRAG_SLOP, shouldDismiss, type PointerSample } from './sheet-drag';
/** The parts of a sheet a finger can grab: the handle and the header. */
const GRAB = '[data-sheet-grab], [data-sheet-header], .bottom-sheet-head, .bottom-sheet-grip';
const OUT_MS = 180;
/**
 * Swipe down on the handle or header of a bottom sheet to close it. The panel follows the finger with
 * transform only and either flies off (past 96 px or a fast fling) or springs back. Only runs on
 * compact widths, where the panel is anchored to the bottom. Call onClose after the panel has left.
 */
export function useSheetDrag(panel: RefObject<HTMLElement>, onClose: () => void, enabled = true): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = panel.current;
    if (!el || !enabled) return;
    let startY = 0;
    let id = -1;
    let dragging = false;
    let samples: PointerSample[] = [];
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = () => document.documentElement.dataset['width'] === 'compact';
    const reset = () => {
      id = -1;
      dragging = false;
      samples = [];
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0 || !compact()) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest(GRAB) || target.closest('input, textarea, select')) return;
      startY = e.clientY;
      id = e.pointerId;
      samples = [{ y: e.clientY, t: e.timeStamp }];
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < DRAG_SLOP) return;
        dragging = true;
        el.style.transition = 'none';
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* the pointer may already be gone */
        }
      }
      samples.push({ y: e.clientY, t: e.timeStamp });
      if (samples.length > 12) samples.shift();
      el.style.transform = `translateY(${dragOffset(dy)}px)`;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const wasDragging = dragging;
      const offset = dragOffset(e.clientY - startY);
      const velocity = dragVelocity(samples);
      reset();
      if (!wasDragging) return;
      // The drag must not turn into a click on whatever button was under the finger.
      const swallow = (ev: Event) => ev.stopPropagation();
      el.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => el.removeEventListener('click', swallow, true), 0);
      if (shouldDismiss({ offset, velocity, height: el.offsetHeight })) {
        if (reduced()) {
          close.current();
          return;
        }
        el.style.transition = `transform ${OUT_MS}ms ease-in`;
        el.style.transform = 'translateY(100%)';
        window.setTimeout(() => close.current(), OUT_MS);
      } else {
        el.style.transition = reduced() ? 'none' : 'transform 200ms ease-out';
        el.style.transform = '';
      }
    };
    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const was = dragging;
      reset();
      if (was) {
        el.style.transition = 'transform 200ms ease-out';
        el.style.transform = '';
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      el.style.transform = '';
      el.style.transition = '';
    };
  }, [panel, enabled]);
}
