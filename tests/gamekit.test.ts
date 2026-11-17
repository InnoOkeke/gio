import { describe, it, expect } from 'vitest';
import { check, execute, press, start, toText, translate } from '../src/logo/index.js';

function game(source: string) {
  const s = start(source);
  if (!s.ok) throw new Error(s.problem.message);
  return s;
}

/** A small "catch the apple" game, the kind the turtle helper should be able to write. */
const CATCH = [
  'MAKE "score 0',
  'MAKE "ax 0',
  'MAKE "ay 50',
  'SETPENCOLOR "red',
  'DOT :ax :ay',
  'SHOW :score',
  'WHEN "up [FD 10]',
  'WHEN "tick [',
  '  IF DISTANCE :ax :ay < 15 [',
  '    MAKE "score :score + 1',
  '    SHOW :score',
  '    IF :score = 2 [SHOW [You win!] GAMEOVER]',
  '    MAKE "ay :ay + 50',
  '    DOT :ax :ay',
  '  ]',
  ']',
].join('\n');

describe('game kit', () => {
  it('DOT draws without moving the turtle', () => {
    const r = execute('SETPENSIZE 3 DOT 40 -20');
    expect(r.ok && r.result.final).toMatchObject({ x: 0, y: 0 });
    expect(r.ok && r.result.events[1]).toMatchObject({ type: 'dot', x: 40, y: -20, r: 8 });
  });

  it('DISTANCE measures from the turtle', () => {
    expect(execute('PU FD 30 RT 90 FD 40 IF DISTANCE 0 0 = 50 [SHOW "yes]').ok).toBe(true);
    const r = execute('SHOW DISTANCE 3 4');
    expect(r.ok && r.result.events[0]).toMatchObject({ type: 'show', text: '5' });
  });

  it('supports >=, <= and <> (not equal), in Logo, Python and JavaScript', () => {
    const shown = (s: string) => {
      const r = execute(s);
      return r.ok ? r.result.events.filter((e) => e.type === 'show').map((e) => (e as { text: string }).text) : [r.problem.message];
    };
    expect(shown('MAKE "s 5 IF :s >= 5 [SHOW "a] IF :s <= 4 [SHOW "b] IF :s <> 3 [SHOW "c] IF :s<>5 [SHOW "d]')).toEqual(['a', 'c']);
    const src = 'MAKE "s 5\nIF :s >= 5 [FD 1]\nIF :s <> 3 [FD 1]';
    const p = check(src);
    if (!p.ok) throw new Error('bad program');
    expect(toText(translate(p.program, src, 'python'))).toContain('if s != 3:');
    expect(toText(translate(p.program, src, 'javascript'))).toContain('if (s !== 3) {');
  });

  it('SENTENCE joins a label and a value, in Logo, Python and JavaScript', () => {
    const src = 'MAKE "score 3\nSHOW SENTENCE "Score: :score';
    const r = execute(src);
    expect(r.ok && r.result.events.find((e) => e.type === 'show')).toMatchObject({ text: 'Score: 3' });
    const p = check(src);
    if (!p.ok) throw new Error('bad program');
    expect(toText(translate(p.program, src, 'python'))).toContain('show(f"Score: {score}")');
    expect(toText(translate(p.program, src, 'javascript'))).toContain('show(`Score: ${score}`);');
  });

  it('WHEN "tick is a game clock, not a key', () => {
    const g = game('WHEN "tick [FD 1]\nWHEN "up [RT 90]');
    expect(g.session.ticks).toBe(true);
    expect(g.session.keys).toEqual(['UP']);
    press(g.session, 'TICK');
    const r = press(g.session, 'TICK');
    expect(r.ok && r.events[0]!.state.y).toBe(2);
  });

  it('plays a whole catch-the-apple game and ends with GAMEOVER', () => {
    const g = game(CATCH);
    const shows: string[] = g.result.events.filter((e) => e.type === 'show').map((e) => (e as { text: string }).text);
    for (let k = 0; k < 10; k++) {
      press(g.session, 'UP');
      for (const e of [...(press(g.session, 'TICK') as { events: { type: string; text?: string }[] }).events]) {
        if (e.type === 'show') shows.push(e.text!);
      }
    }
    expect(shows).toEqual(['0', '1', '2', 'You win!']);
    expect(g.session.isOver()).toBe(true);
    expect(press(g.session, 'UP')).toEqual({ ok: true, events: [] });
  });

  it('GAMEOVER inside a procedure ends the whole handler', () => {
    const g = game('TO FINISH\nGAMEOVER\nEND\nWHEN "up [FINISH FD 100]');
    const r = press(g.session, 'UP');
    expect(r.ok && r.events.some((e) => e.type === 'line')).toBe(false);
    expect(g.session.isOver()).toBe(true);
  });

  it('translates the game kit to real Python turtle features', () => {
    const p = check(CATCH);
    if (!p.ok) throw new Error('bad program');
    const py = toText(translate(p.program, CATCH, 'python'));
    expect(py).toContain('def logo_dot(x, y):');
    expect(py).toContain('_board = Turtle()');
    expect(py).toContain('if distance(ax, ay) < 15:');
    expect(py).toContain('show("You win!")\n            game_over()\n            return');
    expect(py).toContain('def _tick():');
    expect(py).toContain('_tick()  # start the game clock\nlisten()');
    const js = toText(translate(p.program, CATCH, 'javascript'));
    expect(js).toContain('onTick(() => {');
    expect(js).toContain('gameOver();');
  });
});
