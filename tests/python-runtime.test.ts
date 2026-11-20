/**
 * Runs GIO's real Python (Pyodide, loaded once) with GIO's own turtle shim, using the same three Python files the
 * browser worker loads, and proves it draws what the Logo interpreter draws for every program in check-programs.
 */
import fs from 'fs';
import path from 'path';
import { loadPyodide } from 'pyodide';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sameDrawing } from '../src/logo/compare.js';
import { check, press, start, toText, translate, type RunResult, type TurtleEvent } from '../src/logo/index.js';
import { installShim, type PyodideLike, type PythonCalls } from '../src/ui/python/shim.js';
import { validateEvents, validateReady } from '../src/ui/python/protocol.js';
import { PRESSES, PROGRAMS } from '../scripts/check-programs.js';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 180_000 });

const shimDir = path.join(process.cwd(), 'src', 'ui', 'runtime', 'python');
const source = (name: string) => fs.readFileSync(path.join(shimDir, name), 'utf8');

interface Ready {
  keys: string[];
  ticks: { id: number; ms: number }[];
}
interface Answer {
  events: TurtleEvent[];
  error: { message: string; line: number } | null;
  ready: Ready;
}

let calls: PythonCalls;

beforeAll(async () => {
  const py = (await loadPyodide({ indexURL: path.join(process.cwd(), 'node_modules', 'pyodide') })) as unknown as PyodideLike;
  calls = installShim(py, { turtle: source('turtle.py'), winsound: source('winsound.py'), boot: source('boot.py') });
});

afterAll(() => {
  /* the Pyodide instance is dropped with the worker thread */
});

const answer = (text: string) => JSON.parse(text) as Answer;
const runPy = (code: string) => answer(calls.run(code));

type Slot = [hz: number | null, seconds: number];
function flatten(slots: Slot[]): Slot[] {
  const merged: Slot[] = [];
  for (const [hz, seconds] of slots) {
    const last = merged[merged.length - 1];
    if (hz === null && last && last[0] === null) last[1] += seconds;
    else merged.push([hz, seconds]);
  }
  return merged.filter(([hz, seconds]) => hz !== null || seconds > 0).map(([hz, seconds]) => [hz, Math.round(seconds * 1000) / 1000]);
}
/** play, wait and frame events as one list of tones and holds. The interpreter and Python split them differently. */
function timeline(events: TurtleEvent[]): { slots: Slot[]; frames: number } {
  const slots: Slot[] = [];
  for (const e of events) {
    if (e.type === 'wait') slots.push([null, e.seconds]);
    if (e.type !== 'play') continue;
    for (const tone of e.tones) slots.push(tone.hz === null ? [null, tone.seconds] : [Math.round(tone.hz), tone.seconds]);
  }
  return { slots: flatten(slots), frames: events.filter((e) => e.type === 'frame').length };
}

const INITIAL = { x: 0, y: 0, heading: 0, penDown: true };
const finalOf = (events: TurtleEvent[]) => (events.length ? events[events.length - 1]!.state : { ...INITIAL });
const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) < tol;
const nearAngle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 0.05;
const asResult = (events: TurtleEvent[]): RunResult => ({ events, final: finalOf(events) as RunResult['final'], background: '#ffffff' });

/** Arcs and circles are polygons in CPython, so those programs are compared by their size and ink, not segment by segment. */
function inkSummary(events: TurtleEvent[]) {
  let length = 0;
  const xs: number[] = [];
  const ys: number[] = [];
  let live: TurtleEvent[] = [];
  for (const e of events) {
    if (e.type === 'clear') live = [];
    else if (e.type === 'line') live.push(e);
  }
  for (const e of live) {
    if (e.type !== 'line') continue;
    length += Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
    xs.push(e.x1, e.x2);
    ys.push(e.y1, e.y2);
  }
  return { length, box: live.length ? [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] : [0, 0, 0, 0] };
}

function gioRun(name: string) {
  const src = PROGRAMS[name]!;
  const started = start(src);
  if (!started.ok) throw new Error(`${name} does not run`);
  const events = [...started.result.events];
  for (const key of PRESSES[name] ?? []) {
    const r = press(started.session, key);
    if (!r.ok) throw new Error(`${name}: ${r.problem.message}`);
    events.push(...r.events);
  }
  return events;
}

function pythonRun(name: string) {
  const src = PROGRAMS[name]!;
  const parsed = check(src);
  if (!parsed.ok) throw new Error(`${name} does not parse`);
  // The final update() only shows the last picture; it is not a frame the program asked for (check-python does the same).
  const code = toText(translate(parsed.program, src, 'python')).replace('\nupdate()  # show the last picture', '');
  const first = answer(calls.run(code));
  if (first.error) throw new Error(`${name}: ${first.error.message} (line ${first.error.line})`);
  const events = [...first.events];
  let ready = first.ready;
  for (const key of PRESSES[name] ?? []) {
    const next = answer(key === 'TICK' ? calls.fire(ready.ticks[0]?.id ?? -1) : calls.press(key));
    if (next.error) throw new Error(`${name}: ${next.error.message}`);
    events.push(...next.events);
    ready = next.ready;
  }
  return events;
}

