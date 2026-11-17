import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { check, execute, NAMED_COLORS, PALETTE_16, type RunResult, type TurtleEvent } from '../src/logo/index.js';

function ok(source: string, random?: () => number): RunResult {
  const res = execute(source, random ? { random } : undefined);
  if (!res.ok) throw new Error(`Expected success, got: ${res.problem.message} (line ${res.problem.line})`);
  return res.result;
}

function problem(source: string) {
  const res = execute(source);
  if (res.ok) throw new Error('Expected a problem, but the program ran');
  return res.problem;
}

const lines = (r: RunResult) => r.events.filter((e): e is Extract<TurtleEvent, { type: 'line' }> => e.type === 'line');

describe('movement and turning', () => {
  it('moves up from the centre when facing 0', () => {
    const r = ok('FD 100');
    expect(r.final).toMatchObject({ x: 0, y: 100, heading: 0 });
    expect(lines(r)).toEqual([expect.objectContaining({ x1: 0, y1: 0, x2: 0, y2: 100 })]);
  });

  it('turns clockwise with RIGHT and counter-clockwise with LEFT', () => {
    expect(ok('RT 90 FD 50').final).toMatchObject({ x: 50, y: 0, heading: 90 });
    expect(ok('LT 90 FD 50').final).toMatchObject({ x: -50, y: 0, heading: 270 });
  });

  it('accepts short and long names, in any case', () => {
    expect(ok('forward 10 Rt 90 fd 10').final).toMatchObject({ x: 10, y: 10 });
  });

  it('does not draw with the pen up', () => {
    const r = ok('PU FD 50 PD FD 50');
    expect(lines(r)).toHaveLength(1);
    expect(r.final.y).toBe(100);
  });

  it('HOME returns to the centre facing up, drawing on the way', () => {
    const r = ok('RT 45 FD 70 HOME');
    expect(r.final).toMatchObject({ x: 0, y: 0, heading: 0 });
    expect(lines(r)).toHaveLength(2);
  });

  it('reads `SETXY 10 -20` as two inputs', () => {
    expect(ok('PU SETXY 10 -20').final).toMatchObject({ x: 10, y: -20 });
  });

  it('draws circles as many short lines and leaves the turtle in place', () => {
    const r = ok('CIRCLE 50');
    expect(lines(r).length).toBeGreaterThanOrEqual(72);
    expect(r.final).toMatchObject({ x: 0, y: 0, heading: 0 });
  });
});

describe('loops, procedures and variables', () => {
  it('REPEAT draws a square that ends where it started', () => {
    const r = ok('REPEAT 4 [FD 100 RT 90]');
    expect(lines(r)).toHaveLength(4);
    expect(r.final).toMatchObject({ x: 0, y: 0, heading: 0 });
  });

  it('supports procedures with inputs', () => {
    const r = ok('TO SQUARE :size\n REPEAT 4 [FD :size RT 90]\nEND\nSQUARE 30 SQUARE 60');
    expect(lines(r)).toHaveLength(8);
  });

  it('lets a procedure be used before it is defined', () => {
    expect(lines(ok('TRIANGLE\nTO TRIANGLE\n REPEAT 3 [FD 50 RT 120]\nEND'))).toHaveLength(3);
  });

  it('supports recursion that STOPs', () => {
    const src = 'TO SPIRAL :n\n IF :n > 100 [STOP]\n FD :n RT 90\n SPIRAL :n + 10\nEND\nSPIRAL 10';
    expect(lines(ok(src))).toHaveLength(10);
  });

  it('MAKE, arithmetic and REPCOUNT work together', () => {
    const r = ok('MAKE "step 10\nREPEAT 3 [FD :step * REPCOUNT]');
    expect(r.final.y).toBe(60);
  });

  it('IFELSE picks the right branch', () => {
    expect(ok('MAKE "x 5 IFELSE :x > 3 [FD 10] [FD 20]').final.y).toBe(10);
    expect(ok('MAKE "x 1 IFELSE :x > 3 [FD 10] [FD 20]').final.y).toBe(20);
  });

  it('RANDOM uses the injected random source', () => {
    expect(ok('FD RANDOM 10', () => 0.55).final.y).toBe(5);
  });

  it('respects operator precedence and parentheses', () => {
    expect(ok('FD 2 + 3 * 4').final.y).toBe(14);
    expect(ok('FD (2 + 3) * 4').final.y).toBe(20);
  });
});

