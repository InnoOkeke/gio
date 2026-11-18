import { describe, it, expect } from 'vitest';
import { check, execute } from '../src/logo/index.js';
import { checkQuest, QUESTS, wordsUsed, features } from '../src/logo/quests.js';
import { CODER_A } from '../src/logo/stages/coder-a.js';
import { ALL_ISLANDS, islandByKey, islandsFor, stageNumber } from '../src/ui/path/islands';
import { emptyPath, islandState, nextStop, recordQuest, type PathState } from '../src/ui/path/state';
import { CODER_A_COUNTEREXAMPLES, CODER_A_SOLUTIONS } from './solutions/coder-a';

const STAGES: Record<number, { key: string; name: string; ids: string[] }> = {
  3: { key: 'coder:colour-cove', name: 'Colour Cove', ids: ['c-red-blue', 'c-four-colours', 'c-fat-lines', 'c-night-sky', 'c-rainbow-fan', 'c-colour-wheel'] },
  6: { key: 'coder:ingredients', name: 'Ingredient Island', ids: ['c-ing-square', 'c-ing-poly', 'c-ing-petals', 'c-ing-house', 'c-ing-grid', 'c-ing-stars'] },
  8: { key: 'coder:grid', name: 'Grid Garden', ids: ['c-grid-corners', 'c-grid-ruler', 'c-grid-diagonal', 'c-grid-lattice', 'c-grid-axes', 'c-grid-parabola'] },
  10: { key: 'coder:surprise', name: 'Surprise Springs', ids: ['c-rand-step', 'c-rand-wobble', 'c-rand-coin', 'c-rand-dice', 'c-rand-confetti', 'c-rand-maze'] },
  12: { key: 'coder:clockwork', name: 'Clockwork Canyon', ids: ['c-clock-walk', 'c-clock-spiral', 'c-clock-count', 'c-clock-timer', 'c-clock-score', 'c-clock-race'] },
  14: { key: 'coder:fractals', name: 'Fractal Falls', ids: ['c-frac-tree', 'c-frac-koch', 'c-frac-sierpinski', 'c-frac-snowflake', 'c-frac-general', 'c-frac-fern'] },
};

const stageOf = (id: string): number => Number(Object.entries(STAGES).find(([, s]) => s.ids.includes(id))![0]);

describe('coder content A: quests', () => {
  it('has 36 quests, all for Turtle Coders, in stage order', () => {
    expect(CODER_A).toHaveLength(36);
    expect(CODER_A.every((q) => q.audience === 'coder')).toBe(true);
    expect(CODER_A.map((q) => q.id)).toEqual(Object.values(STAGES).flatMap((s) => s.ids));
    expect(QUESTS.slice(-36).map((q) => q.id)).toEqual(CODER_A.map((q) => q.id));
  });

  it('has a reference solution for every quest and nothing else', () => {
    expect(Object.keys(CODER_A_SOLUTIONS).sort()).toEqual(CODER_A.map((q) => q.id).sort());
  });

  it.each(CODER_A.map((q) => [q.id, q] as const))('%s passes with its reference solution and fails with empty code', (_id, quest) => {
    expect(checkQuest(quest, CODER_A_SOLUTIONS[quest.id]!)).toMatchObject({ pass: true });
    expect(checkQuest(quest, '').pass).toBe(false);
  });

  it('gives the same answer every time it checks (seeded randomness)', () => {
    for (const q of CODER_A.filter((x) => x.needs?.props)) {
      const first = checkQuest(q, CODER_A_SOLUTIONS[q.id]!);
      for (let k = 0; k < 3; k++) expect(checkQuest(q, CODER_A_SOLUTIONS[q.id]!)).toEqual(first);
    }
  });

  it('writes the exact numbers: every goal has a digit, every hint is filled in', () => {
    for (const q of CODER_A) {
      expect(q.goal, q.id).toMatch(/\d/);
      expect(q.hint.length, q.id).toBeGreaterThan(10);
      expect(q.title.length, q.id).toBeGreaterThan(2);
    }
  });
});

describe('coder content A: no quest passes by cheating', () => {
  const needsCounter = CODER_A.filter((q) => q.needs?.calls || q.needs?.props || q.needs?.expect || q.needs?.trace || q.needs?.words);

  it('every hidden-call, random, scoreboard and game quest has at least one counterexample', () => {
    for (const q of needsCounter) expect(CODER_A_COUNTEREXAMPLES[q.id]?.length ?? 0, q.id).toBeGreaterThan(0);
    expect(Object.keys(CODER_A_COUNTEREXAMPLES).every((id) => CODER_A.some((q) => q.id === id))).toBe(true);
  });

  const cases = Object.entries(CODER_A_COUNTEREXAMPLES).flatMap(([id, codes]) => codes.map((code, k) => [`${id} #${k + 1}`, id, code] as const));
  it.each(cases)('%s is rejected', (_label, id, code) => {
    const quest = CODER_A.find((q) => q.id === id)!;
    expect(check(code).ok, `${id} counterexample must be valid Logo`).toBe(true);
    expect(checkQuest(quest, code).pass).toBe(false);
  });

  it('a hidden call fails when the command ignores one of its inputs, and the message names the call', () => {
    const quest = CODER_A.find((q) => q.id === 'c-ing-poly')!;
    const result = checkQuest(quest, CODER_A_COUNTEREXAMPLES['c-ing-poly']![0]!);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('POLY 5 40');
  });

  it('random quests tell the child when the drawing never changes', () => {
    const quest = CODER_A.find((q) => q.id === 'c-rand-dice')!;
    expect(checkQuest(quest, 'REPEAT 5 [FD 40 RT 72]').message).toMatch(/RANDOM/);
  });
});

