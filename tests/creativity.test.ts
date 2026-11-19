import { describe, it, expect } from 'vitest';
import { blocksToLogo, check, execute, press, start, toBlocks, type Block, type TurtleEvent } from '../src/logo/index.js';

function events(source: string, limits?: { maxSeconds?: number }): TurtleEvent[] {
  const res = execute(source, { limits });
  if (!res.ok) throw new Error(res.problem.message);
  return res.result.events;
}

type Play = Extract<TurtleEvent, { type: 'play' }>;
const plays = (source: string): Play[] => events(source).filter((e): e is Play => e.type === 'play');

function problem(source: string, limits?: { maxSeconds?: number }) {
  const res = execute(source, { limits });
  if (res.ok) throw new Error('expected a problem');
  return res.problem;
}

describe('PLAY', () => {
  it('plays a list as one event of tones at the default tempo', () => {
    const [play, ...rest] = plays('PLAY [C D E]');
    expect(rest).toHaveLength(0);
    expect(play!.tones).toHaveLength(3);
    expect(play!.tones.map((t) => t.seconds)).toEqual([0.5, 0.5, 0.5]);
    expect(play!.tones[0]!.hz).toBeCloseTo(261.63, 2);
  });
  it('SETTEMPO 60 doubles the length of every note', () => {
    const [play] = plays('SETTEMPO 60\nPLAY [C D]');
    expect(play!.tones.map((t) => t.seconds)).toEqual([1, 1]);
    expect(events('SETTEMPO 60').length).toBe(0);
  });
  it('turns rests into null pitches and respects beat lengths', () => {
    const [play] = plays('PLAY [C R 2 E 0.5]');
    expect(play!.tones.map((t) => t.hz === null)).toEqual([false, true, false]);
    expect(play!.tones.map((t) => t.seconds)).toEqual([0.5, 1, 0.25]);
  });
  it('plays a quoted word and a variable holding a list', () => {
    expect(plays('PLAY "C')[0]!.tones).toHaveLength(1);
    expect(plays('MAKE "tune [C E G]\nPLAY :tune')[0]!.tones).toHaveLength(3);
    expect(plays('MAKE "n "G\nPLAY :n')[0]!.tones).toHaveLength(1);
  });
  it('builds tunes with SENTENCE', () => {
    expect(plays('MAKE "a [C D]\nPLAY SENTENCE :a [E 2]')[0]!.tones.map((t) => t.seconds)).toEqual([0.5, 0.5, 1]);
  });
  it('blocks the turtle for the tune inside a loop and keeps drawing', () => {
    const all = events('REPEAT 2 [FD 10 PLAY [C]]');
    expect(all.map((e) => e.type)).toEqual(['line', 'play', 'line', 'play']);
  });
  it('gives a plain error with the right line for a bad note', () => {
    const p = problem('FD 10\nPLAY [C H]');
    expect(p.line).toBe(2);
    expect(p.message).toContain('I don\'t know the note "H"');
    expect(problem('PLAY 5').message).toContain('PLAY [C D E]');
    expect(problem('PLAY []').message).toContain('PLAY [C D E]');
  });
  it('checks the tempo range', () => {
    expect(problem('FD 1\nSETTEMPO 10').line).toBe(2);
    expect(problem('SETTEMPO 400').message).toContain('20 to 300');
  });
});

describe('WAIT and FRAME', () => {
  it('WAIT counts sixtieths of a second', () => {
    const waits = events('WAIT 30').filter((e) => e.type === 'wait');
    expect(waits).toEqual([expect.objectContaining({ type: 'wait', seconds: 0.5 })]);
    expect(problem('WAIT 601').message).toContain('0 to 600');
    expect(problem('WAIT -1').message).toContain('0 to 600');
  });
  it('FRAME is a marker followed by a quarter second hold', () => {
    const all = events('FD 10\nFRAME');
    expect(all.map((e) => e.type)).toEqual(['line', 'frame', 'wait']);
    expect(all[2]).toMatchObject({ seconds: 0.25 });
  });
  it('stops a show that is too long and names the line', () => {
    const p = problem('FD 10\nREPEAT 20 [WAIT 600]');
    expect(p.line).toBe(2);
    expect(p.message).toContain('3 minutes');
    expect(problem('PLAY [C 16 C 16]', { maxSeconds: 10 }).message).toContain('10 seconds');
  });
  it('counts music and waits in the same total', () => {
    expect(problem('WAIT 300\nPLAY [C 16]', { maxSeconds: 10 }).line).toBe(2);
  });
});

