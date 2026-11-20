export interface ViewportMetrics {
  /** window.innerHeight (the layout viewport) */
  layoutHeight: number;
  /** visualViewport.height */
  visualHeight: number;
  /** visualViewport.offsetTop */
  visualOffsetTop: number;
}

/** How many pixels at the bottom of the layout viewport the on-screen keyboard covers. */
export function keyboardInset({ layoutHeight, visualHeight, visualOffsetTop }: ViewportMetrics): number {
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualOffsetTop));
}

export function isKeyboardOpen(inset: number, layoutHeight: number): boolean {
  return inset > 120 && inset > layoutHeight * 0.15;
}

/**
 * The tallest layout height seen at this width. Android Chrome (resizes-content) shrinks the layout
 * viewport when the keyboard opens, so the inset alone reads 0; comparing with the baseline still
 * tells that the keyboard is up. A new width (rotation, Split View) starts a new baseline.
 */
export function nextBaseline(prev: { width: number; height: number } | null, width: number, height: number): { width: number; height: number } {
  if (!prev || prev.width !== width) return { width, height };
  return { width, height: Math.max(prev.height, height) };
}