describe('every program in check-programs draws the same through Pyodide as through the interpreter', () => {
  for (const name of Object.keys(PROGRAMS)) {
    it(name, () => {
      const gio = gioRun(name);
      const py = pythonRun(name);
      const a = finalOf(gio);
      const b = finalOf(py);
      expect(near(a.x, b.x)).toBe(true);
      expect(near(a.y, b.y)).toBe(true);
      expect(nearAngle(a.heading, b.heading)).toBe(true);
      expect(a.penDown).toBe(b.penDown);
      const curved = /\b(ARC|CIRCLE)\b/i.test(PROGRAMS[name]!) || (PRESSES[name] ?? []).includes('SPACE');
      if (curved) {
        const x = inkSummary(gio);
        const y = inkSummary(py);
        expect(Math.abs(x.length - y.length) / Math.max(x.length, 1)).toBeLessThan(0.02);
        x.box.forEach((v, k) => expect(Math.abs(v - y.box[k]!)).toBeLessThan(2));
      } else {
        expect(sameDrawing(asResult(gio), asResult(py))).toBe(true);
      }
      const dots = (events: TurtleEvent[]) => events.filter((e) => e.type === 'dot').map((e) => (e.type === 'dot' ? [e.x, e.y, e.r, e.color] : []));
      expect(dots(py)).toEqual(dots(gio));
      const shows = (events: TurtleEvent[]) => events.filter((e) => e.type === 'show').map((e) => (e.type === 'show' ? e.text : ''));
      expect(shows(py)).toEqual(shows(gio));
      expect(timeline(py)).toEqual(timeline(gio));
    });
  }
});

describe('what the frame sends is safe to draw', () => {
  it('every event the shim makes passes validateEvents untouched', () => {
    for (const name of Object.keys(PROGRAMS)) {
      const py = pythonRun(name);
      const { events, dropped } = validateEvents(py);
      expect(dropped).toBe(0);
      expect(events.length).toBe(py.length);
    }
  });
  it('validateReady keeps only real keys', () => {
    const r = runPy('from turtle import *\nonkey(lambda: forward(1), "Up")\nontimer(lambda: None, 50)\n');
    expect(validateReady(r.ready)).toEqual({ keys: ['UP'], ticks: [{ id: expect.any(Number), ms: 50 }] });
  });
});

