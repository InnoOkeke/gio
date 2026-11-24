import { describe, expect, it } from 'vitest';
import { levelById } from '../src/logo/adventure/levels/index.js';
import type { Level } from '../src/logo/adventure/level.js';
import { actionSeconds, AdventurePlayer, MAX_FRAME_SECONDS, runOnFrames, type AdventureStatus, type FrameClock, type PlayerFrame } from '../src/ui/adventure/AdventurePlayer';
import { buildActions } from '../src/ui/adventure/actions';
import { CUES, cueTones, type Cue } from '../src/ui/adventure/cues';
import { initialScene, sceneAt } from '../src/ui/adventure/scene-state';
import type { Speed } from '../src/ui/runtime/player';
import { ADVENTURE_NAIVE, ADVENTURE_REFERENCE } from './solutions/adventure.js';
import { lab, play } from './helpers/adventure-lab';

interface Rig {
  player: AdventurePlayer;
  frames: PlayerFrame[];
  statuses: AdventureStatus[];
  narration: string[];
  cues: Cue[];
  level: Level;
  outcome: ReturnType<typeof play>;
}

/** A player on a real level, running a real plan, with every callback recorded. */
function rig(id: string | Level, code: string, speed: Speed = 'turtle', reducedMotion = false): Rig {
  const level = typeof id === 'string' ? levelById(id)! : id;
  const outcome = play(level, code);
  const frames: PlayerFrame[] = [];
  const statuses: AdventureStatus[] = [];
  const narration: string[] = [];
  const cues: Cue[] = [];
  const player = new AdventurePlayer(
    level,
    level.map,
    outcome.trace,
    { onFrame: (f) => frames.push(f), onStatus: (s) => statuses.push(s), onNarrate: (t) => narration.push(t), onCue: (c) => cues.push(c) },
    { speed, reducedMotion, loseMessage: outcome.message },
  );
  return { player, frames, statuses, narration, cues, level, outcome };
}

const ref = (id: string) => ADVENTURE_REFERENCE[id]!.coder!;

describe('AdventurePlayer timing', () => {
  it('applies the first action at once and the next one after its time has passed (turtle speed)', () => {
    const r = rig('maze-01', 'FD 200');
    expect(r.player.total).toBe(5);
    r.player.play();
    expect(r.player.position).toBe(1);
    r.player.advance(0.59);
    expect(r.player.position).toBe(1);
    r.player.advance(0.02);
    expect(r.player.position).toBe(2);
    expect(r.player.status).toBe('playing');
  });

  it('is faster at rabbit speed and nearly instant at rocket speed', () => {
    const rabbit = rig('maze-01', 'FD 200', 'rabbit');
    rabbit.player.play();
    rabbit.player.advance(0.23);
    expect(rabbit.player.position).toBe(2);
    const rocket = rig('maze-01', 'FD 200', 'rocket');
    rocket.player.play();
    rocket.player.advance(0.2);
    expect(rocket.player.status).toBe('done');
    expect(actionSeconds('step', 'turtle')).toBeGreaterThan(actionSeconds('step', 'rabbit'));
    expect(actionSeconds('step', 'rabbit')).toBeGreaterThan(actionSeconds('step', 'rocket'));
    expect(actionSeconds('turn', 'turtle')).toBeLessThan(actionSeconds('step', 'turtle'));
    expect(actionSeconds('win', 'turtle')).toBe(0);
  });

  it('carries the time left over into the next action', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    r.player.advance(1.3);
    expect(r.player.position).toBe(3);
    r.player.advance(0.5);
    expect(r.player.position).toBe(4);
  });

  it('ends when the last action has had its time, and says done once', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    r.player.advance(60);
    expect(r.player.status).toBe('done');
    expect(r.player.position).toBe(5);
    expect(r.statuses).toEqual(['playing', 'done']);
    r.player.advance(60);
    expect(r.statuses).toEqual(['playing', 'done']);
  });

  it('plays a run that stops before the flag, and finishes after the last step has had its time', () => {
    const r = rig('maze-01', ADVENTURE_NAIVE['maze-01']!.code);
    r.player.play();
    expect(r.player.status).toBe('playing');
    r.player.advance(0.61);
    expect(r.player.position).toBe(2);
    expect(r.player.status).toBe('playing');
    r.player.advance(0.61);
    expect(r.player.status).toBe('done');
    const last = r.frames.at(-1)!;
    expect(last.mood).toBe('calm');
    expect(last.line).toBeNull();
  });

  it('finishes at once when there is nothing to play (a plan with a typo)', () => {
    const r = rig('maze-01', 'FD 50 JUMP');
    expect(r.outcome.status).toBe('error');
    r.player.play();
    expect(r.player.status).toBe('done');
    expect(r.frames.at(-1)!.scene).toEqual(initialScene(r.level));
  });

  it('changes pace when the speed changes, from the next action on', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    r.player.setSpeed('rocket');
    expect(r.player.currentSpeed).toBe('rocket');
    r.player.advance(0.9);
    expect(r.player.status).toBe('done');
  });

  it('does not move while paused, and carries on from where it was', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    r.player.advance(0.3);
    r.player.pause();
    r.player.advance(100);
    expect(r.player.position).toBe(1);
    expect(r.player.status).toBe('paused');
    r.player.play();
    r.player.advance(0.29);
    expect(r.player.position).toBe(1);
    r.player.advance(0.02);
    expect(r.player.position).toBe(2);
  });

  it('ignores advance before Go', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.advance(10);
    expect(r.player.position).toBe(0);
    expect(r.frames).toHaveLength(0);
  });
});

