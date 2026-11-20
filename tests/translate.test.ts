import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { check, toText, translate, type TargetLanguage } from '../src/logo/index.js';

function tr(source: string, language: TargetLanguage) {
  const res = check(source);
  if (!res.ok) throw new Error(res.problem.message);
  return translate(res.program, source, language);
}

const py = (s: string) => toText(tr(s, 'python'));
const js = (s: string) => toText(tr(s, 'javascript'));

describe('Python', () => {
  it('writes a square as a for loop in Logo mode', () => {
    expect(py('REPEAT 4 [FD 100 RT 90]')).toBe(
      ['from turtle import *', '', 'mode("logo")  # start facing up and turn clockwise, like Logo', '', 'for i in range(4):', '    forward(100)', '    right(90)', '', 'done()'].join('\n'),
    );
  });

  it('turns procedures into functions defined before they are used', () => {
    const out = py('SQUARE 50\nTO SQUARE :size\n REPEAT 4 [FD :size RT 90]\nEND');
    expect(out.indexOf('def square(size):')).toBeLessThan(out.indexOf('square(50)'));
    expect(out).toContain('        forward(size)');
  });

  it('counts from 1 when the loop uses REPCOUNT', () => {
    expect(py('REPEAT 3 [FD REPCOUNT * 10]')).toContain('for i in range(1, 4):\n    forward(i * 10)');
  });

  it('gives nested loops different variables', () => {
    const out = py('REPEAT 2 [REPEAT 3 [FD REPCOUNT]]');
    expect(out).toContain('for i in range(2):');
    expect(out).toContain('    for j in range(1, 4):');
    expect(out).toContain('        forward(j)');
  });

  it('declares globals that a function changes', () => {
    const out = py('MAKE "size 10\nTO GROW\n MAKE "size :size + 10\nEND\nGROW');
    expect(out).toContain('def grow():\n    global size\n    size = size + 10');
  });

  it('keeps comments next to the code they describe', () => {
    const out = py('; Big Square\nREPEAT 4 [\n ; one side\n FD 100 RT 90\n]');
    expect(out).toContain('# Big Square\nfor i in range(4):\n    # one side\n    forward(100)');
  });

  it('keeps friendly colour names and explains hex codes', () => {
    expect(py('SETPENCOLOR "red')).toContain('pencolor("red")');
    expect(py('SETPENCOLOR "teal')).toContain('pencolor("#14b8a6")  # teal');
    expect(py('SETPC 4')).toContain('pencolor("#ef4444")  # colour 4');
    expect(py('SETPENCOLOR [255 128 0]')).toContain('pencolor("#ff8000")');
  });

  it('uses a palette helper when the colour is computed', () => {
    const out = py('REPEAT 3 [SETPENCOLOR REPCOUNT FD 10]');
    expect(out).toContain('def palette(n):');
    expect(out).toContain('pencolor(palette(i))');
  });

  it('adds an arc helper that matches Logo, only when needed', () => {
    expect(py('FD 10')).not.toContain('logo_arc');
    const out = py('CIRCLE 40 ARC 90 20');
    expect(out).toContain('def logo_arc(angle, radius):');
    expect(out).toContain('logo_arc(360, 40)');
    expect(out).toContain('logo_arc(90, 20)');
  });

  it('imports only what the program uses', () => {
    expect(py('FD RANDOM 10')).toContain('from random import randrange');
    expect(py('FD SQRT 16')).toContain('from math import sqrt, sin, cos, radians');
    expect(py('FD 1')).not.toContain('import randrange');
  });

  it('writes if / else and comparisons the Python way', () => {
    const out = py('MAKE "x 5\nIFELSE :x = 5 [FD 10] [BK 10]');
    expect(out).toContain('if x == 5:\n    forward(10)\nelse:\n    back(10)');
  });

  it('renames names that would clash with Python', () => {
    expect(py('TO FOR :in\nFD :in\nEND\nFOR 5')).toContain('def for_(in_):');
  });

  it('keeps brackets that change the meaning of maths', () => {
    expect(py('FD 100 - (20 - 5)')).toContain('forward(100 - (20 - 5))');
    expect(py('FD (2 + 3) * 4')).toContain('forward((2 + 3) * 4)');
    expect(py('FD 2 + 3 * 4')).toContain('forward(2 + 3 * 4)');
  });

  it('prints lists of words as text', () => {
    expect(py('PRINT [Hello there]')).toContain('print("Hello there")');
  });
});

