import { describe, it, expect } from 'vitest';
import { execute, check } from '../src/logo/index.js';
import { sameDrawing } from '../src/logo/compare.js';
import { complexity } from '../src/logo/difficulty.js';
import { checkQuest, features, playWithPresses, type Quest } from '../src/logo/quests.js';
import { CHECK_SEEDS, mulberry32 } from '../src/logo/seeded.js';

/** A synthetic quest, so each checker rule is tested without depending on real content. */
function quest(needs: NonNullable<Quest['needs']>, extra: Partial<Quest> = {}): Quest {
  return { id: 't-synthetic', audience: 'coder', concept: 'moves', title: 'Synthetic', goal: 'g', hint: 'h', needs, ...extra };
}

const passes = (q: Quest, code: string): boolean => checkQuest(q, code).pass;

describe('seeded randomness', () => {
  it('gives the same numbers for the same seed and stays in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const first = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(first);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(mulberry32(8)()).not.toBe(first[0]);
  });

  it('makes RANDOM repeatable when playing with a seed, and different seeds differ', () => {
    const code = 'REPEAT 10 [FD 5 + RANDOM 50 RT RANDOM 360]';
    const run = (seed: number) => {
      const r = playWithPresses(code, [], { seed });
      if (!r.ok) throw new Error(r.message);
      return JSON.stringify(r.result.events);
    };
    expect(run(7)).toBe(run(7));
    expect(new Set(CHECK_SEEDS.map(run)).size).toBeGreaterThan(1);
  });
});

describe('NEST feature', () => {
  const has = (code: string) => {
    const parsed = check(code);
    if (!parsed.ok) throw new Error(parsed.problem.message);
    return features(parsed.program).has('NEST');
  };

  it('sees a REPEAT inside a REPEAT, also inside a procedure, and not two in a row', () => {
    expect(has('REPEAT 2 [REPEAT 2 [FD 10]]')).toBe(true);
    expect(has('TO A\nREPEAT 2 [IF 1 = 1 [REPEAT 3 [FD 5]]]\nEND\nA')).toBe(true);
    expect(has('REPEAT 2 [FD 10]\nREPEAT 2 [FD 10]')).toBe(false);
  });

  it('asks for it with a kid-friendly message', () => {
    const q = quest({ uses: ['NEST'] });
    expect(passes(q, 'REPEAT 2 [REPEAT 2 [FD 10]]')).toBe(true);
    expect(checkQuest(q, 'REPEAT 4 [FD 10]')).toEqual({ pass: false, message: 'Put one REPEAT inside another REPEAT.' });
  });
});

describe('words', () => {
  it('finds commands by any spelling, reporters inside expressions, and special words', () => {
    const q = quest({ words: ['FD', 'REPCOUNT', 'REPEAT'] });
    expect(passes(q, 'REPEAT 3 [FORWARD 10 * REPCOUNT]')).toBe(true);
    expect(passes(q, 'REPEAT 3 [FORWARD 10]')).toBe(false);
    expect(passes(q, 'FD 10 * 2')).toBe(false);
  });

  it('finds a reporter in a loop count, a condition and a MAKE value', () => {
    expect(passes(quest({ words: ['SQRT'] }), 'REPEAT SQRT 16 [FD 5]')).toBe(true);
    expect(passes(quest({ words: ['XCOR'] }), 'IF XCOR < 5 [FD 5]')).toBe(true);
    expect(passes(quest({ words: ['RANDOM'], props: { varies: false } }), 'MAKE "n RANDOM 5\nFD 10')).toBe(true);
    expect(passes(quest({ words: ['DOT', 'SETXY'] }), 'SETXY 10 10\nDOT 5 5')).toBe(true);
  });

  it('names the missing word', () => {
    expect(checkQuest(quest({ words: ['DOT'] }), 'FD 10').message).toContain('DOT');
  });
});

