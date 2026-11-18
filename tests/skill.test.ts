import { describe, it, expect } from 'vitest';
import { createHelpTracker } from '../src/ui/path/help';
import { islandByKey, islandsFor } from '../src/ui/path/islands';
import { challengeCount, passSkillCheck, skillCheckEligible, skillCheckOutcome, skillCheckPlan } from '../src/ui/path/skill';
import { emptyPath, islandState, masterReady, nextStop, recordQuest, type PathState } from '../src/ui/path/state';

const TODAY = '2026-03-02';
const coder = islandsFor('coder');
const own = (key: string): string => islandByKey(key)!.units[1]![2];

function sailed(state: PathState, keys: string[]): PathState {
  return { ...state, sailed: { ...state.sailed, ...Object.fromEntries(keys.map((k) => [k, TODAY])) } };
}

describe('skill check challenge counts', () => {
  it('uses 3, 4 or 5 challenges for coders and 2 or 3 for little turtles, by the stage being opened', () => {
    expect([1, 8, 9, 14, 15, 20].map((n) => challengeCount('coder', n))).toEqual([3, 3, 4, 4, 5, 5]);
    expect([1, 6, 7, 10].map((n) => challengeCount('little', n))).toEqual([2, 2, 3, 3]);
  });
});

describe('skill check eligibility', () => {
  it('is never offered for the first stage or for a stage that is already open', () => {
    const state = emptyPath();
    expect(skillCheckEligible(state, [], 'coder:moves')).toBe(false);
    expect(skillCheckEligible(state, [], 'coder:loops')).toBe(true);
    expect(skillCheckEligible(sailed(state, ['coder:moves']), [], 'coder:loops')).toBe(false);
    expect(skillCheckEligible(state, ['c-repeat'], 'coder:loops')).toBe(false);
    expect(skillCheckEligible(state, [], 'nope')).toBe(false);
  });

  it('is not offered when every earlier stage is already sailed or tested out', () => {
    const state: PathState = { ...emptyPath(), sailed: { 'coder:moves': TODAY }, tested: { 'coder:loops': TODAY } };
    expect(skillCheckEligible(state, [], 'coder:debugging')).toBe(false);
  });
});

describe('skill check plan', () => {
  it('picks the own quest of stages spread over the skipped ones, including the stage right before the target', () => {
    const plan = skillCheckPlan(emptyPath(), [], 'coder:recursion');
    expect(plan).toHaveLength(3);
    expect(plan.map((c) => c.stageKey)).toEqual(['coder:loops', 'coder:variables', 'coder:events']);
    expect(plan.map((c) => c.questId)).toEqual(plan.map((c) => own(c.stageKey)));
    expect(plan[plan.length - 1]!.stageKey).toBe('coder:events');
  });

  it('only counts stages that are not sailed or tested out, and never offers more challenges than stages', () => {
    const state: PathState = { ...emptyPath(), sailed: { 'coder:moves': TODAY }, tested: { 'coder:loops': TODAY, 'coder:debugging': TODAY } };
    expect(skillCheckPlan(state, [], 'coder:variables').map((c) => c.stageKey)).toEqual(['coder:functions']);
    expect(skillCheckPlan(emptyPath(), [], 'coder:loops').map((c) => c.stageKey)).toEqual(['coder:moves']);
  });

  it('is the same every time and empty when there is nothing to skip to', () => {
    const state = emptyPath();
    expect(skillCheckPlan(state, [], 'coder:recursion')).toEqual(skillCheckPlan(state, [], 'coder:recursion'));
    expect(skillCheckPlan(state, [], 'coder:moves')).toEqual([]);
    expect(skillCheckPlan(state, [], 'unknown')).toEqual([]);
  });

  it('works for little turtles', () => {
    const plan = skillCheckPlan(emptyPath(), [], 'little:colours');
    expect(plan.map((c) => c.stageKey)).toEqual(['little:moves', 'little:loops']);
  });
});

