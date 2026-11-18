import { DEFAULT_BACKGROUND, INITIAL_STATE, type RunResult, type TurtleEvent, type TurtleState } from '../../logo/index.js';

/** The visible world runs from -WORLD_HALF to +WORLD_HALF on both axes. */
export const WORLD_HALF = 300;

export type Speed = 'turtle' | 'rabbit' | 'rocket';

const SPEEDS: Record<Speed, { px: number; deg: number }> = {
  turtle: { px: 170, deg: 420 },
  rabbit: { px: 900, deg: 2400 },
  rocket: { px: Number.POSITIVE_INFINITY, deg: Number.POSITIVE_INFINITY },
};

export interface SpriteState {
  x: number;
  y: number;
  heading: number;
  visible: boolean;
}

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'done';

export interface PlayerCallbacks {
  onSprite(sprite: SpriteState, moving: boolean): void;
  onLine(line: number | null): void;
  onPrint(text: string): void;
  onBackground(color: string): void;
  onStatus(status: PlayerStatus): void;
  /** SHOW: the scoreboard text, or null to clear it. */
  onShow(text: string | null): void;
  onGameOver(): void;
}

type DrawnLine = Extract<TurtleEvent, { type: 'line' }>;

function shortestTurn(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Plays a RunResult onto a canvas, one event at a time, so children can watch the turtle work.
 * Drawing is committed incrementally; `redraw()` rebuilds it from the events after a resize.
 */
export class Player {
  private events: TurtleEvent[] = [];
  private index = 0;
  /** Progress through the current event: pixels for moves, degrees for turns. */
  private progress = 0;
  private before: TurtleState = { ...INITIAL_STATE };
  private status: PlayerStatus = 'idle';
  private speed: Speed = 'rabbit';
  private raf = 0;
  private lastTime = 0;
  private stepping = false;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly cb: PlayerCallbacks,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available in this browser');
    this.ctx = ctx;
    this.resize();
    this.emitSprite(false);
  }

  /** Match the canvas backing store to its on-screen size and device pixel ratio. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(1, Math.round(rect.width * dpr));
    if (this.canvas.width !== px || this.canvas.height !== px) {
      this.canvas.width = px;
      this.canvas.height = px;
      this.redraw();
    }
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  getStatus(): PlayerStatus {
    return this.status;
  }

  /** Load a new run and clear the stage. Call play() or step() to start. */
  load(result: RunResult): void {
    this.cancel();
    this.events = [...result.events];
    this.index = 0;
    this.progress = 0;
    this.before = { ...INITIAL_STATE };
    this.cb.onBackground(DEFAULT_BACKGROUND);
    this.cb.onShow(null);
    this.clearCanvas();
    this.cb.onLine(null);
    this.emitSprite(false);
    this.setStatus(this.events.length ? 'idle' : 'done');
  }

  /** Games: add the moves from a key press and keep going from where the turtle is. */
  append(events: TurtleEvent[]): void {
    if (!events.length) return;
    this.events.push(...events);
    if (this.status === 'done' || this.status === 'idle') {
      this.stepping = false;
      this.setStatus('playing');
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  /** Every event of the drawing so far: the loaded run plus moves appended by game key presses. */
  getEvents(): readonly TurtleEvent[] {
    return this.events;
  }
  /** Empty stage with the turtle at home. */
  reset(): void {
    this.cancel();
    this.events = [];
    this.index = 0;
    this.progress = 0;
    this.before = { ...INITIAL_STATE };
    this.cb.onBackground(DEFAULT_BACKGROUND);
    this.cb.onShow(null);
    this.clearCanvas();
    this.cb.onLine(null);
    this.emitSprite(false);
    this.setStatus('idle');
  }

  play(): void {
    if (this.status === 'done' || this.status === 'playing') return;
    this.stepping = false;
    this.setStatus('playing');
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.cancel();
    this.setStatus('paused');
    this.emitSprite(false);
  }

  /** Finish exactly one event (one command), then pause. */
  step(): void {
    if (this.status === 'done') return;
    this.cancel();
    this.stepping = true;
    this.setStatus('playing');
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Jump to the end, drawing everything immediately. */
  finish(): void {
    this.cancel();
    this.advance(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, false);
    this.complete();
  }

  destroy(): void {
    this.cancel();
  }

  /** Rebuild the drawing from events (used after resizes). */
  redraw(): void {
    this.clearCanvas();
    for (let k = 0; k < this.index; k++) {
      const e = this.events[k]!;
      if (e.type === 'line') this.strokeSegment(e, 0, 1);
      if (e.type === 'dot') this.fillDot(e);
      if (e.type === 'clear') this.clearCanvas();
    }
    const current = this.events[this.index];
    if (current?.type === 'line' && this.progress > 0) {
      const drawLen = Math.hypot(current.x2 - current.x1, current.y2 - current.y1);
      const moveLen = Math.hypot(current.state.x - this.before.x, current.state.y - this.before.y);
      const len = Math.max(drawLen, moveLen);
      this.strokeSegment(current, 0, len ? Math.min(1, this.progress / len) : 1);
    }
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const { px, deg } = SPEEDS[this.speed];
    const finishedOne = this.advance(px * dt, deg * dt, this.stepping);

    if (this.index >= this.events.length) {
      this.complete();
      return;
    }
    if (this.stepping && finishedOne) {
      this.stepping = false;
      this.setStatus('paused');
      this.emitSprite(false);
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  /**
   * Spend a movement budget on the event queue. Returns true when at least one event completed.
   * When `stopAfterOne` is set, stops right after finishing an event.
   */
  private advance(pxBudget: number, degBudget: number, stopAfterOne: boolean): boolean {
    let finished = false;
    while (this.index < this.events.length) {
      const e = this.events[this.index]!;
      if (this.progress === 0) this.cb.onLine(e.line);

      if (e.type === 'line' || e.type === 'move') {
        const from = { x: this.before.x, y: this.before.y };
        const to = { x: e.state.x, y: e.state.y };
        // Arcs draw while the turtle stands still, so pace by whichever is longer: the pen line or the walk.
        const moveLen = Math.hypot(to.x - from.x, to.y - from.y);
        const drawLen = e.type === 'line' ? Math.hypot(e.x2 - e.x1, e.y2 - e.y1) : 0;
        const len = Math.max(moveLen, drawLen);
        const startT = len ? this.progress / len : 0;
        const nextProgress = Math.min(len, this.progress + pxBudget);
        const endT = len ? nextProgress / len : 1;
        if (e.type === 'line' && drawLen && endT > startT) this.strokeSegment(e, startT, endT);
        pxBudget -= nextProgress - this.progress;
        this.progress = nextProgress;
        const x = from.x + (to.x - from.x) * endT;
        const y = from.y + (to.y - from.y) * endT;
        this.cb.onSprite({ x, y, heading: this.before.heading, visible: e.state.visible }, true);
        if (this.progress < len) return finished;
      } else if (e.type === 'turn') {
        const delta = shortestTurn(this.before.heading, e.state.heading);
        const total = Math.abs(delta);
        const nextProgress = Math.min(total, this.progress + degBudget);
        degBudget -= nextProgress - this.progress;
        this.progress = nextProgress;
        const heading = this.before.heading + Math.sign(delta) * nextProgress;
        this.cb.onSprite({ x: e.state.x, y: e.state.y, heading, visible: e.state.visible }, true);
        if (this.progress < total) return finished;
      } else {
        if (e.type === 'clear') this.clearCanvas();
        if (e.type === 'dot') this.fillDot(e);
        if (e.type === 'show') this.cb.onShow(e.text);
        if (e.type === 'gameover') this.cb.onGameOver();
        if (e.type === 'print') this.cb.onPrint(e.text);
        if (e.type === 'background') this.cb.onBackground(e.color);
        this.cb.onSprite({ x: e.state.x, y: e.state.y, heading: e.state.heading, visible: e.state.visible }, false);
      }

      this.before = e.state;
      this.index++;
      this.progress = 0;
      finished = true;
      if (stopAfterOne) return true;
    }
    return finished;
  }

  private complete(): void {
    this.cancel();
    this.cb.onLine(null);
    this.emitSprite(false);
    this.setStatus('done');
  }

  private cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private setStatus(status: PlayerStatus): void {
    this.status = status;
    this.cb.onStatus(status);
  }

  private emitSprite(moving: boolean): void {
    const s = this.before;
    this.cb.onSprite({ x: s.x, y: s.y, heading: s.heading, visible: s.visible }, moving);
  }

  private clearCanvas(): void {
    const { width, height } = this.canvas;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
  }

  private fillDot(e: Extract<TurtleEvent, { type: 'dot' }>): void {
    const scale = this.canvas.width / (WORLD_HALF * 2);
    const half = this.canvas.width / 2;
    this.ctx.setTransform(scale, 0, 0, -scale, half, half);
    this.ctx.fillStyle = e.color;
    this.ctx.beginPath();
    this.ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Events still waiting to be drawn (games skip a tick when the turtle falls behind). */
  pending(): number {
    return this.events.length - this.index;
  }

  private strokeSegment(e: DrawnLine, t0: number, t1: number): void {
    const scale = this.canvas.width / (WORLD_HALF * 2);
    const half = this.canvas.width / 2;
    const ctx = this.ctx;
    ctx.setTransform(scale, 0, 0, -scale, half, half);
    ctx.strokeStyle = e.color;
    ctx.lineWidth = e.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(e.x1 + (e.x2 - e.x1) * t0, e.y1 + (e.y2 - e.y1) * t0);
    ctx.lineTo(e.x1 + (e.x2 - e.x1) * t1, e.y1 + (e.y2 - e.y1) * t1);
    ctx.stroke();
  }
}
