import { describe, expect, it } from 'vitest';
import { validateEvents, validateProblem, validateReady } from '../src/ui/python/protocol.js';

const state = { x: 0, y: 0, heading: 0, penDown: true, color: '#1f2933', size: 2, visible: true };
const ev = (fields: Record<string, unknown>) => ({ line: 1, state, ...fields });

describe('validateEvents', () => {
  it('stops at 20000 events and says how many it left out', () => {
    const many = Array.from({ length: 20005 }, () => ev({ type: 'move' }));
    const { events, dropped } = validateEvents(many);
    expect(events).toHaveLength(20000);
    expect(dropped).toBe(5);
  });
  it('accepts well-formed events of every kind', () => {
    const raw = [
      ev({ type: 'line', x1: 0, y1: 0, x2: 10, y2: 5, color: '#FF0000', size: 3 }),
      ev({ type: 'move' }),
      ev({ type: 'turn' }),
      ev({ type: 'pen' }),
      ev({ type: 'style' }),
      ev({ type: 'visibility' }),
      ev({ type: 'clear' }),
      ev({ type: 'frame' }),
      ev({ type: 'background', color: '#ffffff' }),
      ev({ type: 'print', text: 'hi' }),
      ev({ type: 'show', text: 'score' }),
      ev({ type: 'dot', x: 1, y: 2, r: 6, color: '#00ff00' }),
      ev({ type: 'play', tones: [{ hz: 440, seconds: 0.5 }, { hz: null, seconds: 1 }] }),
      ev({ type: 'wait', seconds: 0.25 }),
    ];
    const { events, dropped } = validateEvents(raw);
    expect(dropped).toBe(0);
    expect(events).toHaveLength(raw.length);
    expect(events[0]).toMatchObject({ color: '#ff0000' });
  });
  it('drops unknown types, non-objects and missing state', () => {
    const { events, dropped } = validateEvents([ev({ type: 'eval' }), ev({ type: 'gameover' }), 5, null, 'line', { type: 'move', line: 1 }, ev({ type: 'move' })]);
    expect(events).toHaveLength(1);
    expect(dropped).toBe(6);
  });
  it('drops NaN, Infinity and non-numbers', () => {
    const bad = [
      ev({ type: 'line', x1: NaN, y1: 0, x2: 1, y2: 1, color: '#000000', size: 1 }),
      ev({ type: 'line', x1: 0, y1: 0, x2: Infinity, y2: 1, color: '#000000', size: 1 }),
      ev({ type: 'line', x1: '0', y1: 0, x2: 1, y2: 1, color: '#000000', size: 1 }),
      ev({ type: 'wait', seconds: NaN }),
      ev({ type: 'wait', seconds: -1 }),
      { type: 'move', line: 1, state: { ...state, x: NaN } },
      { type: 'move', line: 1, state: { ...state, penDown: 'yes' } },
    ];
    expect(validateEvents(bad)).toEqual({ events: [], dropped: bad.length });
  });
  it('clamps huge numbers to the world and sizes to 1..100', () => {
    const { events } = validateEvents([ev({ type: 'line', x1: -1e9, y1: 1e9, x2: 5000, y2: -5000, color: '#000000', size: 9999 }), ev({ type: 'dot', x: 0, y: 0, r: 0, color: '#000000' })]);
    expect(events[0]).toMatchObject({ x1: -1000, y1: 1000, x2: 1000, y2: -1000, size: 100 });
    expect(events[1]).toMatchObject({ r: 1 });
    const moved = validateEvents([{ type: 'move', line: 1, state: { ...state, x: 1e12, size: 0, heading: -90 } }]).events[0]!;
    expect(moved.state).toMatchObject({ x: 1000, size: 1, heading: 270 });
  });
  it('accepts only #rrggbb colours', () => {
    for (const color of ['red', '#fff', '#12345', '#1234567', 'url(x)', '#gggggg', 5, null]) {
      expect(validateEvents([ev({ type: 'background', color })]).dropped).toBe(1);
    }
    expect(validateEvents([{ type: 'move', line: 1, state: { ...state, color: 'red' } }]).dropped).toBe(1);
  });
  it('caps text at 200 characters', () => {
    const { events } = validateEvents([ev({ type: 'print', text: 'x'.repeat(5000) }), ev({ type: 'show', text: 7 })]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ text: 'x'.repeat(200) });
  });
  it('caps tones at 256, turns out-of-range pitches into rests and clamps seconds to 48', () => {
    const tones = Array.from({ length: 1000 }, () => ({ hz: 440, seconds: 0.1 }));
    const long = validateEvents([ev({ type: 'play', tones })]).events[0];
    expect(long?.type === 'play' && long.tones.length).toBe(256);
    const odd = validateEvents([ev({ type: 'play', tones: [{ hz: 5, seconds: 1 }, { hz: 9000, seconds: 1 }, { hz: 20, seconds: 99 }, { hz: 8000, seconds: 0 }] })]).events[0];
    expect(odd?.type === 'play' && odd.tones).toEqual([{ hz: null, seconds: 1 }, { hz: null, seconds: 1 }, { hz: 20, seconds: 48 }, { hz: 8000, seconds: 0 }]);
    expect(validateEvents([ev({ type: 'play', tones: [{ hz: 440, seconds: -1 }] })]).dropped).toBe(1);
    expect(validateEvents([ev({ type: 'play', tones: 'C D E' })]).dropped).toBe(1);
  });
  it('treats anything that is not a list as nothing', () => {
    expect(validateEvents({ type: 'line' })).toEqual({ events: [], dropped: 0 });
    expect(validateEvents(undefined)).toEqual({ events: [], dropped: 0 });
  });
});

describe('validateReady and validateProblem', () => {
  it('keeps real keys and bounded timers', () => {
    expect(validateReady({ keys: ['UP', 'SPACE', 'ENTER', 5], ticks: [{ id: 1, ms: 100 }, { id: 'x', ms: 1 }, { id: 2, ms: 1e9 }] })).toEqual({
      keys: ['UP', 'SPACE'],
      ticks: [{ id: 1, ms: 100 }, { id: 2, ms: 60000 }],
    });
    expect(validateReady('nope')).toEqual({ keys: [], ticks: [] });
  });
  it('shortens long messages', () => {
    expect(validateProblem({ message: 'x'.repeat(1000), line: 3.7 })).toEqual({ message: 'x'.repeat(400), line: 3 });
    expect(validateProblem({ message: 5 })).toBeUndefined();
  });
});
