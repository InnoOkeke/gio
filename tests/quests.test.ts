import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execute } from '../src/logo/index.js';
import { sameDrawing } from '../src/logo/compare.js';
import { checkQuest, features, playWithPresses, QUESTS } from '../src/logo/quests.js';
import { blocksToLogo, toBlocks, type Block } from '../src/logo/blocks.js';
import { check } from '../src/logo/index.js';
import { SOLUTIONS } from './solutions';

const run = (s: string) => {
  const r = execute(s);
  if (!r.ok) throw new Error(r.problem.message);
  return r.result;
};

describe('quests', () => {
  it('every quest has a sample solution', () => {
    for (const q of QUESTS) expect(SOLUTIONS[q.id], q.id).toBeDefined();
  });

  it.each(QUESTS.map((q) => [q.id, q] as const))('%s passes with a correct solution', (_id, quest) => {
    expect(checkQuest(quest, SOLUTIONS[quest.id]!)).toMatchObject({ pass: true });
  });

  it.each(QUESTS.filter((q) => q.starter).map((q) => [q.id, q] as const))('%s starter code has the bug', (_id, quest) => {
    expect(checkQuest(quest, quest.starter!).pass).toBe(false);
  });

  it('asks for REPEAT when the drawing is right but the loop is missing', () => {
    const q = QUESTS.find((x) => x.id === 'l-repeat-square')!;
    expect(checkQuest(q, SOLUTIONS['l-square']!)).toEqual({ pass: false, message: 'Great drawing! Now try it with REPEAT.' });
  });

  it('enforces the command limit', () => {
    const q = QUESTS.find((x) => x.id === 'c-repeat')!;
    expect(checkQuest(q, 'REPEAT 2 [FD 100 RT 90]\nREPEAT 2 [FD 100 RT 90]\nPU\nPD').pass).toBe(false);
  });

  it('rejects the wrong shape and explains code problems', () => {
    const q = QUESTS.find((x) => x.id === 'c-square')!;
    expect(checkQuest(q, 'REPEAT 3 [FD 100 RT 120]').pass).toBe(false);
    expect(checkQuest(q, 'FORWRD 100').message).toContain('Did you mean FORWARD?');
  });

  it('requires recursion for the spiral, not just the right picture', () => {
    const q = QUESTS.find((x) => x.id === 'c-spiral')!;
    expect(checkQuest(q, q.target!).pass).toBe(false);
  });
});

describe('drawing comparison', () => {
  it('ignores drawing order, direction and overlaps', () => {
    expect(sameDrawing(run('FD 100'), run('FD 50 FD 50'))).toBe(true);
    expect(sameDrawing(run('FD 100'), run('PU FD 100 PD BK 100'))).toBe(true);
    expect(sameDrawing(run('FD 100'), run('FD 100 BK 30 FD 30'))).toBe(true);
  });

  it('tells different shapes and sizes apart', () => {
    expect(sameDrawing(run('FD 100'), run('FD 90'))).toBe(false);
    expect(sameDrawing(run('REPEAT 4 [FD 100 RT 90]'), run('REPEAT 4 [FD 100 LT 90]'))).toBe(false);
  });

  it('accepts mirror images only when allowed', () => {
    expect(sameDrawing(run('REPEAT 4 [FD 100 RT 90]'), run('REPEAT 4 [FD 100 LT 90]'), { allowMirror: true })).toBe(true);
  });

  it('any regular polygon equals itself drawn starting from another corner', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 10 }), fc.integer({ min: 20, max: 150 }), fc.integer({ min: 1, max: 9 }), (n, size, shift) => {
        const turn = 360 / n;
        const plain = run(`REPEAT ${n} [FD ${size} RT ${turn}]`);
        // Walk to another corner with the pen up, then draw the same polygon from there.
        const k = shift % n;
        const shifted = run(`PU REPEAT ${k} [FD ${size} RT ${turn}] PD REPEAT ${n} [FD ${size} RT ${turn}]`);
        expect(sameDrawing(plain, shifted)).toBe(true);
      }),
    );
  });
});

