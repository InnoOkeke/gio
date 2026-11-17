import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execute } from '../src/logo/index.js';
import { sameDrawing } from '../src/logo/compare.js';
import { checkQuest, QUESTS } from '../src/logo/quests.js';
import { blocksToLogo, toBlocks, type Block } from '../src/logo/blocks.js';
import { check } from '../src/logo/index.js';

const run = (s: string) => {
  const r = execute(s);
  if (!r.ok) throw new Error(r.problem.message);
  return r.result;
};

/** A solution a child might write for each quest, different from the target where possible. */
const SOLUTIONS: Record<string, string> = {
  'l-walk': 'FD 50',
  'l-corner': 'FD 100\nLT 90\nFD 100',
  'l-square': 'FD 100\nRT 90\nFD 100\nRT 90\nFD 100\nRT 90\nFD 100',
  'l-repeat-square': 'REPEAT 4 [\n  FD 100\n  LT 90\n]',
  'l-triangle': 'REPEAT 3 [\n  FD 120\n  RT 120\n]',
  'l-colours': 'SETPENCOLOR "red\nFD 50\nSETPENCOLOR "blue\nRT 90\nFD 50',
  'l-circle': 'CIRCLE 60',
  'l-stairs': 'REPEAT 4 [\n  FD 30\n  RT 90\n  FD 30\n  LT 90\n]',
  'c-line': 'FD 60 FD 40',
  'c-square': 'FD 100 RT 90 FD 100 RT 90 FD 100 RT 90 FD 100',
  'c-repeat': 'REPEAT 4 [FD 100 LT 90]',
  'c-star': 'REPEAT 5 [FD 150 LT 144]',
  'c-bug-square': 'REPEAT 4 [FD 100 RT 90]',
  'c-function': 'TO SQUARE :size\nREPEAT 4 [FD :size RT 90]\nEND\nSQUARE 50\nSQUARE 100',
  'c-shape': 'TO SHAPE :sides\nREPEAT :sides [FD 60 RT 360 / :sides]\nEND\nSHAPE 6',
  'c-bug-triangle': 'REPEAT 3 [FD 120 RT 120]',
  'c-dashes': 'MAKE "on 1\nREPEAT 10 [IFELSE :on = 1 [PD] [PU] FD 10 MAKE "on 1 - :on]',
  'c-spiral': 'TO SPIRAL :n\nIF :n > 100 [STOP]\nFD :n RT 90\nSPIRAL :n + 10\nEND\nSPIRAL 10',
  'c-game': 'WHEN "right [RT 90]\nWHEN "up [FD 10 FD 10]',
  'c-sketch': 'TO GO :h\nSETH :h FD 10\nEND\nWHEN "up [GO 0]\nWHEN "down [GO 180]\nWHEN "left [GO 270]\nWHEN "right [GO 90]',
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