describe('keeps, minSizes and background', () => {
  it('keeps requires the starter text, in any letter case', () => {
    const q = quest({ keeps: ['SQUARE'] });
    expect(passes(q, 'TO square\nFD 1\nEND\nsquare')).toBe(true);
    expect(checkQuest(q, 'FD 1')).toEqual({ pass: false, message: 'Fix the bug, but keep SQUARE in your code. Do not rewrite it from scratch.' });
  });

  it('minSizes counts different pen sizes among the lines', () => {
    const q = quest({ minSizes: 2 });
    expect(passes(q, 'SETPENSIZE 2\nFD 10\nSETPENSIZE 8\nFD 10')).toBe(true);
    expect(passes(q, 'SETPENSIZE 8\nFD 10\nFD 10')).toBe(false);
    // A size that never draws a line does not count.
    expect(passes(q, 'SETPENSIZE 2\nFD 10\nSETPENSIZE 8\nPU\nFD 10')).toBe(false);
  });

  it('background needs a colour other than the default', () => {
    const q = quest({ background: true });
    expect(passes(q, 'SETBACKGROUND "navy\nFD 10')).toBe(true);
    expect(passes(q, 'FD 10')).toBe(false);
  });
});

describe('defines and hidden calls', () => {
  const sq = quest(
    {
      defines: [{ name: 'SQ', inputs: 1 }],
      calls: [
        { run: 'SQ 50', target: 'REPEAT 4 [FD 50 RT 90]' },
        { run: 'SQ 20', target: 'REPEAT 4 [FD 20 RT 90]' },
      ],
    },
    { target: 'REPEAT 4 [FD 30 RT 90]' },
  );
  const good = 'TO SQ :s\nREPEAT 4 [FD :s RT 90]\nEND\nSQ 30';

  it('passes a procedure that really uses its input', () => {
    expect(checkQuest(sq, good)).toMatchObject({ pass: true });
  });

  it('fails a hard-coded answer that only draws the visible case', () => {
    const hardCoded = 'TO SQ :s\nREPEAT 4 [FD 30 RT 90]\nEND\nSQ 30';
    const r = checkQuest(sq, hardCoded);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('SQ 50');
  });

  it('fails the plain drawing without the procedure and a procedure with the wrong inputs', () => {
    expect(checkQuest(sq, 'REPEAT 4 [FD 30 RT 90]').message).toContain('SQ');
    expect(checkQuest(sq, 'TO SQ :a :b\nREPEAT 4 [FD :a RT 90]\nEND\nSQ 30 1').message).toBe('SQ should take 1 input, but yours takes 2.');
  });

  it('runs the hidden call on a cleared stage with the pen down, so leftovers do not matter', () => {
    const messy = 'TO SQ :s\nREPEAT 4 [FD :s RT 90]\nEND\nSQ 30\nPU\nFD 77\nRT 33\nSETPENCOLOR "red';
    expect(passes(sq, messy)).toBe(true);
  });

  it('reports a hidden call that crashes', () => {
    const q = quest({ calls: [{ run: 'SQ 50', target: 'FD 50' }] });
    expect(checkQuest(q, 'FD 10').message).toContain('SQ 50');
  });

  it('is deterministic: repeated checks give the same answer', () => {
    const answers = Array.from({ length: 3 }, () => JSON.stringify([checkQuest(sq, good), checkQuest(sq, 'FD 1')]));
    expect(new Set(answers).size).toBe(1);
  });
});

