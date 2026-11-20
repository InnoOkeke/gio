export type HapticKind = 'snap' | 'win' | 'tap';

export const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  snap: 12,
  win: [20, 40, 20, 40, 80],
  tap: 8,
};

export interface HapticEnv {
  vibrate?: (pattern: number | number[]) => boolean;
  reducedMotion: boolean;
}

function browserEnv(): HapticEnv {
  if (typeof navigator === 'undefined') return { reducedMotion: true };
  // Browsers refuse to vibrate before the first tap and log an error, so wait for one.
  const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
  const vibrate = typeof navigator.vibrate === 'function' && active ? navigator.vibrate.bind(navigator) : undefined;
  const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { vibrate, reducedMotion };
}

/** A tiny buzz where the device supports it. Silent on iOS (no vibrate) and when reduced motion is on. */
export function haptic(kind: HapticKind, env: HapticEnv = browserEnv()): boolean {
  if (env.reducedMotion || !env.vibrate) return false;
  try {
    return env.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    return false;
  }
}
