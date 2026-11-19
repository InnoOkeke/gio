import { skillCheckOutcome, type SkillChallenge } from './skill';

/**
 * A skill check in progress: which stage it opens, the challenges, and which one the child is on.
 * Pure data and rules, no React and no storage. Nothing here is saved: leaving ends the check.
 */
export interface SkillRun {
  targetKey: string;
  plan: readonly SkillChallenge[];
  /** The challenge the child is on. */
  index: number;
  results: { questId: string; helped: boolean }[];
}

/** What happens after a challenge is solved: more challenges wait, or the check is over. */
export type SkillStep =
  | { kind: 'next'; run: SkillRun }
  /** `passed` is true only when every challenge was solved with no help at all. */
  | { kind: 'end'; passed: boolean; targetKey: string };

/** Begin a check, or null when there is nothing to check. */
export function startSkillRun(targetKey: string, plan: readonly SkillChallenge[]): SkillRun | null {
  return plan.length === 0 ? null : { targetKey, plan, index: 0, results: [] };
}

/** The challenge the child is on. */
export function currentChallenge(run: SkillRun): SkillChallenge | undefined {
  return run.plan[run.index];
}

/**
 * Judge a solved challenge. Any help (hint, Explain, tutor) on it, or on an earlier one, ends the check as not passed.
 * A solved challenge that is not the current one counts for nothing.
 */
export function solveChallenge(run: SkillRun, questId: string, helped: boolean): SkillStep {
  if (currentChallenge(run)?.questId !== questId) return { kind: 'next', run };
  const results = [...run.results.filter((r) => r.questId !== questId), { questId, helped }];
  const outcome = skillCheckOutcome(run.plan, results);
  if (outcome === 'pass') return { kind: 'end', passed: true, targetKey: run.targetKey };
  if (outcome === 'helped') return { kind: 'end', passed: false, targetKey: run.targetKey };
  return { kind: 'next', run: { ...run, results } };
}

/** Move to the next challenge, or null when the child is on the last one. */
export function advanceRun(run: SkillRun): SkillRun | null {
  return run.index + 1 < run.plan.length ? { ...run, index: run.index + 1 } : null;
}