describe('the turtle shim', () => {
  it('standard mode starts facing east and counts heading counter-clockwise', () => {
    const r = runPy('from turtle import *\nforward(10)\nleft(90)\nforward(10)\nprint(heading())\nsetheading(0)\nforward(5)\nprint(heading(), pos())\n');
    expect(r.error).toBeNull();
    const lines = r.events.filter((e) => e.type === 'line');
    expect(lines[0]).toMatchObject({ x2: 10, y2: 0 });
    expect(lines[1]).toMatchObject({ x2: 10, y2: 10 });
    const prints = r.events.filter((e) => e.type === 'print').map((e) => (e.type === 'print' ? e.text : ''));
    expect(prints[0]).toBe('90.0');
    expect(prints[1]).toBe('0.0 (15.0, 10.0)');
  });
  it('logo mode faces up and turns clockwise', () => {
    const r = runPy('from turtle import *\nmode("logo")\nforward(10)\nright(90)\nforward(10)\nprint(heading())\n');
    expect(r.events.filter((e) => e.type === 'line').map((e) => (e.type === 'line' ? [e.x2, e.y2] : []))).toEqual([[0, 10], [10, 10]]);
    expect(r.events.find((e) => e.type === 'print')).toMatchObject({ text: '90.0' });
  });
  it('a call GIO cannot do raises a plain error with the line', () => {
    const r = runPy('from turtle import *\nbegin_fill()\n');
    expect(r.error).toEqual({ message: "GIO's turtle can't do begin_fill yet.", line: 2 });
    const t = runPy('import turtle\nturtle.Turtle().stamp()\n');
    expect(t.error?.message).toBe("GIO's turtle can't do stamp yet.");
  });
  it('errors in a child program name the Python line', () => {
    const r = runPy('from turtle import *\nforward(10)\nbackwards(5)\n');
    expect(r.error?.message).toContain("NameError: name 'backwards' is not defined");
    expect(r.error?.line).toBe(3);
    expect(r.events.length).toBe(1);
    const s = runPy('forward(10\n');
    expect(s.error?.message).toMatch(/^SyntaxError/);
  });
  it('a second turtle can write and stay hidden but cannot draw', () => {
    const ok = runPy('from turtle import *\nforward(10)\nb = Turtle()\nb.hideturtle()\nb.penup()\nb.goto(-200, 200)\nb.write("score 3")\n');
    expect(ok.error).toBeNull();
    expect(ok.events.map((e) => e.type)).toEqual(['line', 'show']);
    expect(ok.events[1]).toMatchObject({ type: 'show', text: 'score 3' });
    const bad = runPy('from turtle import *\nforward(10)\nb = Turtle()\nb.forward(50)\n');
    expect(bad.error?.message).toContain('one drawing turtle');
    expect(bad.error?.line).toBe(4);
  });
  it('the first Turtle() that draws is the stage turtle', () => {
    const r = runPy('from turtle import Turtle\nt = Turtle()\nt.color("red")\nt.forward(30)\n');
    expect(r.error).toBeNull();
    expect(r.events[0]).toMatchObject({ type: 'line', color: '#ef4444', x2: 30 });
  });
  it('time.sleep becomes a wait event without blocking', () => {
    const t0 = Date.now();
    const r = runPy('import time\nfrom turtle import *\nforward(1)\ntime.sleep(5)\ntime.sleep(0.5)\n');
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(r.events.filter((e) => e.type === 'wait').map((e) => (e.type === 'wait' ? e.seconds : 0))).toEqual([5, 0.5]);
  });
  it('winsound.Beep becomes a play event and checks its range like CPython', () => {
    const r = runPy('import winsound\nwinsound.Beep(440, 250)\n');
    expect(r.events[0]).toMatchObject({ type: 'play', tones: [{ hz: 440, seconds: 0.25 }] });
    expect(runPy('import winsound\nwinsound.Beep(20, 100)\n').error?.message).toContain('37 thru 32767');
    expect(runPy('import winsound\nwinsound.Beep(9000, 500)\n').error?.message).toContain('up to 8000 hertz');
  });
  it('setup and screensize stop with a plain message instead of doing nothing', () => {
    expect(runPy('import turtle\nturtle.setup(800, 800)\n').error?.message).toBe("GIO's turtle can't do setup yet.");
    expect(runPy('import turtle\nturtle.Screen().screensize(500, 500)\n').error?.message).toBe("GIO's turtle can't do screensize yet.");
  });
  it('update() is a frame only when tracer(0) is on', () => {
    expect(runPy('from turtle import *\nupdate()\n').events).toEqual([]);
    expect(runPy('from turtle import *\ntracer(0)\nupdate()\n').events.map((e) => e.type)).toEqual(['frame']);
  });
  it('onkey and ontimer handlers run when the host presses and fires', () => {
    const r = runPy('from turtle import *\nmode("logo")\ndef go():\n    forward(10)\n    ontimer(go, 200)\nonkey(go, "Up")\nonkey(lambda: right(90), "space")\nontimer(go, 100)\n');
    expect(r.ready.keys).toEqual(['UP', 'SPACE']);
    expect(r.ready.ticks).toHaveLength(1);
    expect(r.ready.ticks[0]!.ms).toBe(100);
    const k = answer(calls.press('SPACE'));
    expect(k.events[0]).toMatchObject({ type: 'turn', state: { heading: 90 } });
    const t = answer(calls.fire(r.ready.ticks[0]!.id));
    expect(t.events[0]).toMatchObject({ type: 'line', x2: 10, y2: 0 });
    expect(t.ready.ticks).toHaveLength(1);
    expect(t.ready.ticks[0]!.ms).toBe(200);
    expect(answer(calls.press('LEFT')).events).toEqual([]);
    // A timer that already fired is gone.
    expect(answer(calls.fire(r.ready.ticks[0]!.id)).events).toEqual([]);
  });
  it('stops at 20000 events with a plain message', () => {
    const r = runPy('from turtle import *\nwhile True:\n    forward(1)\n');
    expect(r.events).toHaveLength(20000);
    expect(r.error?.message).toContain('too many steps');
    expect(r.error?.line).toBe(3);
  });
  it('a show longer than 3 minutes stops', () => {
    const r = runPy('import time\ntime.sleep(100)\ntime.sleep(100)\n');
    expect(r.error?.message).toContain('3 minutes');
  });
  it('print() writes a line event and input() explains itself', () => {
    const r = runPy('print("hello")\nprint("a", 1)\ninput("name? ")\n');
    expect(r.events.map((e) => (e.type === 'print' ? e.text : '?'))).toEqual(['hello', 'a 1']);
    expect(r.error?.message).toContain('input()');
  });
  it('colours: names, hex codes and number triples; unknown names explain themselves', () => {
    const r = runPy('from turtle import *\ncolormode(255)\npencolor("#ABC")\nforward(1)\npencolor(255, 128, 0)\nforward(1)\npencolor("sky")\nforward(1)\n');
    expect(r.events.filter((e) => e.type === 'line').map((e) => (e.type === 'line' ? e.color : ''))).toEqual(['#aabbcc', '#ff8000', '#38bdf8']);
    expect(runPy('from turtle import *\npencolor("mauve")\n').error?.message).toContain("I don't know the colour");
  });
  it('every run starts fresh', () => {
    runPy('from turtle import *\nforward(100)\nonkey(lambda: forward(1), "Up")\n');
    const r = runPy('from turtle import *\nforward(1)\n');
    expect(r.events[0]).toMatchObject({ type: 'line', x1: 0, x2: 1 });
    expect(r.ready.keys).toEqual([]);
  });
});
