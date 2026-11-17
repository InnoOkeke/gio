import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { check, execute, press, start, toText, translate, type GameKey } from '../src/logo/index.js';
import { checkQuest, QUESTS } from '../src/logo/quests.js';

function game(source: string) {
  const s = start(source);
  if (!s.ok) throw new Error(s.problem.message);
  return s;
}

describe('WHEN and key presses', () => {
  it('registers handlers without running them', () => {
    const g = game('FD 10\nWHEN "up [FD 20]');
    expect(g.result.final.y).toBe(10);
    expect(g.session.keys).toEqual(['UP']);
  });

  it('each press continues from where the turtle is', () => {
    const g = game('WHEN "up [FD 20]\nWHEN "right [RT 90]');
    press(g.session, 'UP');
    press(g.session, 'RIGHT');
    const last = press(g.session, 'UP');
    expect(last.ok && last.events[last.events.length - 1]!.state).toMatchObject({ x: 20, y: 20, heading: 90 });
  });

  it('keeps variables and procedures alive between presses', () => {
    const g = game('MAKE "step 5\nTO GO\nFD :step\nMAKE "step :step + 5\nEND\nWHEN "space [GO]');
    press(g.session, 'SPACE');
    press(g.session, 'SPACE');
    const r = press(g.session, 'SPACE');
    expect(r.ok && r.events[0]!.state.y).toBe(30);
  });

  it('pressing a key with no handler does nothing', () => {
    const g = game('WHEN "up [FD 1]');
    expect(press(g.session, 'DOWN')).toEqual({ ok: true, events: [] });
  });

  it('a problem in a handler is reported with its line, and the game keeps working', () => {
    const g = game('WHEN "up [FD :missing]\nWHEN "down [BK 5]');
    const r = press(g.session, 'UP');
    expect(r).toMatchObject({ ok: false, problem: { line: 1 } });
    expect(press(g.session, 'DOWN').ok).toBe(true);
  });

  it('each press has its own runaway limit', () => {
    const g = game('WHEN "up [REPEAT 100000 [FD 1 RT 1]]');
    const r = press(g.session, 'UP');
    expect(r.ok).toBe(false);
  });

  it('STOP inside a handler ends just that press', () => {
    const g = game('WHEN "up [FD 5 STOP FD 100]');
    const r = press(g.session, 'UP');
    expect(r.ok && r.events.length).toBe(1);
  });

  it('explains a WHEN without a valid key', () => {
    const r = execute('WHEN "jump [FD 10]');
    expect(!r.ok && r.problem.message).toBe('WHEN needs a key: "up, "down, "left, "right or "space, like WHEN "up [FD 10]. Or use WHEN "tick to do something 10 times a second.');
  });

  it('explains that names cannot contain a dash', () => {
    const expected = "Names can't have a dash (-) in them, because - means minus. Try DRAW_CIRCLE instead.";
    const a = execute('TO DRAW-CIRCLE\nCIRCLE 10\nEND');
    expect(!a.ok && a.problem.message).toBe(expected);
    const b = execute('DRAW-CIRCLE');
    expect(!b.ok && b.problem.message).toBe(expected);
    expect(execute('MAKE "a 5 FD :a-2').ok).toBe(true);
  });

  it('a program without WHEN is not a game', () => {
    expect(game('FD 10').session.keys).toEqual([]);
  });

  it('pressing keys never crashes, whatever the order', () => {
    const g = () => game('MAKE "n 0\nWHEN "up [FD 10 MAKE "n :n + 1]\nWHEN "left [LT 45]\nWHEN "right [RT 45]\nWHEN "down [BK 10]\nWHEN "space [IF :n > 3 [HOME]]');
    fc.assert(
      fc.property(fc.array(fc.constantFrom<GameKey>('UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'), { maxLength: 60 }), (keys) => {
        const s = g();
        for (const k of keys) expect(press(s.session, k).ok).toBe(true);
      }),
    );
  });
});

describe('games in Python and JavaScript', () => {
  const src = 'MAKE "step 10\nWHEN "up [FD :step MAKE "step :step + 1]\nWHEN "left [LT 90]';
  const parsed = check(src);
  if (!parsed.ok) throw new Error('bad test program');

  it('Python uses real turtle key events and listens for them', () => {
    const py = toText(translate(parsed.program, src, 'python'));
    expect(py).toContain('def on_up():\n    global step\n    forward(step)\n    step = step + 1\nonkey(on_up, "Up")');
    expect(py).toContain('onkey(on_left, "Left")');
    expect(py).toContain('listen()  # start listening for the keys\ndone()');
  });

  it('renames variables that would clash with turtle functions', () => {
    const s = 'MAKE "speed 10\nWHEN "up [FD :speed]';
    const p = check(s);
    expect(p.ok && toText(translate(p.program, s, 'python'))).toContain('forward(speed_)');
  });

  it('JavaScript uses event handlers', () => {
    const js = toText(translate(parsed.program, src, 'javascript'));
    expect(js).toContain('onKey("up", () => {\n  forward(step);\n  step = step + 1;\n});');
  });
});

describe('game quests', () => {
  it('reject a program that only draws the picture without key controls', () => {
    const q = QUESTS.find((x) => x.id === 'c-game')!;
    expect(checkQuest(q, 'FD 20 RT 90 FD 20 RT 90 FD 20').pass).toBe(false);
  });

  it('reject controls that move the wrong way', () => {
    const q = QUESTS.find((x) => x.id === 'c-sketch')!;
    expect(checkQuest(q, 'WHEN "up [FD 10]\nWHEN "down [BK 10]\nWHEN "left [LT 90 FD 10]\nWHEN "right [RT 90 FD 10]').pass).toBe(false);
  });
});
