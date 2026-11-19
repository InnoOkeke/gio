import { INITIAL_STATE, type TurtleEvent, type TurtleState } from '../../logo/index.js';
import { WORLD_HALF } from '../runtime/player';

export interface ReplaySprite {
  x: number;
  y: number;
  heading: number;
  visible: boolean;
}

/**
 * One picture of the movie. The first `upto` events are finished. When `fraction` is above zero the
 * event at index `upto` is part way through (a line half drawn, a turn half made).
 */
export interface ReplayFrame {
  upto: number;
  fraction: number;
  /** How far through the whole drawing this frame is, from above 0 to 1. */
  t: number;
  sprite: ReplaySprite;
}

export interface ReplayOptions {
  maxFrames: number;
  minFrames: number;
}

/** The movie keeps between 24 and 100 pictures, so it is never a blink and never a huge file. */
export const REPLAY_LIMITS: ReplayOptions = { minFrames: 24, maxFrames: 100 };

const TURN_COST = 20;
const DOT_COST = 6;
/** One movie picture for about this much drawing. */
const COST_PER_FRAME = 12;

function shortestTurn(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function eventCost(e: TurtleEvent, before: TurtleState): number {
  if (e.type === 'line') {
    return Math.max(Math.hypot(e.x2 - e.x1, e.y2 - e.y1), Math.hypot(e.state.x - before.x, e.state.y - before.y));
  }
  if (e.type === 'move') return Math.hypot(e.state.x - before.x, e.state.y - before.y);
  if (e.type === 'turn') return TURN_COST;
  if (e.type === 'dot') return DOT_COST;
  return 0;
}

function spriteOf(state: TurtleState): ReplaySprite {
  return { x: state.x, y: state.y, heading: state.heading, visible: state.visible };
}

/**
 * Cut the drawing into movie pictures placed at equal steps of drawing effort, so long lines and
 * quick turns each get a fair share of the movie. The last picture is the complete drawing.
 */
export function planReplay(events: readonly TurtleEvent[], opts: ReplayOptions): ReplayFrame[] {
  const markers: number[] = [];
  events.forEach((e, k) => e.type === 'frame' && markers.push(k));
  if (markers.length) return planMovie(events, markers, opts.maxFrames);
  const befores: TurtleState[] = [];
  const prefix: number[] = [0];
  let state: TurtleState = INITIAL_STATE;
  for (const e of events) {
    befores.push(state);
    prefix.push(prefix[prefix.length - 1]! + eventCost(e, state));
    state = e.state;
  }
  const total = prefix[prefix.length - 1]!;
  if (total <= 0) return [];

  const count = Math.min(opts.maxFrames, Math.max(opts.minFrames, Math.round(total / COST_PER_FRAME)));
  const frames: ReplayFrame[] = [];
  let idx = 0;
  for (let k = 1; k <= count; k++) {
    if (k === count) {
      frames.push({ upto: events.length, fraction: 0, t: 1, sprite: spriteOf(state) });
      break;
    }
    const target = (total * k) / count;
    while (idx < events.length && prefix[idx + 1]! <= target) idx++;
    const e = events[idx]!;
    const before = befores[idx]!;
    const cost = prefix[idx + 1]! - prefix[idx]!;
    const fraction = cost > 0 ? Math.min(1, (target - prefix[idx]!) / cost) : 0;
    let sprite = spriteOf(before);
    if (fraction > 0 && (e.type === 'line' || e.type === 'move')) {
      sprite = {
        x: before.x + (e.state.x - before.x) * fraction,
        y: before.y + (e.state.y - before.y) * fraction,
        heading: before.heading,
        visible: e.state.visible,
      };
    } else if (fraction > 0 && e.type === 'turn') {
      sprite = {
        x: e.state.x,
        y: e.state.y,
        heading: before.heading + shortestTurn(before.heading, e.state.heading) * fraction,
        visible: e.state.visible,
      };
    }
    frames.push({ upto: idx, fraction: e.type === 'dot' ? 0 : fraction, t: k / count, sprite });
  }
  return frames;
}

/**
 * A FRAME program is already a movie: one picture per FRAME, evenly sampled down to `maxFrames`.
 * There is no padding up to minFrames, so a program with 5 FRAMEs gives a 5-picture movie.
 */
function planMovie(events: readonly TurtleEvent[], markers: readonly number[], maxFrames: number): ReplayFrame[] {
  const count = Math.min(markers.length, Math.max(1, maxFrames));
  const frames: ReplayFrame[] = [];
  for (let k = 1; k <= count; k++) {
    // Always keep the last FRAME so the movie ends on the finished picture.
    const marker = markers[Math.round((k * markers.length) / count) - 1]!;
    frames.push({ upto: marker + 1, fraction: 0, t: k / count, sprite: spriteOf(events[marker]!.state) });
  }
  return frames;
}

function drawTurtle(ctx: CanvasRenderingContext2D, sprite: ReplaySprite, size: number): void {
  const px = ((sprite.x + WORLD_HALF) / (WORLD_HALF * 2)) * size;
  const py = ((WORLD_HALF - sprite.y) / (WORLD_HALF * 2)) * size;
  const r = size * 0.032;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(px, py);
  ctx.rotate((sprite.heading * Math.PI) / 180);
  ctx.fillStyle = '#12a36b';
  ctx.strokeStyle = '#0b3d2c';
  ctx.lineWidth = Math.max(1, size * 0.004);
  for (const [fx, fy] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]] as const) {
    ctx.beginPath();
    ctx.arc(fx * r * 0.95, fy * r * 0.85, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, -r * 1.25, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWordmark(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#0b3d2c';
  ctx.font = `800 ${Math.round(size * 0.032)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Made with GIO', size - size * 0.025, size - size * 0.025);
  ctx.restore();
}

/**
 * Draw the movie one picture at a time. Only the new part of the drawing is added to a persistent
 * canvas for each picture, then copied with the turtle and wordmark on top.
 */
export async function* renderReplayFrames(
  events: readonly TurtleEvent[],
  background: string,
  size: number,
  frames: readonly ReplayFrame[] = planReplay(events, REPLAY_LIMITS),
): AsyncGenerator<ImageData> {
  const base = document.createElement('canvas');
  base.width = size;
  base.height = size;
  const baseCtx = base.getContext('2d');
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const outCtx = out.getContext('2d', { willReadFrequently: true });
  if (!baseCtx || !outCtx) throw new Error('Canvas 2D is not available in this browser');

  const scale = size / (WORLD_HALF * 2);
  const half = size / 2;
  baseCtx.lineCap = 'round';
  baseCtx.lineJoin = 'round';
  const toWorld = () => baseCtx.setTransform(scale, 0, 0, -scale, half, half);

  let cursor = 0;
  /** How much of events[cursor] is already on the base canvas. */
  let drawn = 0;

  const stroke = (e: Extract<TurtleEvent, { type: 'line' }>, t0: number, t1: number) => {
    if (t1 <= t0) return;
    toWorld();
    baseCtx.strokeStyle = e.color;
    baseCtx.lineWidth = e.size;
    baseCtx.beginPath();
    baseCtx.moveTo(e.x1 + (e.x2 - e.x1) * t0, e.y1 + (e.y2 - e.y1) * t0);
    baseCtx.lineTo(e.x1 + (e.x2 - e.x1) * t1, e.y1 + (e.y2 - e.y1) * t1);
    baseCtx.stroke();
  };

  for (const frame of frames) {
    while (cursor < frame.upto) {
      const e = events[cursor]!;
      if (e.type === 'line') stroke(e, drawn, 1);
      else if (e.type === 'clear') {
        baseCtx.setTransform(1, 0, 0, 1, 0, 0);
        baseCtx.clearRect(0, 0, size, size);
      } else if (e.type === 'dot') {
        toWorld();
        baseCtx.fillStyle = e.color;
        baseCtx.beginPath();
        baseCtx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        baseCtx.fill();
      }
      cursor++;
      drawn = 0;
    }
    const partial = events[cursor];
    if (frame.fraction > 0 && partial?.type === 'line') {
      stroke(partial, drawn, frame.fraction);
      drawn = frame.fraction;
    }

    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    outCtx.fillStyle = background;
    outCtx.fillRect(0, 0, size, size);
    outCtx.drawImage(base, 0, 0);
    if (frame.sprite.visible) drawTurtle(outCtx, frame.sprite, size);
    drawWordmark(outCtx, size);
    yield outCtx.getImageData(0, 0, size, size);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
