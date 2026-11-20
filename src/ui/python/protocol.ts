/**
 * The messages between GIO's page (the host), the sandboxed Python frame (the runner) and the worker inside it,
 * and the check that every event coming back from the frame is safe to draw. Nothing the frame sends is ever executed.
 */
import type { GameKey, TurtleEvent, TurtleState } from '../../logo/index.js';

/** Where the self-hosted Python engine lives, under GIO's own server. */
export const PYODIDE_VERSION = '314.0.8';
export const PYODIDE_PATH = `/py/pyodide-${PYODIDE_VERSION}/`;
export const RUNNER_PATH = '/py/runner.html';

/** What a Python call hands back besides events: the keys that are bound and the timers waiting to fire. */
export interface PythonReady {
  keys: GameKey[];
  ticks: { id: number; ms: number }[];
}

export interface PythonProblem {
  message: string;
  line: number;
}

export interface PythonResult {
  events: TurtleEvent[];
  error?: PythonProblem;
  keys: GameKey[];
  ticks: { id: number; ms: number }[];
}

/** Host to runner. */
export type HostMessage =
  | { type: 'run'; id: number; code: string }
  | { type: 'press'; id: number; key: string }
  | { type: 'fire'; id: number; timer: number }
  | { type: 'stop' };

/** Runner to host. `result` carries the raw (unchecked) events from Python. */
export type RunnerMessage =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'result'; id: number; events: unknown; error: unknown; ready: unknown };

export const HOST_MESSAGE_TYPES = ['run', 'press', 'fire', 'stop'] as const;

const WORLD = 1000;
const GAME_KEYS: readonly string[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'];
const MAX_TEXT = 200;
const MAX_TONES = 256;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function coord(v: unknown): number | null {
  return finite(v) ? clamp(v, -WORLD, WORLD) : null;
}
function size(v: unknown): number | null {
  return finite(v) ? clamp(v, 1, 100) : null;
}
function colour(v: unknown): string | null {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}
function text(v: unknown): string | null {
  return typeof v === 'string' ? v.slice(0, MAX_TEXT) : null;
}

function cleanState(raw: unknown): TurtleState | null {
  if (!isObject(raw)) return null;
  const x = coord(raw['x']);
  const y = coord(raw['y']);
  const heading = finite(raw['heading']) ? ((raw['heading'] % 360) + 360) % 360 : null;
  const color = colour(raw['color']);
  const sz = size(raw['size']);
  if (x === null || y === null || heading === null || color === null || sz === null) return null;
  if (typeof raw['penDown'] !== 'boolean' || typeof raw['visible'] !== 'boolean') return null;
  return { x, y, heading, penDown: raw['penDown'], color, size: sz, visible: raw['visible'] };
}

function cleanEvent(raw: unknown): TurtleEvent | null {
  if (!isObject(raw)) return null;
  const state = cleanState(raw['state']);
  if (!state) return null;
  const line = finite(raw['line']) && raw['line'] >= 0 ? Math.floor(raw['line']) : 0;
  const base = { line, state };
  switch (raw['type']) {
    case 'line': {
      const x1 = coord(raw['x1']);
      const y1 = coord(raw['y1']);
      const x2 = coord(raw['x2']);
      const y2 = coord(raw['y2']);
      const color = colour(raw['color']);
      const sz = size(raw['size']);
      if (x1 === null || y1 === null || x2 === null || y2 === null || color === null || sz === null) return null;
      return { type: 'line', x1, y1, x2, y2, color, size: sz, ...base };
    }
    case 'move':
    case 'turn':
    case 'pen':
    case 'style':
    case 'visibility':
    case 'clear':
    case 'frame':
      return { type: raw['type'], ...base };
    case 'background': {
      const color = colour(raw['color']);
      return color === null ? null : { type: 'background', color, ...base };
    }
    case 'print':
    case 'show': {
      const t = text(raw['text']);
      return t === null ? null : { type: raw['type'], text: t, ...base };
    }
    case 'dot': {
      const x = coord(raw['x']);
      const y = coord(raw['y']);
      const r = size(raw['r']);
      const color = colour(raw['color']);
      if (x === null || y === null || r === null || color === null) return null;
      return { type: 'dot', x, y, r, color, ...base };
    }
    case 'play': {
      if (!Array.isArray(raw['tones'])) return null;
      const tones: { hz: number | null; seconds: number }[] = [];
      for (const t of raw['tones'].slice(0, MAX_TONES)) {
        if (!isObject(t) || !finite(t['seconds']) || t['seconds'] < 0) return null;
        const hz = finite(t['hz']) && t['hz'] >= 20 && t['hz'] <= 8000 ? t['hz'] : null;
        tones.push({ hz, seconds: clamp(t['seconds'], 0, 48) });
      }
      return { type: 'play', tones, ...base };
    }
    case 'wait': {
      const seconds = raw['seconds'];
      return finite(seconds) && seconds >= 0 ? { type: 'wait', seconds: clamp(seconds, 0, 60), ...base } : null;
    }
    default:
      return null;
  }
}

/** Keeps only events that are known, well-formed and in range; says how many it had to drop. */
export function validateEvents(raw: unknown): { events: TurtleEvent[]; dropped: number } {
  if (!Array.isArray(raw)) return { events: [], dropped: 0 };
  const events: TurtleEvent[] = [];
  let dropped = 0;
  for (const item of raw) {
    const clean = cleanEvent(item);
    if (clean) events.push(clean);
    else dropped += 1;
  }
  return { events, dropped };
}

/** The keys and timers Python reports, checked the same way. */
export function validateReady(raw: unknown): { keys: GameKey[]; ticks: { id: number; ms: number }[] } {
  const out: { keys: GameKey[]; ticks: { id: number; ms: number }[] } = { keys: [], ticks: [] };
  if (!isObject(raw)) return out;
  if (Array.isArray(raw['keys'])) {
    for (const k of raw['keys']) if (typeof k === 'string' && GAME_KEYS.includes(k)) out.keys.push(k as GameKey);
  }
  if (Array.isArray(raw['ticks'])) {
    for (const t of raw['ticks'].slice(0, 64)) {
      if (isObject(t) && finite(t['id']) && finite(t['ms'])) out.ticks.push({ id: Math.floor(t['id']), ms: clamp(Math.floor(t['ms']), 0, 60_000) });
    }
  }
  return out;
}

export function validateProblem(raw: unknown): PythonProblem | undefined {
  if (!isObject(raw) || typeof raw['message'] !== 'string') return undefined;
  const line = finite(raw['line']) && raw['line'] >= 0 ? Math.floor(raw['line']) : 0;
  return { message: raw['message'].slice(0, 400), line };
}
