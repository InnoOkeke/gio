import type { RunResult } from './interpreter.js';

/** A drawn line reduced to geometry: which infinite line it lies on, and the stretch of it that is inked. */
interface Run {
  /** Direction in degrees, normalised to [0, 180). */
  angle: number;
  /** Signed distance of the infinite line from the origin. */
  offset: number;
  start: number;
  end: number;
}

const ANGLE_TOL = 0.75;
const DIST_TOL = 1.5;

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function drawnSegments(result: RunResult): Seg[] {
  const segs: Seg[] = [];
  for (const e of result.events) {
    if (e.type === 'clear') segs.length = 0;
    if (e.type === 'line' && Math.hypot(e.x2 - e.x1, e.y2 - e.y1) > 0.01) segs.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 });
  }
  return segs;
}

function toRun(s: Seg): Run {
  let angle = (Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI;
  angle = ((angle % 180) + 180) % 180;
  if (angle > 180 - ANGLE_TOL / 2) angle -= 180;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const offset = s.x1 * -dy + s.y1 * dx;
  const a = s.x1 * dx + s.y1 * dy;
  const b = s.x2 * dx + s.y2 * dy;
  return { angle, offset, start: Math.min(a, b), end: Math.max(a, b) };
}

/** Merge lines drawn on top of, or end to end with, each other, so any way of drawing a shape looks the same. */
export function canonical(segs: Seg[]): Run[] {
  const runs = segs.map(toRun).sort((p, q) => p.angle - q.angle || p.offset - q.offset || p.start - q.start);
  const out: Run[] = [];
  for (const r of runs) {
    const same = out.find((o) => Math.abs(o.angle - r.angle) < ANGLE_TOL && Math.abs(o.offset - r.offset) < DIST_TOL && r.start <= o.end + DIST_TOL && r.end >= o.start - DIST_TOL);
    if (same) {
      same.start = Math.min(same.start, r.start);
      same.end = Math.max(same.end, r.end);
    } else {
      out.push({ ...r });
    }
  }
  // A second pass catches runs that became touching only after earlier merges.
  return out.length === runs.length ? out : canonical(out.map(runToSeg));
}

function runToSeg(r: Run): Seg {
  const rad = (r.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const ox = -dy * r.offset;
  const oy = dx * r.offset;
  return { x1: ox + dx * r.start, y1: oy + dy * r.start, x2: ox + dx * r.end, y2: oy + dy * r.end };
}

function matches(a: Run[], b: Run[]): boolean {
  if (a.length !== b.length) return false;
  const unused = [...b];
  for (const r of a) {
    const k = unused.findIndex(
      (o) =>
        Math.min(Math.abs(o.angle - r.angle), 180 - Math.abs(o.angle - r.angle)) < ANGLE_TOL &&
        Math.abs(o.offset - r.offset) < DIST_TOL &&
        Math.abs(o.start - r.start) < DIST_TOL &&
        Math.abs(o.end - r.end) < DIST_TOL,
    );
    if (k < 0) return false;
    unused.splice(k, 1);
  }
  return true;
}

const mirror = (segs: Seg[]): Seg[] => segs.map((s) => ({ x1: -s.x1, y1: s.y1, x2: -s.x2, y2: s.y2 }));

export interface Dot {
  x: number;
  y: number;
}

/** The dots left on the stage since the last clear. */
export function drawnDots(result: RunResult): Dot[] {
  const dots: Dot[] = [];
  for (const e of result.events) {
    if (e.type === 'clear') dots.length = 0;
    if (e.type === 'dot') dots.push({ x: e.x, y: e.y });
  }
  return dots;
}

function sameDots(a: Dot[], b: Dot[]): boolean {
  if (a.length !== b.length) return false;
  const unused = [...b];
  for (const d of a) {
    const k = unused.findIndex((o) => Math.abs(o.x - d.x) < DIST_TOL && Math.abs(o.y - d.y) < DIST_TOL);
    if (k < 0) return false;
    unused.splice(k, 1);
  }
  return true;
}

const mirrorDots = (dots: Dot[]): Dot[] => dots.map((d) => ({ x: -d.x, y: d.y }));

/**
 * True when two programs leave the same picture (ignoring colour and drawing order). Mirror images count when allowed.
 * Dots are compared too, but only when either picture has any, so drawings without dots compare as they always did.
 */
export function sameDrawing(a: RunResult, b: RunResult, options: { allowMirror?: boolean } = {}): boolean {
  const segA = drawnSegments(a);
  const segB = drawnSegments(b);
  const dotsA = drawnDots(a);
  const dotsB = drawnDots(b);
  const checkDots = dotsA.length > 0 || dotsB.length > 0;
  if (matches(canonical(segA), canonical(segB)) && (!checkDots || sameDots(dotsA, dotsB))) return true;
  return options.allowMirror === true && matches(canonical(mirror(segA)), canonical(segB)) && (!checkDots || sameDots(mirrorDots(dotsA), dotsB));
}