describe('AdventurePlayer controls', () => {
  it('step() does one action and waits, however much time passes', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.step();
    expect(r.player.position).toBe(1);
    expect(r.player.status).toBe('paused');
    r.player.advance(100);
    expect(r.player.position).toBe(1);
    r.player.step();
    expect(r.player.position).toBe(2);
    expect(r.frames.at(-1)!.line).toBe(1);
    for (let k = 0; k < 3; k++) r.player.step();
    expect(r.player.position).toBe(5);
    expect(r.player.status).toBe('done');
    expect(r.frames.at(-1)!.line).toBeNull();
  });

  it('play() after step() carries on with the next action straight away', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.step();
    r.player.play();
    expect(r.player.position).toBe(2);
  });

  it('finish() jumps to the end, with no glide, and only the last action is said and sounded', () => {
    const r = rig('maze-03', ref('maze-03'));
    r.player.play();
    r.player.finish();
    expect(r.player.status).toBe('done');
    expect(r.player.position).toBe(r.player.total);
    const last = r.frames.at(-1)!;
    expect(last.tween).toBe(false);
    expect(last.scene.gems).toBe(1);
    expect(last.scene.gio).toMatchObject({ col: 0, row: 0 });
    expect(r.narration.at(-1)).toBe('Gio did it!');
    expect(r.cues.at(-1)).toBe('win');
    expect(r.cues.filter((c) => c === 'win')).toHaveLength(1);
  });

  it('seek() shows a moment of the run silently and without a glide', () => {
    const r = rig('maze-02', ref('maze-02'));
    r.player.seek(2);
    expect(r.player.position).toBe(2);
    expect(r.player.status).toBe('paused');
    const f = r.frames.at(-1)!;
    expect(f.tween).toBe(false);
    expect(f.scene).toEqual(sceneAt(r.level, r.level.map, r.outcome.trace, f.cursor));
    expect(r.narration).toEqual([]);
    expect(r.cues).toEqual([]);
    r.player.seek(r.player.total);
    expect(r.player.status).toBe('done');
    r.player.seek(99);
    expect(r.player.position).toBe(r.player.total);
    r.player.seek(-4);
    expect(r.player.position).toBe(0);
    expect(r.player.status).toBe('idle');
  });

  it('seeking back and forward gives the same scenes', () => {
    const r = rig('maze-04', ref('maze-04'));
    r.player.finish();
    const end = JSON.stringify(r.frames.at(-1)!.scene);
    r.player.seek(3);
    const mid = JSON.stringify(r.frames.at(-1)!.scene);
    r.player.seek(r.player.total);
    expect(JSON.stringify(r.frames.at(-1)!.scene)).toBe(end);
    r.player.seek(3);
    expect(JSON.stringify(r.frames.at(-1)!.scene)).toBe(mid);
  });

  it('reset() goes back before Go: nothing picked up, Gio on the start cell, no line, idle mood', () => {
    const r = rig('maze-02', ref('maze-02'));
    r.player.play();
    r.player.advance(5);
    r.player.reset();
    const f = r.frames.at(-1)!;
    expect(r.player.status).toBe('idle');
    expect(f.scene).toEqual(initialScene(r.level));
    expect(f.line).toBeNull();
    expect(f.mood).toBe('idle');
    expect(f.action).toBeNull();
  });

  it('plays again from the start after a finished run', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    r.player.advance(60);
    expect(r.player.status).toBe('done');
    r.player.play();
    expect(r.player.status).toBe('playing');
    expect(r.player.position).toBe(1);
    expect(r.frames.at(-1)!.scene.gems).toBe(0);
  });

  it('plays the same run the same way twice', () => {
    const once = rig('maze-04', ref('maze-04'), 'rabbit');
    const twice = rig('maze-04', ref('maze-04'), 'rabbit');
    for (const r of [once, twice]) {
      r.player.play();
      for (let k = 0; k < 40; k++) r.player.advance(0.1);
    }
    expect(JSON.stringify(once.frames)).toBe(JSON.stringify(twice.frames));
    expect(once.narration).toEqual(twice.narration);
    expect(once.cues).toEqual(twice.cues);
  });
});

