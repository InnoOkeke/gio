import type { Level } from '../../logo/adventure/level.js';
import type { AdvEvent } from '../../logo/adventure/world.js';
import type { GioMood } from '../gio/mood';
import type { Speed } from '../runtime/player';
import { buildActions, type Action, type ActionKind } from './actions';
import type { Cue } from './cues';
import { sceneAt, type SceneState } from './scene-state';

export type AdventureStatus = 'idle' | 'playing' | 'paused' | 'done';

/** Seconds Gio spends on each kind of action. Turning is quicker than walking, a bump lingers a little. */
const SECONDS: Record<Speed, Record<ActionKind, number>> = {
  turtle: { step: 0.6, swim: 0.7, jump: 0.7, turn: 0.35, free: 0.6, rest: 0.45, lose: 0.5, win: 0 },
  rabbit: { step: 0.22, swim: 0.26, jump: 0.26, turn: 0.14, free: 0.25, rest: 0.16, lose: 0.25, win: 0 },
  rocket: { step: 0.04, swim: 0.04, jump: 0.04, turn: 0.03, free: 0.04, rest: 0.02, lose: 0.04, win: 0 },
};

/** How long the player waits after an action starts before the next one. */
export function actionSeconds(kind: ActionKind, speed: Speed): number {
  return SECONDS[speed][kind];
}

/** What the screen should show right now. */
export interface PlayerFrame {
  /** Events applied so far: the `cursor` to give `sceneAt`. */
  cursor: number;
  /** Actions applied so far. */
  position: number;
  scene: SceneState;
  /** The action that has just happened, or null at the start. */
  action: Action | null;
  /** The Logo line to highlight, or null before Go and after the run. */
  line: number | null;
  mood: GioMood;
  /** True when Gio should glide to the new place; false for jumps (Finish, seek, reset, reduced motion). */
  tween: boolean;
  /** How long the glide takes. */
  seconds: number;
}

export interface AdventurePlayerCallbacks {
  onFrame(frame: PlayerFrame): void;
  onStatus(status: AdventureStatus): void;
  /** A short line for the live region ("Gio walks 2 steps"). */
  onNarrate(text: string): void;
  onCue(cue: Cue): void;
}

export interface AdventurePlayerOptions {
  speed?: Speed;
  /** prefers-reduced-motion: Gio hops from cell to cell with no glide. Timing stays the same. */
  reducedMotion?: boolean;
  /** What to say when a run ends with no event to explain it (Gio got tired). */
  loseMessage?: string;
}

/**
 * Plays the trace of one map, an action at a time. It owns no timer: whoever drives it calls `advance`
 * with the seconds that have passed (`runOnFrames` does that with requestAnimationFrame), so the same
 * timing can be checked without a browser. The scene is rebuilt from the trace every time, so Step,
 * Finish and seek never drift.
 */
export class AdventurePlayer {
  private readonly actions: Action[];
  private applied = 0;
  private state: AdventureStatus = 'idle';
  private speed: Speed;
  private reduced: boolean;
  /** Seconds left before the next action may start. Negative means time carried over. */
  private wait = 0;
  /** Whether the latest frame glided, so the closing frame does not cut a glide short. */
  private lastTween = false;

  constructor(
    private readonly level: Level,
    private readonly map: string[],
    private readonly trace: readonly AdvEvent[],
    private readonly cb: AdventurePlayerCallbacks,
    options: AdventurePlayerOptions = {},
  ) {
    this.actions = buildActions(level, trace, options.loseMessage);
    this.speed = options.speed ?? 'rabbit';
    this.reduced = options.reducedMotion ?? false;
  }

  get status(): AdventureStatus {
    return this.state;
  }

  /** Actions applied so far. */
  get position(): number {
    return this.applied;
  }

  get total(): number {
    return this.actions.length;
  }

