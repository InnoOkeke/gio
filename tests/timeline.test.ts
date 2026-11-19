import { describe, expect, it } from 'vitest';
import { execute, type TurtleEvent } from '../src/logo/index.js';
import { frameNumberAt, holdSeconds, isAnimated, noteSchedule } from '../src/ui/runtime/timeline';

function run(source: string): { events: TurtleEvent[] } {
  const res = execute(source);
  if (!res.ok) throw new Error(res.problem.message);
  return res.result;
}

describe('timeline helpers', () => {
  it('isAnimated is true only with FRAME', () => {
    expect(isAnimated(run('FD 10 WAIT 30').events)).toBe(false);
    expect(isAnimated(run('FD 10 FRAME').events)).toBe(true);
  });

  it('holdSeconds sums tones and reads waits', () => {
    const events = run('PLAY [C D E] WAIT 30 FD 5').events;
    expect(holdSeconds(events[0]!)).toBeCloseTo(1.5, 5);
    expect(holdSeconds(events[1]!)).toBeCloseTo(0.5, 5);
    expect(holdSeconds(events[2]!)).toBe(0);
  });

  it('frameNumberAt counts frame markers reached', () => {
    const events = run('FRAME FD 10 FRAME').events;
    expect(frameNumberAt(events, 0)).toBe(1);
    const last = events.length - 1;
    expect(frameNumberAt(events, last)).toBe(2);
    expect(frameNumberAt(run('FD 10').events, 0)).toBeNull();
  });

  it('noteSchedule places tones back to back and shortens each sound', () => {
    const plan = noteSchedule([{ hz: 440, seconds: 0.5 }, { hz: null, seconds: 1 }, { hz: 220, seconds: 0.5 }], 10);
    expect(plan.map((p) => p.start)).toEqual([10, 10.5, 11.5]);
    expect(plan[0]!.audible).toBeCloseTo(0.46, 5);
    expect(plan[1]!.hz).toBeNull();
    expect(plan[1]!.length).toBe(1);
  });
});