describe('AdventurePlayer frames, narration and sound', () => {
  it('highlights the line of the action that just ran', () => {
    const r = rig('maze-02', 'FD 100\nRT 90\nFD 200');
    r.player.play();
    r.player.advance(60);
    const lines = r.frames.filter((f) => f.action && f.action.kind !== 'win').map((f) => f.line);
    expect(lines.slice(0, 5)).toEqual([1, 1, 2, 3, 3]);
  });

  it('glides during play and not with reduced motion, at the same pace', () => {
    const moving = rig('maze-01', 'FD 200');
    moving.player.play();
    expect(moving.frames[0]!.tween).toBe(true);
    expect(moving.frames[0]!.seconds).toBe(actionSeconds('step', 'turtle'));
    const still = rig('maze-01', 'FD 200', 'turtle', true);
    still.player.play();
    expect(still.frames[0]!.tween).toBe(false);
    still.player.advance(0.61);
    expect(still.player.position).toBe(2);
  });

  it('narrates each group once and sounds every action in order', () => {
    const r = rig('maze-02', ref('maze-02'));
    r.player.play();
    r.player.advance(60);
    expect(r.narration).toEqual(['Gio walks 2 steps', 'Gio turns right', 'Gio walks 2 steps. Gio picks up a gem', 'Gio walks 2 steps', 'Gio did it!']);
    expect(r.cues).toEqual(['step', 'step', 'turn', 'step', 'gem', 'step', 'step', 'win']);
  });

  it('sounds a bump and says what happened when the plan loses', () => {
    const naive = ADVENTURE_NAIVE['maze-03']!;
    const r = rig('maze-03', naive.code);
    r.player.play();
    r.player.advance(60);
    expect(r.narration.at(-1)).toBe('Oof, a rock!');
    expect(r.cues.at(-1)).toBe('bump');
    expect(r.frames.at(-1)!.mood).toBe('curious');
    expect(r.player.status).toBe('done');
  });

  it('moods follow the events: thinking while it runs, happy on a gem, cheer on a win', () => {
    const r = rig('maze-01', 'FD 200');
    r.player.play();
    expect(r.frames[0]!.mood).toBe('thinking');
    r.player.advance(0.61);
    expect(r.frames.at(-1)!.mood).toBe('happy');
    r.player.advance(60);
    expect(r.frames.at(-1)!.mood).toBe('cheer');
  });

  it('every action is covered by exactly one action range, with no gaps', () => {
    for (const [id, modes] of Object.entries(ADVENTURE_REFERENCE)) {
      const l = levelById(id)!;
      const outcome = play(l, (modes.coder ?? modes.little)!);
      const actions = buildActions(l, outcome.trace);
      let next = 0;
      for (const a of actions) {
        expect(a.from).toBe(next);
        expect(a.end).toBeGreaterThan(a.from);
        next = a.end;
      }
      expect(next).toBe(outcome.trace.length);
    }
  });
});

