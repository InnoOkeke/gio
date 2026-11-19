import { describe, it, expect } from 'vitest';
import { applyEvent, emptyRewards } from '../src/ui/gio/rewards';
import { createHelpTracker } from '../src/ui/path/help';
import { islandByKey, islandsFor, stageNumber } from '../src/ui/path/islands';
import { passSkillCheck, skillCheckPlan } from '../src/ui/path/skill';
import { advanceRun, currentChallenge, solveChallenge, startSkillRun } from '../src/ui/path/skillRun';
import { emptyPath, islandState, masterReady, nextStop, recordQuest, type PathState } from '../src/ui/path/state';

const TODAY = '2026-03-02';

/** Play the whole skill check the way the Studio does: solve each challenge, asking the help tracker for `helped`. */
function playCheck(state: PathState, key: string, helpOn: (index: number) => 'none' | 'hint' | 'tutor') {
  const run = startSkillRun(key, skillCheckPlan(state, [], key));
  if (!run) throw new Error('no plan');
  let current = run;
  for (let index = 0; ; index++) {
    const help = createHelpTracker();
    const use = helpOn(index);
    if (use === 'hint') help.note('hint');
    if (use === 'tutor') help.note('tutor');
    const step = solveChallenge(current, currentChallenge(current)!.questId, help.used());
    if (step.kind === 'end') return step;
    current = advanceRun(step.run) ?? step.run;
  }
}

describe('a skill check run', () => {
  it('starts only when there is something to check', () => {
    expect(startSkillRun('coder:moves', [])).toBeNull();
    const run = startSkillRun('coder:recursion', skillCheckPlan(emptyPath(), [], 'coder:recursion'));
    expect(run).toMatchObject({ targetKey: 'coder:recursion', index: 0, results: [] });
    expect(run!.plan).toHaveLength(4);
  });

  it('moves through the challenges in order and passes when every one is solved without help', () => {
    const state = emptyPath();
    const run = startSkillRun('coder:recursion', skillCheckPlan(state, [], 'coder:recursion'))!;
    const first = solveChallenge(run, currentChallenge(run)!.questId, false);
    expect(first.kind).toBe('next');
    expect(playCheck(state, 'coder:recursion', () => 'none')).toEqual({ kind: 'end', passed: true, targetKey: 'coder:recursion' });
  });

  it('is not passed once a hint is used, and ends as soon as that challenge is solved', () => {
    expect(playCheck(emptyPath(), 'coder:recursion', (i) => (i === 1 ? 'hint' : 'none'))).toEqual({ kind: 'end', passed: false, targetKey: 'coder:recursion' });
  });

  it('is not passed when the tutor gave help, because help.note("tutor") counts as help', () => {
    expect(playCheck(emptyPath(), 'coder:recursion', (i) => (i === 0 ? 'tutor' : 'none'))).toEqual({ kind: 'end', passed: false, targetKey: 'coder:recursion' });
    expect(playCheck(emptyPath(), 'little:pictures', (i) => (i === 2 ? 'tutor' : 'none')).passed).toBe(false);
  });

  it('ignores a quest that is not the current challenge', () => {
    const run = startSkillRun('coder:loops', skillCheckPlan(emptyPath(), [], 'coder:loops'))!;
    expect(solveChallenge(run, 'c-repeat', false)).toEqual({ kind: 'next', run });
  });

  it('has no next challenge after the last one', () => {
    const run = startSkillRun('coder:loops', skillCheckPlan(emptyPath(), [], 'coder:loops'))!;
    expect(run.plan).toHaveLength(1);
    expect(advanceRun(run)).toBeNull();
  });

  it('works for little turtles too', () => {
    expect(playCheck(emptyPath(), 'little:pictures', () => 'none').passed).toBe(true);
  });
});

describe('after a skill check', () => {
  it('a pass opens the stage and tests out the earlier ones without recording any star, clear or review', () => {
    const before = emptyPath();
    const end = playCheck(before, 'coder:recursion', () => 'none');
    expect(end.kind === 'end' && end.passed).toBe(true);
    const done = passSkillCheck(before, 'coder:recursion', TODAY);
    const earlier = islandsFor('coder').slice(0, islandsFor('coder').findIndex((i) => i.key === 'coder:recursion'));
    expect(Object.keys(done.state.tested).sort()).toEqual(earlier.map((i) => i.key).sort());
    expect(done.state.quests).toEqual(before.quests);
    expect(done.state.reviews).toEqual(before.reviews);
    expect(done.state.sailed).toEqual(before.sailed);
    expect(islandState(done.state, [], 'coder:recursion').status).toBe('open');
    const stop = nextStop(done.state, [], 'coder', TODAY);
    expect(stop.kind === 'quest' && stop.islandKey).toBe('coder:recursion');
  });

  it('a failed check changes nothing, because nothing is saved until it passes', () => {
    const before = emptyPath();
    const end = playCheck(before, 'coder:recursion', () => 'hint');
    expect(end.kind === 'end' && end.passed).toBe(false);
    expect(islandState(before, [], 'coder:recursion').status).toBe('locked');
    expect(Object.keys(before.tested)).toHaveLength(0);
  });
});

describe('Logo Master', () => {
  it.each(['coder', 'little'] as const)('sailing the last %s stage when every other stage is sailed or tested out earns it, once', (audience) => {
    const stages = islandsFor(audience);
    const last = stages[stages.length - 1]!;
    // Everything before the last stage is sailed except the first, which is tested out.
    let state: PathState = {
      ...emptyPath(),
      sailed: Object.fromEntries(stages.slice(1, -1).map((i) => [i.key, TODAY])),
      tested: { [stages[0]!.key]: TODAY },
    };
    let cleared: string[] = [];
    let earned = 0;
    for (const id of last.units.flat()) {
      const done = recordQuest(state, cleared, id, false, TODAY);
      state = done.state;
      cleared = done.cleared;
      if (done.events.masterEarned) earned++;
    }
    expect(islandState(state, cleared, last.key).sailed).toBe(true);
    expect(earned).toBe(1);
    expect(masterReady(state, audience)).toBe(true);
    expect(state.master[audience]).toBe(TODAY);
    expect(stageNumber(last)).toBe(stages.length);
  });

  it('the final stage cannot be tested out, so skipping to it never makes a Logo Master', () => {
    const last = islandsFor('coder').at(-1)!;
    const done = passSkillCheck(emptyPath(), last.key, TODAY);
    expect(done.tested).not.toContain(last.key);
    expect(done.masterEarned).toBe(false);
    expect(masterReady(done.state, 'coder')).toBe(false);
    expect(islandByKey(last.key)).toBeDefined();
  });

  it('the logo-master event gives Gio the golden shell, keeps it, and leaves the shell slots alone', () => {
    const before = emptyRewards();
    expect(before.goldenShell).toBe(false);
    const after = applyEvent(before, { kind: 'logo-master' }, TODAY).state;
    expect(after.goldenShell).toBe(true);
    expect(after.shell).toEqual(before.shell);
    expect(applyEvent(after, { kind: 'run-ok', features: [], colours: 0, drewLines: true }, TODAY).state.goldenShell).toBe(true);
  });
});