describe('coder content A: fractals and run limits', () => {
  it.each(CODER_A.filter((q) => q.concept === 'recursion').map((q) => [q.id, q] as const))('%s runs and its hidden calls stay small', (_id, quest) => {
    const r = execute(CODER_A_SOLUTIONS[quest.id]!);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.events.filter((e) => e.type === 'line').length).toBeLessThan(1500);
    for (const call of quest.needs?.calls ?? []) {
      const hidden = execute(call.target);
      expect(hidden.ok, call.run).toBe(true);
      if (hidden.ok) expect(hidden.result.events.filter((e) => e.type === 'line').length, call.run).toBeLessThan(1500);
    }
  });

  it('the whole of content A checks in well under a second each', () => {
    const start = Date.now();
    for (const q of CODER_A) checkQuest(q, CODER_A_SOLUTIONS[q.id]!);
    expect(Date.now() - start).toBeLessThan(10_000);
  });
});

describe('coder content A: stages and order', () => {
  it('puts the six stages at positions 3, 6, 8, 10, 12 and 14 with the planned names and no sticker', () => {
    for (const [n, stage] of Object.entries(STAGES)) {
      const island = islandByKey(stage.key)!;
      expect(island, stage.key).toBeDefined();
      expect(stageNumber(island)).toBe(Number(n));
      expect(island.name).toBe(stage.name);
      expect(island.badge).toBeNull();
      expect(island.units.flat()).toEqual(stage.ids);
    }
  });

  it('keeps the eight old coder islands in order around the new ones', () => {
    expect(islandsFor('coder')).toHaveLength(14);
    expect(islandsFor('coder').map((i) => i.key)).toEqual([
      'coder:moves',
      'coder:loops',
      'coder:colour-cove',
      'coder:debugging',
      'coder:functions',
      'coder:ingredients',
      'coder:variables',
      'coder:grid',
      'coder:decisions',
      'coder:surprise',
      'coder:events',
      'coder:clockwork',
      'coder:recursion',
      'coder:fractals',
    ]);
    expect(ALL_ISLANDS.filter((i) => i.audience === 'little')).toHaveLength(3);
  });

  it('a child who sailed the eight old islands is sent back to stage 3 first, and stages 3, 6, 8, 10, 12 and 14 are open', () => {
    let state: PathState = emptyPath();
    let cleared: string[] = [];
    for (const key of ['coder:moves', 'coder:loops', 'coder:debugging', 'coder:functions', 'coder:variables', 'coder:decisions', 'coder:events', 'coder:recursion']) {
      for (const unit of islandByKey(key)!.units) {
        for (const id of [unit[0], unit[1]]) {
          const r = recordQuest(state, cleared, id, false, '2026-03-02');
          state = r.state;
          cleared = r.cleared;
        }
      }
    }
    for (const n of [3, 6, 8, 10, 12, 14]) expect(islandState(state, cleared, STAGES[n]!.key).status, STAGES[n]!.key).toBe('open');
    expect(nextStop(state, cleared, 'coder', '2026-03-02')).toMatchObject({ kind: 'quest', questId: 'c-red-blue', islandKey: 'coder:colour-cove' });
  });

  /** The stage where each word is first taught (existing stages 1 to 13 and these new ones), per the plan's skill table. */
  const TAUGHT: Record<string, number> = {
    SETPENCOLOR: 1,
    SETPENSIZE: 3,
    SETBACKGROUND: 3,
    REPCOUNT: 3,
    CIRCLE: 1,
    ARC: 1,
    MAKE: 7,
    SETHEADING: 7,
    XCOR: 8,
    YCOR: 8,
    SETXY: 8,
    SETX: 8,
    SETY: 8,
    DOT: 8,
    IF: 9,
    RANDOM: 10,
    WHEN: 11,
    SHOW: 12,
    GAMEOVER: 12,
  };

  it('no quest needs a word that is taught in a later stage', () => {
    for (const q of CODER_A) {
      const parsed = check(CODER_A_SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      const stage = stageOf(q.id);
      for (const word of wordsUsed(parsed.program)) expect(TAUGHT[word] ?? 1, `${q.id} uses ${word}`).toBeLessThanOrEqual(stage);
      const f = features(parsed.program);
      if (f.has('TO')) expect(stage, `${q.id} teaches TO`).toBeGreaterThanOrEqual(6);
      if (f.has('RECURSION')) expect(stage, `${q.id} recursion`).toBeGreaterThanOrEqual(14);
      // ROW puts a REPEAT of squares inside a REPEAT of tiles, so nesting may appear from stage 6.
      if (f.has('NEST')) expect(stage, `${q.id} NEST`).toBeGreaterThanOrEqual(6);
    }
  });

  it('every stage has two units of three, and every quest sits on the island of its own concept', () => {
    for (const s of Object.values(STAGES)) {
      const island = islandByKey(s.key)!;
      expect(island.units).toHaveLength(2);
      for (const id of s.ids) expect(CODER_A.find((q) => q.id === id)!.concept).toBe(island.concept);
    }
  });
});
