import type { Hint } from '../api';

export type HintStep = 1 | 2 | 3;

/** The hints a child has been given for one problem. A new problem (a new key) starts a new ladder. */
export interface HintLadder {
  key: string;
  hints: Partial<Record<HintStep, Hint>>;
}

/**
 * Which hint to ask for next: the first step for a new problem, then one step further each time.
 * Null when the last step is already stored, so the card just shows what it has and makes no request.
 */
export function nextLevel(ladder: HintLadder | null, key: string): HintStep | null {
  if (!ladder || ladder.key !== key) return 1;
  if (ladder.hints[3]) return null;
  if (ladder.hints[2]) return 3;
  if (ladder.hints[1]) return 2;
  return 1;
}

export function withHint(ladder: HintLadder | null, key: string, level: HintStep, hint: Hint): HintLadder {
  const base = ladder && ladder.key === key ? ladder.hints : {};
  return { key, hints: { ...base, [level]: hint } };
}

/** The highest step that has been fetched for this ladder, or null. */
export function highestStep(ladder: HintLadder | null): HintStep | null {
  if (!ladder) return null;
  return ladder.hints[3] ? 3 : ladder.hints[2] ? 2 : ladder.hints[1] ? 1 : null;
}