describe('colours, pens and printing', () => {
  it('accepts named colours, palette numbers and RGB lists', () => {
    expect(ok('SETPENCOLOR "red').final.color).toBe(NAMED_COLORS['RED']);
    expect(ok('SETPC 4').final.color).toBe(PALETTE_16[4]);
    expect(ok('SETPENCOLOR [255 0 0]').final.color).toBe('#ff0000');
  });

  it('PRINT keeps the words as typed', () => {
    const r = ok('PRINT "Hello PRINT [Hi there] PRINT 7 / 2');
    expect(r.events.filter((e) => e.type === 'print').map((e) => (e as { text: string }).text)).toEqual(['Hello', 'Hi there', '3.5']);
  });

  it('records the source line of every event', () => {
    const r = ok('FD 10\nRT 90\nFD 10');
    expect(r.events.map((e) => e.line)).toEqual([1, 2, 3]);
  });
});

describe('kid-friendly problems', () => {
  it('suggests the closest command for a typo', () => {
    expect(problem('FORWRD 50').message).toBe("I don't know how to FORWRD. Did you mean FORWARD?");
  });

  it('spots a missing space between a command and its number', () => {
    expect(problem('FD50').message).toBe('Put a space between FD and 50, like FD 50.');
  });

  it('reports missing inputs and brackets with a line number', () => {
    expect(problem('FD 10\nFD')).toMatchObject({ line: 2, message: 'FORWARD needs more inputs.' });
    expect(problem('REPEAT 4 [FD 10').message).toBe('The [ after REPEAT needs a matching ] to close it.');
    expect(problem('TO BOX\nFD 10').message).toBe('TO BOX needs an END to finish it.');
  });

  it('explains unknown variables and colours', () => {
    expect(problem('FD :size').message).toBe('I don\'t know :size yet. Make it first with MAKE "size 50.');
    expect(problem('SETPENCOLOR "rde').message).toBe('I don\'t know the colour "rde". Did you mean "red?');
  });

  it('stops runaway programs and keeps what was drawn', () => {
    const res = execute('TO FOREVER\nFD 1\nFOREVER\nEND\nFOREVER');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.problem.message).toContain('called itself');
      expect(res.partial?.events.length).toBeGreaterThan(0);
    }
  });

  it('stops huge loops before the browser freezes', () => {
    expect(problem('REPEAT 1000000 [FD 1 RT 1]').message).toContain("That's a lot of drawing!");
  });

  it('refuses to divide by zero', () => {
    expect(problem('FD 10 / 0').message).toBe("You can't divide by zero.");
  });
});

describe('properties', () => {
  it('a regular polygon of any size and side count returns to its start', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 36 }), fc.integer({ min: 1, max: 300 }), (sides, size) => {
        const r = ok(`REPEAT ${sides} [FD ${size} RT ${360 / sides}]`);
        expect(Math.abs(r.final.x)).toBeLessThan(1e-3);
        expect(Math.abs(r.final.y)).toBeLessThan(1e-3);
        expect(Math.min(r.final.heading, 360 - r.final.heading)).toBeLessThan(1e-3);
      }),
    );
  });

  it('REPEAT n [FD d] travels exactly n × d', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), fc.integer({ min: 0, max: 50 }), (n, d) => {
        expect(ok(`REPEAT ${n} [FD ${d}]`).final.y).toBe(n * d);
      }),
    );
  });

  it('heading always stays within [0, 360)', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom('RT', 'LT'), fc.integer({ min: -10000, max: 10000 })), { maxLength: 30 }), (turns) => {
        const src = turns.map(([cmd, n]) => `${cmd} ${n < 0 ? `(${n})` : n}`).join(' ');
        const h = ok(src).final.heading;
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
      }),
    );
  });

  it('never crashes on random input: it either runs or explains the problem', () => {
    const alphabet = fc.constantFrom(...'FD RT LT REPEAT TO END MAKE :x "y [ ] ( ) + - * / < > = 10 -3 .5 ; \n abc PRINT IF'.split(' '));
    fc.assert(
      fc.property(fc.array(alphabet, { maxLength: 40 }), (parts) => {
        const res = execute(parts.join(' '));
        if (!res.ok) {
          expect(typeof res.problem.message).toBe('string');
          expect(res.problem.line).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('parsing a program twice gives the same result', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 99 }), (n, d) => {
        const src = `TO SHAPE :s\nREPEAT ${n} [FD :s RT ${360 / n}]\nEND\nSHAPE ${d}`;
        const a = check(src);
        const b = check(src);
        expect(a.ok && b.ok).toBe(true);
        expect(JSON.stringify(ok(src).events)).toBe(JSON.stringify(ok(src).events));
      }),
    );
  });
});
