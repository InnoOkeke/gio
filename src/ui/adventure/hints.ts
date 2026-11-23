import { playLevel, type AgeModeId, type Level } from '../../logo/adventure/index.js';

/** One step of the hint ladder, all from level data, so it works offline and never runs anything but Gio's own interpreter. */
export interface HintStep {
  /** 1 for the first nudge. */
  step: number;
  text: string;
  /** The first part of a plan, ready to put into the editor. */
  reveal: string | null;
  /** Cells of the map Gio would walk over with the revealed part of the plan, drawn as a dotted trail. */
  trail: [number, number][];
}

/** The cells (col, row) Gio stands on, in order, when the revealed plan is played on the main map. Empty when there is none. */
export function trailOf(level: Level, mode: AgeModeId, reveal: string | undefined): [number, number][] {
  if (!reveal) return [];
  const outcome = playLevel(level, mode, reveal);
  if (outcome.status === 'error') return [];
  const cells: [number, number][] = [];
  for (const ev of outcome.trace) {
    if (ev.type !== 'step' && ev.type !== 'swim' && ev.type !== 'jump') continue;
    const last = cells[cells.length - 1];
    if (!last || last[0] !== ev.pose.col || last[1] !== ev.pose.row) cells.push([ev.pose.col, ev.pose.row]);
  }
  // The start cell is where Gio already stands.
  return cells.filter(([c, r]) => !(c === level.start.col && r === level.start.row));
}

/** The ladder for a level and mode: one step for each entry in `hints`, each with its text, optional reveal and trail. */
export function hintLadder(level: Level, mode: AgeModeId): HintStep[] {
  return level.hints.map((hint, i) => {
    const reveal = hint.reveal?.[mode] ?? null;
    return { step: i + 1, text: hint.text, reveal, trail: trailOf(level, mode, reveal ?? undefined) };
  });
}

/** After this many lost or unfinished runs in a row, Gio offers a hint once. */
export const HINT_OFFER_AFTER = 2;

export function shouldOfferHint(failStreak: number, alreadyOffered: boolean): boolean {
  return failStreak >= HINT_OFFER_AFTER && !alreadyOffered;
}