describe('random properties', () => {
  const step = quest({ words: ['RANDOM'], props: { segments: { count: [1, 1], length: [20, 99] } } });

  it('accepts one line whose length is chosen by RANDOM within range', () => {
    expect(passes(step, 'FD 20 + RANDOM 80')).toBe(true);
  });

  it('fails a program that does not use RANDOM at all, because it never varies', () => {
    const r = checkQuest(step, 'FD 50');
    expect(r.pass).toBe(false);
    expect(r.message).toContain('RANDOM');
  });

  it('fails a random program outside the allowed lengths and with the wrong number of lines', () => {
    expect(passes(step, 'FD 90 + RANDOM 40')).toBe(false);
    expect(passes(step, 'FD 20 + RANDOM 50\nRT 90\nFD 30')).toBe(false);
  });

  it('can say varies is not needed', () => {
    expect(passes(quest({ props: { varies: false, segments: { count: [1, 1] } } }), 'FD 50')).toBe(true);
  });

  it('checks that every line points at a multiple of the angle step', () => {
    const q = quest({ words: ['RANDOM'], props: { segments: { angleStep: 90 } } });
    expect(passes(q, 'REPEAT 10 [SETH 90 * RANDOM 4 FD 15]')).toBe(true);
    expect(passes(q, 'REPEAT 10 [SETH 10 * RANDOM 9 FD 15]')).toBe(false);
  });

  it('checks dots counts and bounds', () => {
    const q = quest({ words: ['RANDOM'], props: { dots: { count: [30, 30] }, bounds: { x: 100, y: 100 } } });
    const spot = (n: number, w: number) => `REPEAT ${n} [MAKE "x RANDOM ${w} MAKE "y RANDOM 201 DOT :x - 100 :y - 100]`;
    const good = spot(30, 201);
    expect(passes(q, good)).toBe(true);
    expect(passes(q, spot(29, 201))).toBe(false);
    expect(passes(q, spot(30, 301))).toBe(false);
  });

  it('checks that a shape closes and where the turtle ends', () => {
    const closed = quest({ words: ['RANDOM'], props: { closed: true } });
    expect(passes(closed, 'MAKE "n 3 + RANDOM 5\nREPEAT :n [FD 40 RT 360 / :n]')).toBe(true);
    expect(passes(closed, 'MAKE "n 3 + RANDOM 5\nREPEAT :n [FD 40 RT 300 / :n]')).toBe(false);
    const ends = quest({ props: { varies: false, endsWithin: { x: 0, y: 100, r: 1 } } });
    expect(passes(ends, 'FD 100')).toBe(true);
    expect(passes(ends, 'FD 90')).toBe(false);
  });

  it('is deterministic across repeated runs, and never mentions the seed', () => {
    const code = 'FD 20 + RANDOM 80';
    const first = checkQuest(step, code);
    for (let i = 0; i < 5; i++) expect(checkQuest(step, code)).toEqual(first);
    expect(checkQuest(step, 'FD 150 + RANDOM 3').message).not.toMatch(/seed/i);
  });
});

describe('trace over key presses', () => {
  const target = 'WHEN "up [FD 10]\nWHEN "space [RT 90]';
  const q = quest({ trace: true }, { target, presses: ['UP', 'SPACE', 'UP'] });

  it('passes the same behaviour written differently', () => {
    expect(passes(q, 'WHEN "up [FD 5 FD 5]\nWHEN "space [RT 45 RT 45]')).toBe(true);
  });

  it('fails when the turtle is somewhere else after a press, even if the drawing matches', () => {
    // Moves with the pen up on SPACE: no extra line, so only the trace can tell.
    const sneaky = quest({ trace: true }, { target: 'WHEN "space [RT 0]', presses: ['SPACE'] });
    expect(passes(sneaky, 'WHEN "space [RT 0]')).toBe(true);
    const r = checkQuest(sneaky, 'WHEN "space [PU SETXY 50 0 PD]');
    expect(r.pass).toBe(false);
    expect(r.message).toContain('keys');
  });

  it('records one turtle state for the program and one per press', () => {
    const r = playWithPresses(target, ['UP', 'SPACE', 'UP']);
    expect(r.ok && r.states.length).toBe(4);
    if (r.ok) expect(r.states.map((s) => Math.round(s.y))).toEqual([0, 10, 10, 10]);
  });
});

