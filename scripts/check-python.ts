/**
 * Proves GIO's Python translations draw the same picture in real CPython turtle.
 * Needs Python 3 with tkinter on PATH as `python`. Run with: npm run check:python
 *
 * For each program it compares the turtle's final position, heading and pen state,
 * and where every arc ends, between GIO's interpreter and Python.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { check, execute, toText, translate, type TurtleEvent } from '../src/logo/index.js';

const PROGRAMS: Record<string, string> = {
  square: 'REPEAT 4 [FD 100 RT 90]',
  star: 'REPEAT 5 [FD 150 RT 144]',
  spiral: 'TO SPIRAL :n\n IF :n > 120 [STOP]\n FD :n RT 91\n SPIRAL :n + 7\nEND\nSPIRAL 5',
  flower: '; Rainbow Flower\nSETPENSIZE 4\nREPEAT 12 [\n  SETPENCOLOR REPCOUNT\n  REPEAT 2 [ARC 60 120 RT 120]\n  RT 30\n]\nSETPENCOLOR "yellow\nCIRCLE 18',
  arc: 'RT 30 ARC 90 100',
  setxy: 'PU SETXY -100 -50 PD SETXY 40 80 SETHEADING 135 FD 30',
  globals: 'MAKE "size 20\nTO GROW\n MAKE "size :size * 2\nEND\nREPEAT 4 [GROW FD :size LT 45]',
  ifelse: 'MAKE "x 3\nREPEAT 6 [IFELSE REPCOUNT > :x [RT 60] [LT 30] FD 40]',
  maths: 'FD 100 - (20 - 5) RT (2 + 3) * 4 FD 10 * SIN 30 BK SQRT 16',
  clearscreen: 'FD 50 RT 90 FD 50 CS FD 25',
  home: 'RT 45 FD 70 HOME FD 10',
  penup: 'PU FD 50 RT 90 FD 20 PD CIRCLE 10 HT',
};

interface PythonState {
  x: number;
  y: number;
  h: number;
  down: boolean;
  arcs: [number, number][];
}

/** GIO draws an arc as lines while the turtle stands still; the last line of each run is where the arc ends. */
function gioArcEnds(events: TurtleEvent[]): [number, number][] {
  const ends: [number, number][] = [];
  let open: [number, number] | null = null;
  for (const e of events) {
    const isArcLine = e.type === 'line' && (e.x2 !== e.state.x || e.y2 !== e.state.y);
    if (isArcLine) {
      open = [e.x2, e.y2];
    } else if (open) {
      ends.push(open);
      open = null;
    }
  }
  if (open) ends.push(open);
  return ends;
}

function instrument(code: string): string {
  return code
    .replace('mode("logo")', 'mode("logo")\ntracer(0)\n_arc_ends = []')
    .replace('    circle(-radius, angle)\n', '    circle(-radius, angle)\n    _arc_ends.append((round(xcor(), 3), round(ycor(), 3)))\n')
    .replace(
      /\ndone\(\)$/,
      '\nimport json\nprint(json.dumps({"x": round(xcor(), 3), "y": round(ycor(), 3), "h": round(heading(), 3) % 360, "down": isdown(), "arcs": _arc_ends}))\nbye()',
    );
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
const nearAngle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 0.05;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-py-'));
let failures = 0;
try {
  for (const [name, source] of Object.entries(PROGRAMS)) {
    const run = execute(source);
    const parsed = check(source);
    if (!run.ok || !parsed.ok) throw new Error(`${name} is not a valid program`);

    const file = path.join(tmp, `${name}.py`);
    fs.writeFileSync(file, instrument(toText(translate(parsed.program, source, 'python'))));
    const py = JSON.parse(execFileSync('python', [file], { encoding: 'utf8' }).trim().split('\n').pop()!) as PythonState;

    const f = run.result.final;
    const arcs = gioArcEnds(run.result.events);
    const stateOk = near(f.x, py.x) && near(f.y, py.y) && nearAngle(f.heading, py.h) && f.penDown === py.down;
    const arcsOk = arcs.length === py.arcs.length && arcs.every(([x, y], k) => near(x, py.arcs[k]![0]) && near(y, py.arcs[k]![1]));
    if (!stateOk || !arcsOk) failures++;
    console.log(`${stateOk && arcsOk ? 'PASS' : 'FAIL'}  ${name.padEnd(12)} final (${py.x}, ${py.y}) heading ${py.h}  arcs ${arcs.length}/${py.arcs.length}`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} program(s) differ from real Python` : '\nAll programs match real Python turtle.');
process.exit(failures ? 1 : 0);