describe('skill check outcome', () => {
  const plan = skillCheckPlan(emptyPath(), [], 'coder:recursion');
  const clean = plan.map((c) => ({ questId: c.questId, helped: false }));

  it('passes only when every challenge is solved without help', () => {
    expect(skillCheckOutcome(plan, clean)).toBe('pass');
    expect(skillCheckOutcome(plan, clean.slice(1))).toBe('incomplete');
    expect(skillCheckOutcome([], [])).toBe('incomplete');
  });

  it('cannot be passed once any help is used, including the tutor', () => {
    const help = createHelpTracker();
    help.note('tutor');
    expect(help.used()).toBe(true);
    const withTutor = clean.map((r, i) => (i === 1 ? { ...r, helped: help.used() } : r));
    expect(skillCheckOutcome(plan, withTutor)).toBe('helped');
    for (const source of ['hint', 'explain'] as const) {
      const h = createHelpTracker();
      h.note(source);
      expect(skillCheckOutcome(plan, [{ ...clean[0]!, helped: h.used() }, ...clean.slice(1)])).toBe('helped');
    }
    const fresh = createHelpTracker();
    expect(skillCheckOutcome(plan, clean.map((r) => ({ ...r, helped: fresh.used() })))).toBe('pass');
  });
});

describe('passing a skill check', () => {
  it('tests out every earlier stage that is not sailed, opens the target and sends the child there', () => {
    const state = sailed(emptyPath(), ['coder:moves']);
    const done = passSkillCheck(state, 'coder:recursion', TODAY);
    const expected = coder.slice(1, -1).map((i) => i.key);
    expect(done.tested).toEqual(expected);
    expect(Object.keys(done.state.tested)).toEqual(expected);
    expect(done.state.tested['coder:moves']).toBeUndefined();
    expect(islandState(done.state, [], 'coder:recursion').status).toBe('open');
    expect(islandState(done.state, [], 'coder:recursion').tested).toBe(false);
    expect(nextStop(done.state, [], 'coder', TODAY)).toMatchObject({ kind: 'quest', islandKey: 'coder:recursion', questId: 'c-rec-stairs' });
  });

  it('gives no stars, clears or reviews, and does not touch the target', () => {
    const done = passSkillCheck(emptyPath(), 'coder:functions', TODAY);
    expect(done.state.quests).toEqual({});
    expect(done.state.sailed).toEqual({});
    expect(done.state.reviews).toEqual({});
    expect(done.state.tested['coder:functions']).toBeUndefined();
    expect(done.masterEarned).toBe(false);
  });

  it('does nothing for the first stage, an unknown stage or a stage with nothing before it to test', () => {
    const state = emptyPath();
    expect(passSkillCheck(state, 'coder:moves', TODAY)).toEqual({ state, tested: [], masterEarned: false });
    expect(passSkillCheck(state, 'nope', TODAY)).toEqual({ state, tested: [], masterEarned: false });
  });

  it('leaves tested stages playable: solving one gives stars and can sail it', () => {
    const done = passSkillCheck(emptyPath(), 'coder:functions', TODAY);
    const r = recordQuest(done.state, [], 'c-line', false, TODAY);
    expect(r.state.quests['c-line']).toEqual({ s: 'clean', d: TODAY });
    expect(r.state.tested['coder:moves']).toBe(TODAY);
  });

  it('makes a child Logo Master when the last stage was already sailed and the rest are tested out now', () => {
    const last = coder[coder.length - 1]!.key;
    const state = sailed(emptyPath(), [last]);
    const done = passSkillCheck(state, last, TODAY);
    expect(done.tested).toEqual(coder.slice(0, -1).map((i) => i.key));
    expect(done.masterEarned).toBe(true);
    expect(done.state.master.coder).toBe(TODAY);
    expect(masterReady(done.state, 'coder')).toBe(true);
    expect(passSkillCheck(done.state, last, '2026-04-01').state.master.coder).toBe(TODAY);
  });
});
