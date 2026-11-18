import { ALL_ISLANDS, islandsFor, type Island } from './islands';
import { islandState, masterReady, recordMaster, type PathState } from './state';

/**
 * Skill checks let a confident child or grown-up skip ahead. Pure rules, no React and no storage.
 *
 * To open a locked stage, the child solves the last quest ("own") of a few of the stages being skipped,
 * with no help at all. Passing marks those stages as tested out. No stars, clears or badges come from it.
 */

export interface SkillChallenge {
  /** The stage being skipped. */
  stageKey: string;
  /** The quest to solve for that stage. */
  questId: string;
}

/** How many challenges a skill check has, by the stage number of the target and the mode. */
export function challengeCount(audience: Island['audience'], targetStage: number): number {
  if (audience === 'coder') return targetStage <= 8 ? 3 : targetStage <= 14 ? 4 : 5;
  return targetStage <= 6 ? 2 : 3;
}

/** The stages before the target that are neither sailed nor tested out, in order. */
function skippable(state: PathState, target: Island): Island[] {
  const all = islandsFor(target.audience);
  const at = all.findIndex((i) => i.key === target.key);
  return all.slice(0, Math.max(at, 0)).filter((i) => state.sailed[i.key] === undefined && state.tested[i.key] === undefined);
}

/** The "own" quest of a stage: the last quest of its last unit. */
function ownQuest(island: Island): string {
  return island.units[island.units.length - 1]![2];
}

/**
 * The challenges for opening a stage, or an empty list when it cannot be skipped to. They are spread evenly over
 * the stages being skipped and always include the stage right before the target. The same state gives the same plan.
 */
export function skillCheckPlan(state: PathState, cleared: readonly string[], key: string): SkillChallenge[] {
  const target = ALL_ISLANDS.find((i) => i.key === key);
  if (!target || !skillCheckEligible(state, cleared, key)) return [];
  const stages = skippable(state, target);
  const stageNo = islandsFor(target.audience).findIndex((i) => i.key === key) + 1;
  const count = Math.min(challengeCount(target.audience, stageNo), stages.length);
  const picked: Island[] = [];
  for (let j = 0; j < count; j++) picked.push(stages[Math.round(((j + 1) * stages.length) / count) - 1]!);
  return picked.map((i) => ({ stageKey: i.key, questId: ownQuest(i) }));
}

/** True when the stage is locked, is not the first, and there is at least one stage before it that can be skipped. */
export function skillCheckEligible(state: PathState, cleared: readonly string[], key: string): boolean {
  const target = ALL_ISLANDS.find((i) => i.key === key);
  if (!target) return false;
  const all = islandsFor(target.audience);
  if (all.findIndex((i) => i.key === key) < 1) return false;
  if (islandState(state, cleared, key).status === 'open') return false;
  return skippable(state, target).length > 0;
}

export type SkillOutcome =
  /** Every challenge solved without help: the check is passed. */
  | 'pass'
  /** Help was used on at least one challenge, so the check cannot be passed this time. */
  | 'helped'
  /** Some challenges are not solved yet. */
  | 'incomplete';

/** Judge a skill check. Any help at all, from the hint button, Explain or the tutor, means it is not passed. */
export function skillCheckOutcome(plan: readonly SkillChallenge[], results: readonly { questId: string; helped: boolean }[]): SkillOutcome {
  if (plan.length === 0) return 'incomplete';
  if (results.some((r) => r.helped)) return 'helped';
  return plan.every((c) => results.some((r) => r.questId === c.questId)) ? 'pass' : 'incomplete';
}

export interface SkillPass {
  state: PathState;
  /** The stages marked as tested out by this pass. */
  tested: string[];
  masterEarned: boolean;
}

/**
 * Open a stage after a passed skill check: every earlier stage that is not sailed or tested out is marked tested out.
 * The final stage is never tested out, and the target itself is not marked. Does nothing for the first stage.
 */
export function passSkillCheck(state: PathState, key: string, today: string): SkillPass {
  const target = ALL_ISLANDS.find((i) => i.key === key);
  if (!target) return { state, tested: [], masterEarned: false };
  const all = islandsFor(target.audience);
  const last = all[all.length - 1];
  const tested = skippable(state, target)
    .filter((i) => i.key !== last?.key)
    .map((i) => i.key);
  if (tested.length === 0) return { state, tested: [], masterEarned: false };
  let next: PathState = { ...state, tested: { ...state.tested, ...Object.fromEntries(tested.map((k) => [k, today])) } };
  const masterEarned = next.master[target.audience] === undefined && masterReady(next, target.audience);
  if (masterEarned) next = recordMaster(next, target.audience, today);
  return { state: next, tested, masterEarned };
}
