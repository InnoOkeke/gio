/**
 * Window size classes, after Material 3 and Apple size classes, measured on the app's own
 * viewport width (not the device) so Split View, Stage Manager and foldables behave.
 *   compact < 600   phone portrait, narrow Split View
 *   medium 600-839  small tablet portrait, large phone landscape
 *   expanded 840-1199  tablet landscape, desktop window
 *   large >= 1200
 */
export type WidthClass = 'compact' | 'medium' | 'expanded' | 'large';
/** 'split' = code left, big stage right. 'stack' = stage on top, code below. */
export type LayoutMode = 'split' | 'stack';

export const WIDTH_BREAKPOINTS = { medium: 600, expanded: 840, large: 1200 } as const;

/** Heights at or under this are treated as a phone held sideways (Material 3 compact height). */
export const SHORT_HEIGHT = 500;

export function classifyWidth(width: number): WidthClass {
  if (width >= WIDTH_BREAKPOINTS.large) return 'large';
  if (width >= WIDTH_BREAKPOINTS.expanded) return 'expanded';
  if (width >= WIDTH_BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

/** A phone held sideways: wide enough for two panes but very short. */
export function isShortLandscape(width: number, height: number): boolean {
  return width >= WIDTH_BREAKPOINTS.medium && height <= SHORT_HEIGHT;
}

export function layoutFor(width: number, height: number): LayoutMode {
  if (width >= WIDTH_BREAKPOINTS.expanded && width > height) return 'split';
  if (isShortLandscape(width, height)) return 'split';
  return 'stack';
}

export interface PerfHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
}

/** Older or constrained devices get a lighter look (no blur, softer shadows). */
export function isLitePerf(hints: PerfHints): boolean {
  if (hints.saveData === true) return true;
  if (typeof hints.hardwareConcurrency === 'number' && hints.hardwareConcurrency <= 4) return true;
  if (typeof hints.deviceMemory === 'number' && hints.deviceMemory <= 2) return true;
  return false;
}
