import { describe, it, expect } from 'vitest';
import { check, execute } from '../src/logo/index.js';
import { checkQuest, commandCount, playWithPresses, QUESTS } from '../src/logo/quests.js';
import { CODER_B } from '../src/logo/stages/coder-b.js';
import { ALL_ISLANDS, islandByKey, islandsFor, placeOf, stageNumber } from '../src/ui/path/islands';
import { CODER_B_COUNTEREXAMPLES, CODER_B_NAIVE, CODER_B_SOLUTIONS } from './solutions/coder-b';

const STAGES: Record<number, { key: string; name: string; concept: string; resident: string; ids: string[] }> = {
  15: { key: 'coder:bug-bay', name: 'Bug Bay', concept: 'debugging', resident: 'dot', ids: ['c-bb-two-bugs', 'c-bb-name', 'c-bb-runaway', 'c-bb-off-by-one', 'c-bb-inputs', 'c-bb-game'] },
  16: { key: 'coder:tiny', name: 'Tiny Code Temple', concept: 'loops', resident: 'olly', ids: ['c-tiny-square', 'c-tiny-ring', 'c-tiny-burst', 'c-tiny-spiral', 'c-tiny-flower', 'c-tiny-snowflake'] },
  17: { key: 'coder:mirror', name: 'Mirror Mountains', concept: 'functions', resident: 'bree', ids: ['c-mir-butterfly', 'c-mir-snowflake6', 'c-mir-row', 'c-mir-crosshatch', 'c-mir-honeycomb', 'c-mir-mandala'] },
  18: { key: 'coder:physics', name: 'Physics Peak', concept: 'variables', resident: 'nutmeg', ids: ['c-phys-fall', 'c-phys-floor', 'c-phys-bounce', 'c-phys-damped', 'c-phys-throw', 'c-phys-box'] },
  19: { key: 'coder:game-studio', name: 'Game Studio', concept: 'events', resident: 'hop', ids: ['c-gs-gem', 'c-gs-walls', 'c-gs-lives', 'c-gs-levels', 'c-gs-chase', 'c-gs-three'] },
  20: { key: 'coder:master', name: 'Logo Master', concept: 'recursion', resident: 'spindle', ids: ['c-lm-polyspi', 'c-lm-garden', 'c-lm-engine', 'c-lm-tiny-flake', 'c-lm-bounce-count', 'c-lm-final-game'] },
};

const quest = (id: string) => CODER_B.find((q) => q.id === id)!;

