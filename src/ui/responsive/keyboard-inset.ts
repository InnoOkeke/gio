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
