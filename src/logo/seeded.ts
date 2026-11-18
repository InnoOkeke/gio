/** A small, fast pseudo-random generator. The same seed always gives the same numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seeds quests are checked with. Fixed so a check gives the same answer every time. */
export const CHECK_SEEDS: readonly number[] = [7, 19, 42, 77, 101];
