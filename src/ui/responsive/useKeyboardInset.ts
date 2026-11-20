import { useEffect } from 'react';
import { isKeyboardOpen, keyboardInset, nextBaseline } from './keyboard-inset';

/**
 * Writes --kb (keyboard height, px) and --vvh (visible height, px) on <html> plus
 * data-keyboard='open'|'closed'. Does nothing where visualViewport is missing.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const root = document.documentElement;
    let frame = 0;
    let baseline: { width: number; height: number } | null = null;
    const apply = () => {
      frame = 0;
      const layoutHeight = window.innerHeight;
      const inset = keyboardInset({ layoutHeight, visualHeight: vv.height, visualOffsetTop: vv.offsetTop });
      // --kb is only the overlay part (iOS). On Android the layout viewport shrinks, so the baseline tells.
      baseline = nextBaseline(baseline, window.innerWidth, layoutHeight);
      const total = keyboardInset({ layoutHeight: baseline.height, visualHeight: vv.height, visualOffsetTop: vv.offsetTop });
      root.style.setProperty('--kb', `${inset}px`);
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      root.dataset['keyboard'] = isKeyboardOpen(total, baseline.height) ? 'open' : 'closed';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    apply();
    return () => {
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