describe('JavaScript', () => {
  it('writes a square with a for loop and semicolons', () => {
    expect(js('REPEAT 4 [FD 100 RT 90]')).toContain('for (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}');
  });

  it('turns procedures into functions', () => {
    expect(js('TO STAR :s\nREPEAT 5 [FD :s RT 144]\nEND\nSTAR 80')).toContain('function star(s) {');
  });

  it('declares variables with let and compares with ===', () => {
    const out = js('MAKE "x 3\nIF :x = 3 [FD 10]');
    expect(out).toContain('let x = 3;');
    expect(out).toContain('if (x === 3) {');
  });

  it('declares globals changed by functions before anything runs', () => {
    const out = js('TO GROW\n MAKE "size 10\nEND\nGROW\nMAKE "size 20');
    expect(out.indexOf('let size;')).toBeLessThan(out.indexOf('grow();'));
    expect(out).toContain('size = 20;');
    expect(out).not.toContain('let size = 20');
  });

  it('uses Math for RANDOM and trigonometry', () => {
    expect(js('FD RANDOM 10')).toContain('forward(Math.floor(Math.random() * 10));');
    expect(js('FD 10 * SIN 30')).toContain('Math.sin(30 * Math.PI / 180)');
  });
});

describe('line mapping', () => {
  it('tags translated lines with the Logo line they came from', () => {
    const t = tr('FD 10\nRT 90\nREPEAT 2 [\n  FD 5\n]', 'python');
    const lineOf = (text: string) => t.lines.find((l) => l.text.trim() === text)?.src;
    expect(lineOf('forward(10)')).toBe(1);
    expect(lineOf('right(90)')).toBe(2);
    expect(lineOf('for i in range(2):')).toBe(3);
    expect(lineOf('forward(5)')).toBe(4);
  });
});

describe('properties', () => {
  const programs = fc
    .array(
      fc.oneof(
        fc.integer({ min: 0, max: 200 }).map((n) => `FD ${n}`),
        fc.integer({ min: -360, max: 360 }).map((n) => `RT ${n < 0 ? `(${n})` : n}`),
        fc.constantFrom('PU', 'PD', 'HOME', 'SETPENCOLOR "blue', 'SETPC 3', 'CIRCLE 20', 'MAKE "a 4', 'PRINT [hi]'),
        fc.tuple(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 90 })).map(([n, d]) => `REPEAT ${n} [FD ${d} RT REPCOUNT * 10]`),
      ),
      { maxLength: 15 },
    )
    .map((parts) => parts.join('\n'));

  it('every valid program translates, and every statement line appears in both languages', () => {
    fc.assert(
      fc.property(programs, (source) => {
        for (const language of ['python', 'javascript'] as const) {
          const t = tr(source, language);
          const mapped = new Set(t.lines.map((l) => l.src).filter((s): s is number => s !== undefined));
          source.split('\n').forEach((line, k) => {
            if (line.trim()) expect(mapped.has(k + 1)).toBe(true);
          });
        }
      }),
    );
  });

  it('Python indentation is always a multiple of four spaces and blocks are never empty', () => {
    fc.assert(
      fc.property(programs, (source) => {
        const lines = tr(source, 'python').lines.map((l) => l.text);
        lines.forEach((text, k) => {
          const indent = text.length - text.trimStart().length;
          expect(indent % 4).toBe(0);
          if (text.trimEnd().endsWith(':')) {
            const next = lines.slice(k + 1).find((l) => l.trim() !== '');
            expect(next && next.length - next.trimStart().length).toBeGreaterThan(indent);
          }
        });
      }),
    );
  });

  it('JavaScript braces always balance', () => {
    fc.assert(
      fc.property(programs, (source) => {
        const text = js(source);
        expect((text.match(/{/g) ?? []).length).toBe((text.match(/}/g) ?? []).length);
      }),
    );
  });
});