describe('games', () => {
  it('lets a tick handler call FRAME and PLAY', () => {
    const res = start('WHEN "tick [FD 5 PLAY [C] FRAME]\nWHEN "up [PLAY [E]]');
    if (!res.ok) throw new Error(res.problem.message);
    expect(res.session.ticks).toBe(true);
    const tick = press(res.session, 'TICK');
    expect(tick.ok && tick.events.map((e) => e.type)).toEqual(['line', 'play', 'frame', 'wait']);
    const up = press(res.session, 'UP');
    expect(up.ok && up.events.map((e) => e.type)).toEqual(['play']);
  });
  it('resets the time total for every key press', () => {
    const res = start('WHEN "up [PLAY [C 16 C 16 C 16 C 16 C 16 C 16 C 16 C 16]]', { limits: { maxSeconds: 100 } });
    if (!res.ok) throw new Error(res.problem.message);
    for (let k = 0; k < 5; k++) expect(press(res.session, 'UP').ok).toBe(true);
  });
});

describe('blocks', () => {
  const blocks = (source: string) => {
    const parsed = check(source);
    if (!parsed.ok) throw new Error(parsed.problem.message);
    return toBlocks(parsed.program);
  };

  it('splits a multi-note PLAY into one block per note', () => {
    expect(blocks('PLAY [C E 2 R G]')).toEqual({
      ok: true,
      blocks: [
        { kind: 'note', pitch: 'C', beats: 1 },
        { kind: 'note', pitch: 'E', beats: 2 },
        { kind: 'note', pitch: 'R', beats: 1 },
        { kind: 'note', pitch: 'G', beats: 1 },
      ],
    });
  });
  it('round trips note, frame and wait blocks through Logo', () => {
    const original: Block[] = [
      { kind: 'note', pitch: 'C', beats: 1 },
      { kind: 'note', pitch: 'E', beats: 2 },
      { kind: 'note', pitch: 'R', beats: 1 },
      { kind: 'note', pitch: 'C5', beats: 1 },
      { kind: 'frame' },
      { kind: 'wait', n: 60 },
      { kind: 'repeat', n: 2, body: [{ kind: 'forward', n: 10 }, { kind: 'note', pitch: 'G', beats: 2 }] },
    ];
    const logo = blocksToLogo(original);
    expect(logo).toContain('PLAY [C]');
    expect(logo).toContain('PLAY [E 2]');
    expect(logo).toContain('PLAY [R]');
    expect(logo).toContain('FRAME');
    expect(logo).toContain('WAIT 60');
    expect(blocks(logo)).toEqual({ ok: true, blocks: original });
    expect(execute(logo).ok).toBe(true);
  });
  it('gives reasons for what blocks cannot show', () => {
    expect(blocks('SETTEMPO 90')).toEqual({ ok: false, reason: 'it changes the tempo' });
    expect(blocks('PLAY [C#]')).toEqual({ ok: false, reason: 'it plays notes blocks cannot show' });
    expect(blocks('PLAY [C 3]')).toEqual({ ok: false, reason: 'it plays notes blocks cannot show' });
    expect(blocks('PLAY [C0.5]').ok).toBe(false);
    expect(blocks('PLAY "C')).toEqual({ ok: false, reason: 'it plays notes blocks cannot show' });
    expect(blocks('MAKE "t [C D]\nPLAY :t').ok).toBe(false);
    expect(blocks('WAIT :x').ok).toBe(false);
  });
});