describe('scene state', () => {
  it('turns the short way round: a left turn is minus 90, and four right turns make 360', () => {
    const l = levelById('maze-01')!;
    const left = play(l, 'LT 90');
    expect(sceneAt(l, l.map, left.trace, left.trace.length).heading).toBe(-90);
    const spin = play(l, 'RT 90\nRT 90\nRT 90\nRT 90');
    expect(sceneAt(l, l.map, spin.trace, spin.trace.length).heading).toBe(360);
    const back = play(l, 'RT 180');
    expect(Math.abs(sceneAt(l, l.map, back.trace, back.trace.length).heading)).toBe(180);
  });

  it('tracks gems, the open cage and the friend', () => {
    const l = levelById('maze-05')!;
    const o = play(l, ref('maze-05'));
    const s = sceneAt(l, l.map, o.trace, o.trace.length);
    expect(s.gems).toBe(1);
    expect(s.cells[3]![0]).toBe('.');
    expect(s.cells[2]![4]).toBe('.');
    expect(s.freed).toEqual([[4, 2]]);
    const before = sceneAt(l, l.map, o.trace, 0);
    expect(before.cells[2]![4]).toBe('F');
    expect(before.freed).toEqual([]);
  });

  it('moves the Grumbles with the beat and lights the fire on its rhythm', () => {
    const l = lab(['G..', '...', '.S.'], {
      enemies: [{ id: 'a', route: [[2, 0], [2, 1], [2, 2]] }],
      fires: [{ id: 'f', cells: [[0, 1]], period: 2, on: [1] }],
    });
    const o = play(l, 'REST\nREST\nREST');
    expect(initialScene(l).enemies).toEqual([{ id: 'a', col: 2, row: 0 }]);
    expect(initialScene(l).fires).toEqual([]);
    const beats = o.trace.map((e, k) => ({ e, k })).filter(({ e }) => e.type === 'beat');
    expect(beats).toHaveLength(3);
    beats.forEach(({ e, k }, i) => {
      const s = sceneAt(l, l.map, o.trace, k + 1);
      expect(s.beat).toBe(i + 1);
      expect(s.enemies).toEqual([{ id: 'a', col: 2, row: (i + 1) % 3 }]);
      expect(s.fires).toEqual((i + 1) % 2 === 1 ? [[0, 1]] : []);
      expect(e.type).toBe('beat');
    });
  });

  it('keeps the shield, boots and gems apart', () => {
    const l = lab(['G..', 'jo.', '.S.']);
    const o = play(l, 'FD 50\nLT 90\nFD 50\nRT 90');
    const s = sceneAt(l, l.map, o.trace, o.trace.length);
    expect(s).toMatchObject({ boots: true, shield: true });
    expect(s.cells[1]).toEqual(['.', '.', '.']);
    const before = sceneAt(l, l.map, o.trace, 0);
    expect(before).toMatchObject({ boots: false, shield: false });
    expect(before.cells[1]).toEqual(['j', 'o', '.']);
  });
});

describe('runOnFrames', () => {
  /** A frame clock the test advances by hand. */
  function manualClock(): FrameClock & { tick(ms: number): void; pending(): boolean } {
    let next: ((t: number) => void) | null = null;
    let handle = 0;
    let now = 1000;
    return {
      request(cb) {
        next = cb;
        return ++handle;
      },
      cancel() {
        next = null;
      },
      tick(ms) {
        now += ms;
        const cb = next;
        next = null;
        cb?.(now);
      },
      pending: () => next !== null,
    };
  }

  it('turns frame times into seconds for the player, and stops when asked', () => {
    const r = rig('maze-01', 'FD 200');
    const clock = manualClock();
    const stop = runOnFrames(r.player, clock);
    r.player.play();
    clock.tick(0);
    for (let k = 0; k < 4; k++) clock.tick(160);
    expect(r.player.position).toBe(2);
    stop();
    expect(clock.pending()).toBe(false);
    clock.tick(5000);
    expect(r.player.position).toBe(2);
  });

  it('caps a long gap so a sleeping tab does not play the run in one frame', () => {
    const r = rig('maze-01', 'FD 200');
    const clock = manualClock();
    runOnFrames(r.player, clock);
    r.player.play();
    clock.tick(0);
    clock.tick(60_000);
    expect(MAX_FRAME_SECONDS).toBe(0.25);
    expect(r.player.position).toBe(1);
    expect(r.player.status).toBe('playing');
  });
});

describe('sound cues', () => {
  it('has real notes for every cue, and a longer jingle for a win than a step', () => {
    const total = (c: Cue) => cueTones(c).reduce((s, t) => s + t.seconds, 0);
    for (const c of CUES) {
      const tones = cueTones(c);
      expect(tones.length).toBeGreaterThan(0);
      for (const t of tones) {
        expect(t.hz).toBeGreaterThan(40);
        expect(t.seconds).toBeGreaterThan(0);
      }
    }
    expect(total('win')).toBeGreaterThan(total('step'));
    expect(total('step')).toBeLessThan(0.1);
    expect(Math.max(...cueTones('bump').map((t) => t.hz ?? 0))).toBeLessThan(Math.min(...cueTones('gem').map((t) => t.hz ?? 0)));
    expect(new Set(CUES.map((c) => JSON.stringify(cueTones(c)))).size).toBe(CUES.length);
  });
});
