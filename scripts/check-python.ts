/**
 * Proves GIO's Python translations draw the same picture in real CPython turtle.
 * Needs Python 3 with tkinter on PATH as `python`. Run with: npm run check:python
 *
 * For each program it compares the turtle's final position, heading and pen state,
 * and where every arc ends, between GIO's interpreter and Python.
 * It also compares the timeline of music and pauses: every tone, every wait, every frame.
 * Python never really beeps or sleeps here: a recorder stands in for winsound and time.sleep.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { check, press, start, toText, translate, type GameKey, type TurtleEvent } from '../src/logo/index.js';
import { PRESSES, PROGRAMS } from './check-programs.js';

type Recorded = ['tone', number, number] | ['sleep', number];

interface PythonState {
  x: number;
  y: number;
  h: number;
  down: boolean;
  arcs: [number, number][];
  rec: Recorded[];
  frames: number;
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

/** One entry of the timeline: a tone (hz is a whole number) or a hold (hz is null) with its seconds. */
type Slot = [hz: number | null, seconds: number];

/** Adjacent holds are merged and every length is rounded to 3 decimals, so both sides compare cleanly. */
function flatten(slots: Slot[]): Slot[] {
  const merged: Slot[] = [];
  for (const [hz, seconds] of slots) {
    const last = merged[merged.length - 1];
    if (hz === null && last && last[0] === null) last[1] += seconds;
    else merged.push([hz, seconds]);
  }
  return merged.filter(([hz, seconds]) => hz !== null || seconds > 0).map(([hz, seconds]) => [hz, Math.round(seconds * 1000) / 1000]);
}

/** The timeline GIO's interpreter promises. With `beep`, notes are tones; without it (no winsound) they are holds. */
function gioTimeline(events: TurtleEvent[], beep: boolean): Slot[] {
  const slots: Slot[] = [];
  for (const e of events) {
    if (e.type === 'wait') slots.push([null, e.seconds]);
    if (e.type !== 'play') continue;
    for (const tone of e.tones) {
      if (beep && tone.hz !== null) slots.push([Math.round(tone.hz), Math.round(tone.seconds * 1000) / 1000]);
      else slots.push([null, tone.seconds]);
    }
  }
  return flatten(slots);
}

function pythonTimeline(rec: Recorded[]): Slot[] {
  return flatten(rec.map((r): Slot => (r[0] === 'tone' ? [r[1], r[2]] : [null, r[1]])));
}

/**
 * Real Python runs the translated program with a recorder installed before the program's own header:
 * a stand-in winsound (or none, to test the branch for other systems), a time.sleep that only writes down
 * how long it was asked to sleep, and an update() that counts frames.
 */
function instrument(code: string, presses: GameKey[], beep: boolean): string {
  // After game_over() Python unbinds the keys and stops the clock, so presses only count while the game is on.
  const calls = presses.map((k) => `if globals().get("_playing", True): on_${k.toLowerCase()}()`).join('\n');
  const prelude = [
    'import sys, time, types',
    '_rec = []',
    '_frames = [0]',
    'time.sleep = lambda seconds: _rec.append(["sleep", seconds])',
    beep
      ? '_ws = types.ModuleType("winsound")\n_ws.Beep = lambda hz, ms: _rec.append(["tone", hz, ms / 1000])\nsys.modules["winsound"] = _ws'
      : 'sys.modules["winsound"] = None',
    '_real_update = update',
    'def update():',
    '    _frames[0] += 1',
    '    _real_update()',
  ].join('\n');
  return code
    .replace('from turtle import *', `from turtle import *\n${prelude}`)
    .replace('mode("logo")', 'mode("logo")\ntracer(0)\n_arc_ends = []')
    // The test presses keys and ticks itself, so don't start Python's own game clock.
    .replace('\n_tick()  # start the game clock', '')
    // The final update() only shows the last picture; it is not a frame the program asked for.
    .replace('\nupdate()  # show the last picture', '')
    .replace('    circle(-radius, angle)\n', '    circle(-radius, angle)\n    _arc_ends.append((round(xcor(), 3), round(ycor(), 3)))\n')
    .replace(
      /\ndone\(\)$/,
      `\n${calls}\nimport json\nprint(json.dumps({"x": round(xcor(), 3), "y": round(ycor(), 3), "h": round(heading(), 3) % 360, "down": isdown(), "arcs": _arc_ends, "rec": _rec, "frames": _frames[0]}))\nbye()`,
    );
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
const nearAngle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 0.05;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-py-'));
let failures = 0;

function verify(name: string, beep: boolean): void {
  const source = PROGRAMS[name]!;
  const presses = PRESSES[name] ?? [];
  const started = start(source);
  const parsed = check(source);
  if (!started.ok || !parsed.ok) throw new Error(`${name} is not a valid program`);
  const events = [...started.result.events];
  for (const key of presses) {
    const r = press(started.session, key);
    if (!r.ok) throw new Error(`${name}: ${r.problem.message}`);
    events.push(...r.events);
  }
  const final = events.length ? events[events.length - 1]!.state : started.result.final;

  const file = path.join(tmp, `${name}${beep ? '' : '-no-winsound'}.py`);
  fs.writeFileSync(file, instrument(toText(translate(parsed.program, source, 'python')), presses, beep));
  const py = JSON.parse(execFileSync('python', [file], { encoding: 'utf8' }).trim().split('\n').pop()!) as PythonState;

  const arcs = gioArcEnds(events);
  const stateOk = near(final.x, py.x) && near(final.y, py.y) && nearAngle(final.heading, py.h) && final.penDown === py.down;
  const arcsOk = arcs.length === py.arcs.length && arcs.every(([x, y], k) => near(x, py.arcs[k]![0]) && near(y, py.arcs[k]![1]));
  const gioSlots = gioTimeline(events, beep);
  const pySlots = pythonTimeline(py.rec);
  const gioFrames = events.filter((e) => e.type === 'frame').length;
  const timelineOk = JSON.stringify(gioSlots) === JSON.stringify(pySlots) && gioFrames === py.frames;
  const ok = stateOk && arcsOk && timelineOk;
  if (!ok) failures++;

  const label = beep ? name : `${name} (no winsound)`;
  const extras = [presses.length ? `${presses.length} key presses` : '', gioSlots.length || gioFrames ? `timeline ${gioSlots.length}/${pySlots.length} slots, frames ${gioFrames}/${py.frames}` : '']
    .filter(Boolean)
    .join(', ');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(20)} final (${py.x}, ${py.y}) heading ${py.h}  arcs ${arcs.length}/${py.arcs.length}${extras ? `  (${extras})` : ''}`);
  if (!timelineOk) console.log(`      GIO    ${JSON.stringify(gioSlots)} frames ${gioFrames}\n      Python ${JSON.stringify(pySlots)} frames ${py.frames}`);
}

try {
  for (const name of Object.keys(PROGRAMS)) verify(name, true);
  // The same tune where winsound does not exist (macOS, Linux): every note becomes a plain wait.
  verify('tune', false);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} program(s) differ from real Python` : '\nAll programs match real Python turtle.');
process.exit(failures ? 1 : 0);