describe('music, waits and frames', () => {
  it('adds no helpers to programs that do not use these commands', () => {
    const out = py('REPEAT 4 [FD 100 RT 90]');
    for (const word of ['sleep', 'winsound', 'play', 'tracer', 'note_hz']) expect(out).not.toContain(word);
  });
  it('adds the music helpers only when PLAY is used', () => {
    const out = py('PLAY [C D]');
    expect(out).toContain('from time import sleep');
    expect(out).toContain('from winsound import Beep');
    expect(out).toContain('Beep = None');
    expect(out).toContain("# CPython's turtle has no sound");
    expect(out).toContain('def note_hz(word):');
    expect(out).toContain('def play(tune):');
    expect(out).not.toContain('def wait(n)');
    expect(out).not.toContain('def frame()');
    expect(out).not.toContain('tracer(0)');
  });
  it('passes a literal list, a quoted word and a variable to play()', () => {
    expect(py('PLAY [C D E 2 R F# 0.5]')).toContain('play(["C", "D", "E", 2, "R", "F#", 0.5])');
    expect(py('PLAY "C')).toContain('play("C")');
    expect(py('MAKE "tune [C E G]\nPLAY :tune')).toContain('play(tune)');
  });
  it('writes tempo, wait and frame lines', () => {
    const out = py('SETTEMPO 90\nWAIT 30\nFRAME');
    expect(out).toContain('settempo(90)');
    expect(out).toContain('wait(30)');
    expect(out).toContain('frame()');
    expect(out).toContain('def wait(n):\n    sleep(n / 60)');
    expect(out).toContain('def frame():\n    update()\n    sleep(0.25)');
  });
  it('writes tracer(0) after mode only when frames are used', () => {
    expect(py('FRAME')).toContain('mode("logo")  # start facing up and turn clockwise, like Logo\ntracer(0)');
    expect(py('WAIT 5')).not.toContain('tracer(0)');
    expect(py('PLAY [C]')).not.toContain('tracer(0)');
  });
  it('renames kid variables that would shadow the helpers', () => {
    const out = py('MAKE "wait 5\nFD :wait\nPLAY [C]');
    expect(out).toContain('wait_ = 5');
    expect(out).toContain('forward(wait_)');
    expect(py('MAKE "frame 1\nMAKE "play 2\nMAKE "update 3\nWAIT 1')).toContain('update_ = 3');
    expect(js('MAKE "wait 5\nFD :wait\nPLAY [C]')).toContain('let wait_ = 5;');
  });
  it('writes JavaScript calls', () => {
    const out = js('SETTEMPO 90\nPLAY [C D E 2]\nWAIT 30\nFRAME');
    expect(out).toContain('setTempo(90);');
    expect(out).toContain('play(["C", "D", "E", 2]);');
    expect(out).toContain('wait(30);');
    expect(out).toContain('frame();');
    expect(out).not.toContain('sleep');
  });
  it('maps the new lines back to their Logo lines', () => {
    const t = tr('FD 10\nSETTEMPO 90\nPLAY [C]\nWAIT 5\nFRAME', 'python');
    const lineOf = (text: string) => t.lines.find((l) => l.text.trim() === text)?.src;
    expect(lineOf('settempo(90)')).toBe(2);
    expect(lineOf('play(["C"])')).toBe(3);
    expect(lineOf('wait(5)')).toBe(4);
    expect(lineOf('frame()')).toBe(5);
    const j = tr('PLAY [C]\nFRAME', 'javascript');
    expect(j.lines.find((l) => l.text === 'play(["C"]);')?.src).toBe(1);
    expect(j.lines.find((l) => l.text === 'frame();')?.src).toBe(2);
  });
});