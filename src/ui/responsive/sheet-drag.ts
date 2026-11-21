/** Pure rules for swiping a bottom sheet down to close it. The DOM glue lives in useSheetDrag. */
/** A drag past this many pixels closes the sheet. */
export const DISMISS_DISTANCE = 96;
/** A quick flick (pixels per millisecond) closes the sheet once it has moved at least FLING_MIN_OFFSET. */
export const FLING_VELOCITY = 0.6;
export const FLING_MIN_OFFSET = 24;
/** Movement under this is a tap, not a drag. */
export const DRAG_SLOP = 6;
export interface PointerSample {
  y: number;
  t: number;
}
/** How far the panel follows the finger: down only, never above its resting place. */
export function dragOffset(dy: number): number {
  return dy > 0 ? dy : 0;
}
/** Downward speed in px/ms over the last samples (about the last 100 ms). */
export function dragVelocity(samples: readonly PointerSample[], windowMs = 100): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1]!;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i]!.t > windowMs) break;
    first = samples[i]!;
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}
export interface DismissInput {
  offset: number;
  /** Downward speed in px/ms. */
  velocity: number;
  /** The panel's height in pixels. */
  height: number;
}
export function shouldDismiss({ offset, velocity, height }: DismissInput): boolean {
  if (offset >= DISMISS_DISTANCE) return true;
  if (height > 0 && offset >= height * 0.5) return true;
  return velocity >= FLING_VELOCITY && offset >= FLING_MIN_OFFSET;
}
