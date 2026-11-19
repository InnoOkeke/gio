/**
 * What the difficulty tests and `npm run report:stages` share: the helper maths, the adjacent-stage tolerance
 * and the named exemptions. A stage listed here is skipped by the adjacent-stage test (its neighbours are then
 * compared with each other) and is shown with its reason in docs/STAGES.md. Nothing else is skipped.
 */
export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Spearman rank correlation, with tied values sharing the average of their ranks. */
export function spearman(xs: number[], ys: number[]): number {
  const ranks = (values: number[]): number[] => {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const out = new Array<number>(values.length).fill(0);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[order[k]![1]] = avg;
      i = j + 1;
    }
    return out;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

/** A stage may be at most this much easier than the stage before it (its mean is at least this share of the previous mean). */
export const ADJACENT_TOLERANCE = 0.8;

/** Stages that the adjacent-stage test skips, with the reason. The capstone test has no exemption. */
export const ADJACENT_EXEMPT: Record<string, string> = {
  'coder:debugging':
    'Bug Burrow is made only of the six original quests, whose ids, goals and checks cannot change because saved progress points at them. Each one is fixing a single wrong number or word in a program of two to three statements, so its code is small by design and the difficulty is finding the bug.',
  'coder:tiny': 'Tiny Code Temple is about writing the fewest commands. Its code is the smallest in the game on purpose, and its difficulty is shown by the longer answers that must fail (tests/stages.test.ts).',
  'little:fewest': 'Block Saver is about drawing the same picture with fewer blocks. Its code is short on purpose, and its difficulty is shown by the wasteful answers that must fail (tests/little.test.ts).',
};
