import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execute } from '../src/logo/index.js';
import { sameDrawing } from '../src/logo/compare.js';
import { checkQuest, features, playWithPresses, QUESTS } from '../src/logo/quests.js';
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
  // ---- adventure map: Little Turtles ----
  'l-zigzag': 'FD 60\nLT 120\nFD 60\nRT 120\nFD 60',
  'l-rectangle': 'REPEAT 2 [\n  FD 150\n  RT 90\n  FD 70\n  RT 90\n]',
  'l-hexagon': 'REPEAT 6 [\n  FD 60\n  LT 60\n]',
  'l-flower-ring': 'REPEAT 6 [\n  CIRCLE 40\n  LT 60\n]',
  'l-octagon': 'REPEAT 8 [\n  FD 50\n  LT 45\n]',
  'l-rainbow-triangle': 'SETPENCOLOR "red\nFD 120\nRT 120\nSETPENCOLOR "blue\nFD 120\nRT 120\nSETPENCOLOR "green\nFD 120\nRT 120',
  'l-rainbow-box': 'SETPENCOLOR "red\nFD 80\nRT 90\nSETPENCOLOR "orange\nFD 80\nRT 90\nSETPENCOLOR "green\nFD 80\nRT 90\nSETPENCOLOR "blue\nFD 80\nRT 90',
  'l-colour-rings': 'SETPENCOLOR "red\nCIRCLE 30\nSETPENCOLOR "blue\nCIRCLE 60',
  'l-sunshine': 'SETPENCOLOR "orange\nCIRCLE 30\nSETPENCOLOR "yellow\nREPEAT 8 [\n  FD 60\n  BK 60\n  RT 45\n]',
  'l-snowman': 'SETPENCOLOR "blue\nCIRCLE 40\nPU\nFD 70\nPD\nSETPENCOLOR "purple\nCIRCLE 30\nPU\nFD 50\nPD\nCIRCLE 20',
  // ---- adventure map: Turtle Coders ----
  'c-ell': 'FD 60 FD 40 RT 90 FD 60',
  'c-rectangle': 'REPEAT 2 [FD 150 RT 90 FD 60 RT 90]',
  'c-triangle': 'REPEAT 3 [FD 100 LT 120]',
  'c-circle': 'CIRCLE 60',
  'c-loop-triangle': 'REPEAT 3 [FD 100 LT 120]',
  'c-loop-hexagon': 'REPEAT 6 [FD 60 LT 60]',
  'c-loop-spin': 'REPEAT 12 [REPEAT 4 [FD 60 RT 90] RT 30]',
  'c-loop-sun': 'REPEAT 24 [FD 80 BK 80 LT 15]',
  'c-bug-star': 'REPEAT 5 [FD 150 RT 144]',
  'c-bug-hexagon': 'REPEAT 6 [FD 60 RT 60]',
  'c-bug-typo': 'REPEAT 4 [FD 100 RT 90]',
  'c-bug-missing-end': 'REPEAT 3 [FD 80 RT 120]',
  'c-box-command': 'TO BOX\nREPEAT 4 [FD 80 RT 90]\nEND\nBOX',
  'c-triangle-command': 'TO TRIANGLE\nREPEAT 3 [FD 100 RT 120]\nEND\nTRIANGLE',
  'c-house': 'TO SQUARE\nREPEAT 4 [FD 100 RT 90]\nEND\nTO ROOF\nREPEAT 3 [FD 100 LT 120]\nEND\nSQUARE\nFD 100\nRT 90\nROOF',
  'c-three-squares': 'TO SQUARE :size\nREPEAT 4 [FD :size RT 90]\nEND\nSQUARE 40\nSQUARE 80\nSQUARE 120',
  'c-square-ring': 'TO SQUARE\nREPEAT 4 [FD 50 RT 90]\nEND\nREPEAT 12 [SQUARE RT 30]',
  'c-make-size': 'MAKE "size 80\nREPEAT 4 [FD :size RT 90]',
  'c-make-double': 'MAKE "size 40\nREPEAT 4 [FD :size RT 90]\nMAKE "size :size * 2\nREPEAT 4 [FD :size RT 90]',
  'c-make-growing': 'MAKE "s 20\nREPEAT 5 [REPEAT 4 [FD :s RT 90] MAKE "s :s + 20]',
  'c-make-steps': 'MAKE "s 20\nREPEAT 4 [FD :s RT 90 FD :s LT 90 MAKE "s :s + 10]',
  'c-two-inputs': 'TO POLY :sides :len\nREPEAT :sides [FD :len RT 360 / :sides]\nEND\nPOLY 6 50\nPOLY 8 40',
  'c-half-and-half': 'REPEAT 6 [IF REPCOUNT < 4 [FD 100] IF REPCOUNT > 3 [FD 50] RT 60]',
  'c-gap-square': 'REPEAT 4 [IFELSE REPCOUNT = 2 [PU] [PD] FD 100 LT 90]',
  'c-bend': 'REPEAT 8 [FD 30 IFELSE REPCOUNT < 5 [RT 30] [LT 60]]',
  'c-turn-choice': 'REPEAT 12 [IFELSE REPCOUNT < 7 [FD 40 RT 90] [FD 20 LT 90]]',
  'c-half-hexagon': 'REPEAT 6 [IF REPCOUNT < 4 [PD] IF REPCOUNT > 3 [PU] FD 60 RT 60]',
  'c-one-key': 'WHEN "up [FD 10 FD 20]',
  'c-space-square': 'WHEN "space [REPEAT 4 [FD 50 RT 90] RT 30]',
  'c-stamp': 'WHEN "up [FD 20]\nWHEN "space [CIRCLE 10]',
  'c-ticker': 'WHEN "right [RT 90]\nWHEN "tick [FD 10]',
  'c-rec-stairs': 'TO STAIRS :n\nIF :n = 0 [STOP]\nFD 20 RT 90 FD 20 LT 90\nSTAIRS :n - 1\nEND\nSTAIRS 4',
  'c-rec-rays': 'TO RAYS :n\nIF :n = 0 [STOP]\nFD 50 BK 50 RT 45\nRAYS :n - 1\nEND\nRAYS 8',
  'c-rec-triangle-spiral': 'TO SPIN :n\nIF :n > 150 [STOP]\nFD :n RT 120\nSPIN :n + 10\nEND\nSPIN 10',
  'c-rec-nested': 'TO NEST :s\nIF :s < 20 [STOP]\nREPEAT 4 [FD :s RT 90]\nNEST :s - 20\nEND\nNEST 100',
  'c-rec-pentagon-spiral': 'TO SPIN :n\nIF :n > 150 [STOP]\nFD :n RT 72\nSPIN :n + 10\nEND\nSPIN 10',
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