describe('blocks', () => {
  const sample: Block[] = [
    { kind: 'color', color: 'red' },
    { kind: 'repeat', n: 4, body: [{ kind: 'forward', n: 100 }, { kind: 'right', n: 90 }] },
    { kind: 'penup' },
    { kind: 'back', n: 20 },
    { kind: 'pendown' },
    { kind: 'size', n: 6 },
    { kind: 'circle', n: 30 },
    { kind: 'left', n: 45 },
  ];

  it('blocks become Logo and back again unchanged', () => {
    const logo = blocksToLogo(sample);
    const parsed = check(logo);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(toBlocks(parsed.program)).toEqual({ ok: true, blocks: sample });
  });

  it('explains why grown-up code cannot become blocks', () => {
    const parsed = check('TO BOX\nFD 10\nEND\nBOX');
    if (!parsed.ok) throw new Error('bad test');
    expect(toBlocks(parsed.program)).toEqual({ ok: false, reason: 'it teaches the turtle new commands with TO' });
    const p2 = check('FD 10 * 2');
    if (p2.ok) expect(toBlocks(p2.program).ok).toBe(false);
  });

  const blockArb: fc.Arbitrary<Block> = fc.letrec((tie) => ({
    block: fc.oneof(
      { depthSize: 'small', withCrossShrink: true },
      fc.integer({ min: 0, max: 200 }).map((n): Block => ({ kind: 'forward', n })),
      fc.integer({ min: 0, max: 200 }).map((n): Block => ({ kind: 'back', n })),
      fc.integer({ min: 0, max: 360 }).map((n): Block => ({ kind: 'right', n })),
      fc.integer({ min: 0, max: 360 }).map((n): Block => ({ kind: 'left', n })),
      fc.constant<Block>({ kind: 'penup' }),
      fc.constant<Block>({ kind: 'pendown' }),
      fc.constantFrom('red', 'blue', 'green', 'purple').map((color): Block => ({ kind: 'color', color })),
      fc.tuple(fc.integer({ min: 0, max: 6 }), fc.array(tie('block') as fc.Arbitrary<Block>, { maxLength: 4 })).map(([n, body]): Block => ({ kind: 'repeat', n, body })),
    ),
  })).block;

  it('any block program survives the round trip through Logo', () => {
    fc.assert(
      fc.property(fc.array(blockArb, { maxLength: 8 }), (blocks) => {
        const parsed = check(blocksToLogo(blocks));
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(toBlocks(parsed.program)).toEqual({ ok: true, blocks });
      }),
    );
  });
});

describe('adventure map quests', () => {
  const little = QUESTS.filter((q) => q.audience === 'little');
  const coder = QUESTS.filter((q) => q.audience === 'coder');

  it('has 18 little and 48 coder quests with unique ids', () => {
    expect(little).toHaveLength(18);
    expect(coder).toHaveLength(48);
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });

  it('has a sample solution for every quest and none for a quest that does not exist', () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(QUESTS.map((q) => q.id).sort());
  });

  it.each(QUESTS.map((q) => [q.id, q] as const))('%s fails with empty code', (_id, quest) => {
    expect(checkQuest(quest, '').pass).toBe(false);
  });

  it.each(QUESTS.filter((q) => q.target).map((q) => [q.id, q] as const))('%s target runs and passes its own drawing check', (_id, quest) => {
    const played = playWithPresses(quest.target!, quest.presses);
    expect(played.ok).toBe(true);
    if (played.ok) expect(played.result.events.some((e) => e.type === 'line')).toBe(true);
  });

  it.each(QUESTS.filter((q) => q.needs?.uses?.includes('RECURSION')).map((q) => [q.id, q] as const))('%s needs a command that uses itself', (_id, quest) => {
    expect(checkQuest(quest, quest.target!).pass).toBe(false);
  });

  it('the sample solutions reach every friend-unlocking idea in each mode', () => {
    const reached = (list: typeof QUESTS) => {
      const f = new Set<string>();
      let colours = false;
      for (const q of list) {
        const parsed = check(SOLUTIONS[q.id]!);
        if (!parsed.ok) throw new Error(q.id);
        for (const x of features(parsed.program)) f.add(x);
        if ((q.needs?.minColours ?? 0) >= 2) colours = true;
        if (q.concept === 'debugging') f.add('debugging');
      }
      return { f, colours };
    };
    const l = reached(little);
    expect(['REPEAT', 'CIRCLE'].every((x) => l.f.has(x))).toBe(true);
    expect(l.colours).toBe(true);
    const c = reached(coder);
    expect(['REPEAT', 'CIRCLE', 'MAKE', 'IF', 'TO', 'RECURSION', 'WHEN', 'debugging'].every((x) => c.f.has(x))).toBe(true);
  });

  /** The numbers the block steppers can reach (src/ui/editor/BlocksEditor.tsx). */
  const onGrid = (blocks: Block[]): boolean =>
    blocks.every((b) => {
      switch (b.kind) {
        case 'forward':
        case 'back':
          return b.n >= 0 && b.n <= 300 && b.n % 10 === 0;
        case 'right':
        case 'left':
          return b.n >= 0 && b.n <= 360 && b.n % 15 === 0;
        case 'circle':
          return b.n >= 10 && b.n <= 150 && b.n % 10 === 0;
        case 'size':
          return b.n >= 1 && b.n <= 20;
        case 'repeat':
          return b.n >= 1 && b.n <= 36 && onGrid(b.body);
        default:
          return true;
      }
    });

  it.each(little.map((q) => [q.id, q] as const))('%s can be built with blocks, and the solution is reachable with the steppers', (_id, quest) => {
    for (const code of [quest.target, SOLUTIONS[quest.id]].filter((c): c is string => c !== undefined)) {
      const parsed = check(code);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      const blocks = toBlocks(parsed.program);
      expect(blocks.ok).toBe(true);
      if (blocks.ok) expect(onGrid(blocks.blocks)).toBe(true);
    }
  });
});