/** How many lines differ between two programs: the longer side of a line-by-line diff. */
function changedLines(a: string, b: string): number {
  const x = a.split('\n');
  const y = b.split('\n');
  const table = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      table[i]![j] = x[i] === y[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const same = table[0]![0]!;
  return Math.max(x.length - same, y.length - same);
}

describe('coder content B: quests', () => {
  it('has 36 quests, all for Turtle Coders, in stage order', () => {
    expect(CODER_B).toHaveLength(36);
    expect(CODER_B.every((q) => q.audience === 'coder')).toBe(true);
    expect(CODER_B.map((q) => q.id)).toEqual(Object.values(STAGES).flatMap((s) => s.ids));
    expect(QUESTS.slice(-36).map((q) => q.id)).toEqual(CODER_B.map((q) => q.id));
  });

  it('has a reference solution for every quest and nothing else', () => {
    expect(Object.keys(CODER_B_SOLUTIONS).sort()).toEqual(CODER_B.map((q) => q.id).sort());
  });

  it.each(CODER_B.map((q) => [q.id, q] as const))('%s passes with its reference solution and fails with empty code', (_id, q) => {
    expect(checkQuest(q, CODER_B_SOLUTIONS[q.id]!)).toMatchObject({ pass: true });
    expect(checkQuest(q, '').pass).toBe(false);
  });

  it('writes the exact numbers: every goal has a digit, every hint is filled in', () => {
    for (const q of CODER_B) {
      expect(q.goal, q.id).toMatch(/\d/);
      expect(q.hint.length, q.id).toBeGreaterThan(10);
      expect(q.title.length, q.id).toBeGreaterThan(2);
    }
  });

  it('checks the same way every time (seeded randomness, fixed key presses)', () => {
    for (const q of CODER_B.filter((x) => x.needs?.props || x.presses)) {
      const first = checkQuest(q, CODER_B_SOLUTIONS[q.id]!);
      for (let k = 0; k < 2; k++) expect(checkQuest(q, CODER_B_SOLUTIONS[q.id]!)).toEqual(first);
    }
  });

  it('the whole of content B checks in well under ten seconds', () => {
    const start = Date.now();
    for (const q of CODER_B) checkQuest(q, CODER_B_SOLUTIONS[q.id]!);
    expect(Date.now() - start).toBeLessThan(10_000);
  });
});

describe('coder content B: Bug Bay starters', () => {
  const bugs = CODER_B.filter((q) => q.starter);

  it('has a starter in every Bug Bay quest and in Fix the engine, and nowhere else', () => {
    expect(bugs.map((q) => q.id)).toEqual([...STAGES[15]!.ids, 'c-lm-engine']);
  });

  it.each(bugs.map((q) => [q.id, q] as const))('%s: the starter fails, and the fix is a small edit that keeps the starter\u2019s own code', (_id, q) => {
    expect(checkQuest(q, q.starter!).pass).toBe(false);
    const fixed = CODER_B_SOLUTIONS[q.id]!;
    expect(changedLines(q.starter!, fixed), 'lines changed').toBeLessThanOrEqual(3);
    expect(changedLines(q.starter!, fixed), 'lines changed').toBeGreaterThan(0);
    for (const token of q.needs!.keeps ?? []) {
      expect(q.starter!.toUpperCase(), `starter keeps ${token}`).toContain(token.toUpperCase());
      expect(fixed.toUpperCase(), `fix keeps ${token}`).toContain(token.toUpperCase());
    }
    expect(q.needs!.keeps?.length ?? 0, 'keeps force fixing instead of rewriting').toBeGreaterThan(0);
  });

  it('the runtime bugs fail with an error the child can read, not with a quiet wrong picture', () => {
    expect(checkQuest(quest('c-bb-name'), quest('c-bb-name').starter!).message).toMatch(/:trun/i);
    expect(checkQuest(quest('c-bb-name'), quest('c-bb-name').starter!).message).toMatch(/:turn/i);
    expect(checkQuest(quest('c-bb-runaway'), quest('c-bb-runaway').starter!).message).toMatch(/itself/i);
    expect(checkQuest(quest('c-bb-inputs'), quest('c-bb-inputs').starter!).message).toMatch(/needs more inputs/i);
  });

  it('a clean rewrite of a Bug Bay program is turned away and the child is told to fix the bug', () => {
    const rewrite = CODER_B_COUNTEREXAMPLES['c-bb-name']![0]!;
    expect(checkQuest(quest('c-bb-name'), rewrite)).toMatchObject({ pass: false });
    expect(checkQuest(quest('c-bb-name'), rewrite).message).toMatch(/keep/i);
  });
});

describe('coder content B: Tiny Code Temple has a naive answer that fails', () => {
  const tiny = STAGES[16]!.ids.map((id) => quest(id));

  it('has a naive answer for each quest', () => {
    expect(Object.keys(CODER_B_NAIVE).sort()).toEqual([...STAGES[16]!.ids].sort());
  });

  it.each(tiny.map((q) => [q.id, q] as const))('%s: the naive answer draws the right picture but needs too many commands', (_id, q) => {
    const naive = CODER_B_NAIVE[q.id]!;
    const limit = q.needs!.maxCommands!;
    const parsed = check(naive);
    if (!parsed.ok) throw new Error(q.id);
    expect(commandCount(parsed.program), 'naive command count').toBeGreaterThan(limit);
    const withoutLimit = { ...q, needs: { ...q.needs, maxCommands: undefined } };
    expect(checkQuest(withoutLimit, naive), 'right picture').toMatchObject({ pass: true });
    const result = checkQuest(q, naive);
    expect(result.pass).toBe(false);
    expect(result.message).toContain(`in ${limit} commands or fewer`);
  });

  it('the reference answers are at or under the limit, and the limits get no looser than the plan', () => {
    for (const q of tiny) {
      const parsed = check(CODER_B_SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      expect(commandCount(parsed.program), q.id).toBeLessThanOrEqual(q.needs!.maxCommands!);
      expect(q.needs!.maxCommands!, q.id).toBeLessThanOrEqual(7);
    }
  });
});

describe('coder content B: no quest passes by cheating', () => {
  const needsCounter = CODER_B.filter((q) => q.needs?.calls || q.needs?.props || q.needs?.expect || q.needs?.trace || q.needs?.words || q.needs?.keeps || q.needs?.defines);

  it('every hidden-call, random, scoreboard, game and bug quest has at least one counterexample', () => {
    for (const q of needsCounter) expect(CODER_B_COUNTEREXAMPLES[q.id]?.length ?? 0, q.id).toBeGreaterThan(0);
    expect(Object.keys(CODER_B_COUNTEREXAMPLES).every((id) => CODER_B.some((q) => q.id === id))).toBe(true);
  });

  const cases = Object.entries(CODER_B_COUNTEREXAMPLES).flatMap(([id, codes]) => codes.map((code, k) => [`${id} #${k + 1}`, id, code] as const));
  it.each(cases)('%s is rejected', (_label, id, code) => {
    expect(check(code).ok, `${id} counterexample must be valid Logo`).toBe(true);
    expect(checkQuest(quest(id), code).pass).toBe(false);
  });

  it('a hidden call fails when the command ignores its input, and the message names the call', () => {
    const result = checkQuest(quest('c-lm-polyspi'), CODER_B_COUNTEREXAMPLES['c-lm-polyspi']![0]!);
    expect(result.pass).toBe(false);
    expect(result.message).toContain('BLOOM 3 120');
  });

  it('the random garden tells the child when the flowers never move', () => {
    expect(checkQuest(quest('c-lm-garden'), CODER_B_COUNTEREXAMPLES['c-lm-garden']![0]!).message).toMatch(/RANDOM/);
  });
});

describe('coder content B: physics and games match an independent calculation', () => {
  it('the ball in a box shows 6, uses the floor and both walls, and ends the game, as plain arithmetic says it must', () => {
    let x = -100;
    let y = 100;
    let vx = 12;
    let v = 0;
    let bounces = 0;
    let over = 0;
    const hit = new Set<string>();
    for (let tick = 1; tick <= 80 && over === 0; tick++) {
      v -= 1;
      x += vx;
      y += v;
      if (y < -100) {
        y = -100;
        v = -v / 2;
        bounces++;
        hit.add('floor');
      }
      if (x > 100) {
        x = 100;
        vx = -vx;
        bounces++;
        hit.add('right');
      }
      if (x < -100) {
        x = -100;
        vx = -vx;
        bounces++;
        hit.add('left');
      }
      if (bounces === 6) over = tick;
    }
    expect(bounces).toBe(6);
    expect([...hit].sort()).toEqual(['floor', 'left', 'right']);
    expect(over).toBeGreaterThan(20);
    expect(over).toBeLessThan(80);
    expect(quest('c-lm-bounce-count').needs!.expect).toEqual({ show: '6', gameOver: true });
  });

  it('the floor stops the falling turtle where plain arithmetic says', () => {
    let y = 100;
    let v = 0;
    for (let tick = 1; tick <= 25; tick++) {
      v -= 1;
      y += v;
      if (y < -100) {
        y = -100;
        v = 0;
      }
    }
    const run = playWithPresses(CODER_B_SOLUTIONS['c-phys-floor']!, quest('c-phys-floor').presses!);
    expect(run.ok).toBe(true);
    if (run.ok) expect(run.result.final.y).toBeCloseTo(y, 3);
  });

  it('the final game score adds 5 for each life left', () => {
    const run = playWithPresses(CODER_B_SOLUTIONS['c-lm-final-game']!, quest('c-lm-final-game').presses!);
    expect(run.ok).toBe(true);
    if (run.ok) {
      const shown = run.result.events.filter((e) => e.type === 'show').map((e) => (e as { text: string }).text);
      expect(shown.slice(-1)).toEqual(['30']);
      expect(run.result.events.some((e) => e.type === 'gameover')).toBe(true);
    }
  });

  it('the chase ends in GAMEOVER before the last tick, so the extra ticks are ignored', () => {
    const q = quest('c-gs-chase');
    const run = playWithPresses(CODER_B_SOLUTIONS[q.id]!, q.presses!);
    expect(run.ok).toBe(true);
    if (run.ok) {
      const over = run.result.events.findIndex((e) => e.type === 'gameover');
      expect(over).toBeGreaterThan(0);
      expect(run.result.events.slice(over + 1)).toHaveLength(0);
    }
  });

  it('the game quests press the keys the goals describe', () => {
    const count = (id: string, key: string): number => quest(id).presses!.filter((k) => k === key).length;
    expect(count('c-gs-levels', 'RIGHT')).toBe(13);
    expect(count('c-gs-levels', 'UP')).toBe(2);
    expect(count('c-gs-walls', 'RIGHT')).toBe(5);
    expect(count('c-gs-walls', 'LEFT')).toBe(7);
    expect(count('c-gs-chase', 'TICK')).toBe(24);
    expect(count('c-phys-box', 'TICK')).toBe(60);
    expect(count('c-lm-bounce-count', 'TICK')).toBe(80);
  });
});

describe('coder content B: fractal and run limits', () => {
  it('the hidden snowflake calls stay small', () => {
    for (const call of quest('c-lm-tiny-flake').needs!.calls!) {
      const hidden = execute(call.target);
      expect(hidden.ok, call.run).toBe(true);
      if (hidden.ok) expect(hidden.result.events.filter((e) => e.type === 'line').length, call.run).toBeLessThan(1500);
    }
  });
});

describe('coder content B: stages and order', () => {
  it('puts the six stages at positions 15 to 20 with the planned names, residents and no sticker', () => {
    for (const [n, stage] of Object.entries(STAGES)) {
      const island = islandByKey(stage.key)!;
      expect(island, stage.key).toBeDefined();
      expect(stageNumber(island)).toBe(Number(n));
      expect(island.name).toBe(stage.name);
      expect(island.concept).toBe(stage.concept);
      expect(island.resident).toBe(stage.resident);
      expect(island.badge).toBeNull();
      expect(island.stamp).toMatch(/^#[0-9a-f]{6}$/i);
      expect(island.units).toHaveLength(2);
      expect(island.units.flat()).toEqual(stage.ids);
    }
  });

  it('Logo Master is the last stage and has the gold art', () => {
    const coder = islandsFor('coder');
    expect(coder).toHaveLength(20);
    const last = coder[coder.length - 1]!;
    expect(last.key).toBe('coder:master');
    expect(last.art).toBe('master');
    expect(last.stamp.toLowerCase()).toBe('#d4a017');
    expect(coder.filter((i) => i.art === 'master')).toHaveLength(1);
  });

  it('every quest sits on the island of its own concept, and every quest is on exactly one island', () => {
    for (const s of Object.values(STAGES)) {
      for (const id of s.ids) {
        expect(quest(id).concept, id).toBe(s.concept);
        expect(placeOf(id)?.island.key, id).toBe(s.key);
      }
    }
    const placed = ALL_ISLANDS.flatMap((i) => i.units.flat());
    expect(new Set(placed).size).toBe(placed.length);
  });
});