  get currentSpeed(): Speed {
    return this.speed;
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  setReducedMotion(on: boolean): void {
    this.reduced = on;
  }

  private setStatus(status: AdventureStatus): void {
    if (this.state === status) return;
    this.state = status;
    this.cb.onStatus(status);
  }

  private frame(tween: boolean): PlayerFrame {
    const action = this.applied > 0 ? this.actions[this.applied - 1]! : null;
    const cursor = action ? action.end : 0;
    const seconds = action ? actionSeconds(action.kind, this.speed) : 0;
    const running = this.state === 'playing' || (this.state === 'paused' && this.applied > 0 && this.applied < this.actions.length);
    return {
      cursor,
      position: this.applied,
      scene: sceneAt(this.level, this.map, this.trace, cursor),
      action,
      line: this.state === 'idle' || this.state === 'done' ? null : (action?.line ?? null),
      mood: this.moodNow(action, running),
      tween: tween && !this.reduced,
      seconds,
    };
  }

  private moodNow(action: Action | null, running: boolean): GioMood {
    if (!action) return 'idle';
    if (this.state === 'done' && action.kind !== 'win' && action.kind !== 'lose') return 'calm';
    return running || action.kind === 'win' || action.kind === 'lose' ? action.mood : 'idle';
  }

  /** Apply the next action, with its sound, narration and glide. */
  private applyNext(): void {
    const action = this.actions[this.applied]!;
    this.applied++;
    this.wait += actionSeconds(action.kind, this.speed);
    this.lastTween = true;
    this.cb.onFrame(this.frame(true));
    if (action.text) this.cb.onNarrate(action.text);
    if (action.cue) this.cb.onCue(action.cue);
  }

  private complete(): void {
    this.wait = 0;
    this.setStatus('done');
    this.cb.onFrame(this.frame(this.lastTween));
  }

  /** Start, or carry on after a pause. After a finished run it plays again from the start. */
  play(): void {
    if (this.state === 'playing') return;
    if (this.state === 'done') this.rewind();
    if (this.state === 'idle') this.wait = 0;
    this.setStatus('playing');
    this.drain();
  }

  pause(): void {
    if (this.state === 'playing') this.setStatus('paused');
  }

  /** Do exactly one more action, then wait. Starts the run if it has not started. */
  step(): void {
    if (this.state === 'done') this.rewind();
    this.setStatus('paused');
    if (this.applied >= this.actions.length) {
      this.complete();
      return;
    }
    this.wait = 0;
    this.applyNext();
    this.wait = 0;
    if (this.applied >= this.actions.length) this.complete();
  }

  /** Jump to the end of the run at once. Only the last action is narrated and sounded. */
  finish(): void {
    if (this.state === 'done' && this.applied >= this.actions.length) return;
    this.applied = this.actions.length;
    this.wait = 0;
    this.setStatus('done');
    const last = this.actions[this.actions.length - 1];
    this.lastTween = false;
    this.cb.onFrame(this.frame(false));
    if (last?.text) this.cb.onNarrate(last.text);
    if (last?.cue) this.cb.onCue(last.cue);
  }

  /** Show the scene after `position` actions. Silent and with no glide. Pauses the run. */
  seek(position: number): void {
    this.applied = Math.max(0, Math.min(this.actions.length, Math.floor(position)));
    this.wait = 0;
    this.setStatus(this.applied === 0 ? 'idle' : this.applied === this.actions.length ? 'done' : 'paused');
    this.lastTween = false;
    this.cb.onFrame(this.frame(false));
  }

  /** Back to the start, before Go. */
  reset(): void {
    this.seek(0);
  }

  private rewind(): void {
    this.applied = 0;
    this.wait = 0;
    this.state = 'idle';
  }

  /** Let `seconds` pass. Does nothing unless the run is playing. */
  advance(seconds: number): void {
    if (this.state !== 'playing') return;
    this.wait -= Math.max(0, seconds);
    this.drain();
  }

  private drain(): void {
    while (this.state === 'playing' && this.wait <= 0) {
      if (this.applied >= this.actions.length) {
        this.complete();
        return;
      }
      this.applyNext();
    }
  }
}

/** Something that calls back once per screen frame. The browser's requestAnimationFrame is one. */
export interface FrameClock {
  request(callback: (nowMs: number) => void): number;
  cancel(handle: number): void;
}

export const browserClock: FrameClock = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
};

/** The longest gap fed to `advance`, so a tab that was asleep does not play half the run in one frame. */
export const MAX_FRAME_SECONDS = 0.25;

/** Drive a player from a frame clock. Returns a function that stops it. */
export function runOnFrames(player: AdventurePlayer, clock: FrameClock = browserClock): () => void {
  let handle = 0;
  let last: number | null = null;
  let stopped = false;
  const tick = (now: number): void => {
    if (stopped) return;
    if (last !== null) player.advance(Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - last) / 1000)));
    last = now;
    handle = clock.request(tick);
  };
  handle = clock.request(tick);
  return () => {
    stopped = true;
    clock.cancel(handle);
  };
}
