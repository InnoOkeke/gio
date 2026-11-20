import { DIR_HEADING, DIR_STEP, type Level } from '../../logo/adventure/level.js';
import { LOSE_MESSAGES, type AdvEvent, type GridPose } from '../../logo/adventure/world.js';
import type { GioMood } from '../gio/mood';
import type { Cue } from './cues';

export type ActionKind = 'step' | 'swim' | 'jump' | 'turn' | 'free' | 'rest' | 'lose' | 'win';

/**
 * One thing Gio does, as the child sees it. A trace is a flat list of events (gem, beat, hit, then the
 * step itself); an action gathers the events that belong together so the player can move whole actions.
 */
export interface Action {
  kind: ActionKind;
  /** Index of the first event, and one past the last. After this action the player's cursor is `end`. */
  from: number;
  end: number;
  /** The Logo line that did it. */
  line: number;
  /** What the live region says when this action starts, or null when an earlier action already covered it. */
  text: string | null;
  cue: Cue | null;
  mood: GioMood;
}

const TERMINAL: ReadonlySet<AdvEvent['type']> = new Set(['step', 'swim', 'jump', 'turn', 'free', 'rest', 'lose', 'win']);

const FACE_CHANGE: Record<number, string> = { 1: 'turns right', 2: 'turns around', 3: 'turns left' };

const stepsWord = (n: number): string => `${n} ${n === 1 ? 'step' : 'steps'}`;

function extrasText(events: readonly AdvEvent[]): string[] {
  const out: string[] = [];
  for (const ev of events) {
    if (ev.type === 'gem' || ev.type === 'power') {
      if (ev.what === 'gem') out.push('Gio picks up a gem');
      else if (ev.what === 'boots') out.push('Gio puts on the boots');
      else if (ev.what === 'shield') out.push('Gio picks up a shield');
      else out.push('The shield pops');
    } else if (ev.type === 'hit' && ev.absorbed) {
      out.push(ev.reason === 'enemy' ? 'A Grumble bumped into Gio, but the shield helped' : 'The fire was hot, but the shield helped');
    }
  }
  return out;
}

function loseText(events: readonly AdvEvent[], fallback: string): string {
  for (const ev of events) {
    if (ev.type === 'bump') return LOSE_MESSAGES[ev.reason];
    if (ev.type === 'hit' && !ev.absorbed) return LOSE_MESSAGES[ev.reason];
  }
  return fallback;
}

function cueFor(kind: ActionKind, events: readonly AdvEvent[]): Cue | null {
  if (kind === 'win') return 'win';
  if (kind === 'lose') return 'bump';
  if (events.some((e) => e.type === 'gem' && e.what === 'gem')) return 'gem';
  if (events.some((e) => e.type === 'power')) return 'power';
  switch (kind) {
    case 'step':
      return 'step';
    case 'swim':
      return 'swim';
    case 'jump':
      return 'jump';
    case 'turn':
      return 'turn';
    case 'free':
      return 'free';
    default:
      return null;
  }
}

function moodFor(kind: ActionKind, events: readonly AdvEvent[]): GioMood {
  if (kind === 'win') return 'cheer';
  if (kind === 'lose') return 'curious';
  if (events.some((e) => (e.type === 'gem' && e.what === 'gem') || e.type === 'free')) return 'happy';
  return 'thinking';
}

/** Did Gio move backwards (against the way he faces) when going from one pose to the next? */
function movedBack(from: GridPose, to: GridPose): boolean {
  const [dc, dr] = DIR_STEP[to.dir];
  return to.col - from.col === -dc && to.row - from.row === -dr && (dc !== 0 || dr !== 0);
}

function turnQuarters(from: GridPose, to: GridPose): number {
  return ((((DIR_HEADING[to.dir] - DIR_HEADING[from.dir]) / 90) % 4) + 4) % 4;
}

interface Draft {
  action: Action;
  events: AdvEvent[];
  before: GridPose;
  after: GridPose;
  back: boolean;
  extras: string[];
}

/**
 * Turn a trace into actions. `loseMessage` is what to say when a run ends with nothing in the trace to
 * explain it (Gio got tired): pass `LevelOutcome.message`.
 */
export function buildActions(level: Level, trace: readonly AdvEvent[], loseMessage = 'Gio stopped.'): Action[] {
  const drafts: Draft[] = [];
  let pending: AdvEvent[] = [];
  let consumed = 0;
  let pose: GridPose = { ...level.start };
  const flush = (terminal: AdvEvent | null, kindOverride?: ActionKind): void => {
    const events = terminal ? [...pending, terminal] : pending;
    if (events.length === 0) return;
    const last = events[events.length - 1]!;
    const kind = kindOverride ?? (last.type as ActionKind);
    const from = consumed;
    consumed += events.length;
    const after = { ...last.pose };
    const extras = extrasText(events);
    drafts.push({
      action: { kind, from, end: consumed, line: last.line, text: null, cue: cueFor(kind, events), mood: moodFor(kind, events) },
      events,
      before: pose,
      after,
      back: kind === 'step' && movedBack(pose, after),
      extras,
    });
    pose = after;
    pending = [];
  };
  for (const ev of trace) {
    if (TERMINAL.has(ev.type)) flush(ev);
    else pending.push(ev);
  }
  flush(null, 'rest');

  // Narration: runs of plain steps on one line, one way, become one sentence.
  let k = 0;
  while (k < drafts.length) {
    const d = drafts[k]!;
    const { kind } = d.action;
    if (kind === 'step') {
      let j = k;
      while (
        j + 1 < drafts.length &&
        drafts[j]!.extras.length === 0 &&
        drafts[j + 1]!.action.kind === 'step' &&
        drafts[j + 1]!.action.line === d.action.line &&
        drafts[j + 1]!.back === d.back &&
        drafts[j + 1]!.after.dir === d.after.dir
      ) {
        j++;
      }
      const n = j - k + 1;
      const move = d.back ? `Gio walks back ${stepsWord(n)}` : `Gio walks ${stepsWord(n)}`;
      d.action.text = [move, ...drafts[j]!.extras].join('. ');
      k = j + 1;
      continue;
    }
    if (kind === 'swim') d.action.text = ['Gio swims', ...d.extras].join('. ');
    else if (kind === 'jump') d.action.text = ['Gio jumps', ...d.extras].join('. ');
    else if (kind === 'turn') d.action.text = `Gio ${FACE_CHANGE[turnQuarters(d.before, d.after)] ?? 'turns'}`;
    else if (kind === 'free') d.action.text = 'Gio opens the cage';
    else if (kind === 'rest') d.action.text = d.extras.length > 0 ? d.extras.join('. ') : 'Gio rests';
    else if (kind === 'win') d.action.text = 'Gio did it!';
    else d.action.text = loseText(d.events, loseMessage);
    k++;
  }
  return drafts.map((d) => d.action);
}
