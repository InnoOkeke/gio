/** Pinch and pan maths for the stage. The view is drawn as translate(x, y) scale(scale) with origin 0 0. */
export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Keeps the zoomed stage covering its frame, so it never slides away from the edges. */
export function clampPan(view: ZoomView, size: Size): ZoomView {
  const scale = clampZoom(view.scale);
  const minX = size.width * (1 - scale);
  const minY = size.height * (1 - scale);
  return { scale, x: Math.min(0, Math.max(minX, view.x)), y: Math.min(0, Math.max(minY, view.y)) };
}

/** Zooms to a new scale so the content point under (anchorX, anchorY) stays under the fingers. */
export function zoomAbout(view: ZoomView, change: { scale: number; anchorX: number; anchorY: number; size: Size }): ZoomView {
  const next = clampZoom(change.scale);
  const contentX = (change.anchorX - view.x) / view.scale;
  const contentY = (change.anchorY - view.y) / view.scale;
  return clampPan({ scale: next, x: change.anchorX - contentX * next, y: change.anchorY - contentY * next }, change.size);
}

export const MAX_RENDER_RATIO = 4;
export const MAX_CANVAS_PIXELS = 4096;

/**
 * Backing-store pixels per CSS pixel for the drawing canvas: the device ratio (at most 3) times the
 * zoom, never above 4, and never so big the canvas passes 4096 pixels a side.
 */
export function renderRatio(dpr: number, scale: number, cssSize: number): number {
  const base = Math.min(Number.isFinite(dpr) && dpr > 0 ? dpr : 1, 3);
  const wanted = Math.min(base * clampZoom(scale), MAX_RENDER_RATIO);
  if (cssSize <= 0) return wanted;
  return Math.min(wanted, MAX_CANVAS_PIXELS / cssSize);
}

export function pinchDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pinchCenter(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