describe('game outcome', () => {
  it('compares the last SHOW text', () => {
    const q = quest({ expect: { show: '10' } }, { presses: ['SPACE', 'SPACE'] });
    const good = 'MAKE "s 0\nSHOW :s\nWHEN "space [MAKE "s :s + 5 SHOW :s]';
    expect(passes(q, good)).toBe(true);
    const r = checkQuest(q, 'MAKE "s 0\nSHOW :s\nWHEN "space [MAKE "s :s + 4 SHOW :s]');
    expect(r).toEqual({ pass: false, message: 'The scoreboard should end up showing 10, but it shows 8.' });
    expect(checkQuest(q, 'FD 1').message).toContain('never used SHOW');
  });

  it('checks GAMEOVER both ways', () => {
    const over = quest({ expect: { gameOver: true } });
    expect(passes(over, 'FD 10\nGAMEOVER')).toBe(true);
    expect(passes(over, 'FD 10')).toBe(false);
    expect(passes(quest({ expect: { gameOver: false } }), 'GAMEOVER')).toBe(false);
  });

  it('plays ticks, so a countdown game can be checked', () => {
    const q = quest({ expect: { show: '0', gameOver: true } }, { presses: Array.from({ length: 10 }, () => 'TICK' as const) });
    const code = 'MAKE "n 10\nWHEN "tick [MAKE "n :n - 1 SHOW :n IF :n = 0 [GAMEOVER]]';
    expect(passes(q, code)).toBe(true);
    expect(passes(q, 'MAKE "n 10\nWHEN "tick [MAKE "n :n - 1 SHOW :n]')).toBe(false);
  });
});

describe('dots in drawings', () => {
  const draw = (code: string) => {
    const r = execute(code);
    if (!r.ok) throw new Error(r.problem.message);
    return r.result;
  };

  it('compares dots only when either drawing has them', () => {
    expect(sameDrawing(draw('FD 50'), draw('FD 50'))).toBe(true);
    expect(sameDrawing(draw('DOT 10 10'), draw('DOT 10 10'))).toBe(true);
    expect(sameDrawing(draw('DOT 10 10'), draw('DOT 40 10'))).toBe(false);
    expect(sameDrawing(draw('FD 50'), draw('FD 50\nDOT 5 5'))).toBe(false);
  });

  it('ignores the order dots were drawn in, and honours mirrors only when allowed', () => {
    expect(sameDrawing(draw('DOT 10 10\nDOT 30 0'), draw('DOT 30 0\nDOT 10 10'))).toBe(true);
    expect(sameDrawing(draw('DOT 10 10'), draw('DOT -10 10'))).toBe(false);
    expect(sameDrawing(draw('DOT 10 10'), draw('DOT -10 10'), { allowMirror: true })).toBe(true);
  });

  it('forgets dots drawn before a clear', () => {
    expect(sameDrawing(draw('DOT 10 10\nCS\nFD 20'), draw('FD 20'))).toBe(true);
  });

  it('a quest whose target has dots needs the same dots', () => {
    const q = quest({}, { target: 'DOT 0 50\nDOT 50 0' });
    expect(passes(q, 'DOT 50 0\nDOT 0 50')).toBe(true);
    expect(passes(q, 'DOT 0 50')).toBe(false);
  });
});

describe('complexity', () => {
  it('grows with more ideas in the program and is deterministic', () => {
    const simple = complexity('FD 100');
    const loop = complexity('REPEAT 4 [FD 100 RT 90]');
    const proc = complexity('TO SQ :s\nREPEAT 4 [FD :s RT 90]\nEND\nSQ 50');
    const rec = complexity('TO SP :n\nIF :n > 100 [STOP]\nFD :n RT 90\nSP :n + 10\nEND\nSP 10');
    expect(simple).toBeLessThan(loop);
    expect(loop).toBeLessThan(proc);
    expect(proc).toBeLessThan(rec);
    expect(complexity('REPEAT 4 [FD 100 RT 90]')).toBe(loop);
  });

  it('adds the extras and scores code that does not parse as 0', () => {
    const base = complexity('FD 100');
    expect(complexity('FD 100', { ticks: 20, hiddenCalls: 2, propChecks: 1 })).toBe(base + 2 + 4 + 3);
    expect(complexity('FORWRD 100')).toBe(0);
  });
});
