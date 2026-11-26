import { CODER_DAILY, LITTLE_DAILY, type DailyPuzzle } from './daily-pool.js';
import { check } from './index.js';
import { commandCount } from './quests.js';

export type { DailyPuzzle } from './daily-pool.js';

export type DailyMode = 'little' | 'coder';

/** Puzzle #1 is on this day (months count from 0: 9 is October). Every device agrees on it, so everyone gets the same puzzle. */
const FIRST_DAY_UTC = Date.UTC(2026, 9, 16);
const DAY_MS = 86_400_000;

export const DAILY_POOL: Record<DailyMode, readonly DailyPuzzle[]> = { little: LITTLE_DAILY, coder: CODER_DAILY };

/** A calendar day on the child's own clock, so the puzzle changes at their midnight. */
export interface Day {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

export function dayOf(date: Date): Day {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** The puzzle number for a day: #1 on the first day, one more each day. A clock set before that day gets #1. */
export function puzzleNumber(d: Day): number {
  const days = Math.round((Date.UTC(d.year, d.month - 1, d.day) - FIRST_DAY_UTC) / DAY_MS);
  return Math.max(1, days + 1);
}

/** The puzzle of the day for a mode. It depends only on the day number, so it is the same for everyone and works offline. */
export function puzzleOfTheDay(mode: DailyMode, d: Day): { number: number; puzzle: DailyPuzzle } {
  const number = puzzleNumber(d);
  const pool = DAILY_POOL[mode];
  return { number, puzzle: pool[(number - 1) % pool.length]! };
}

/** How many commands the program uses, counting a REPEAT body once. Null when the code does not parse. */
export function commandsUsed(code: string): number | null {
  const parsed = check(code);
  return parsed.ok ? commandCount(parsed.program) : null;
}

/** The fewest commands we know for a puzzle: the length of its reference solution. */
export function parOf(puzzle: DailyPuzzle): number {
  return commandsUsed(puzzle.solution) ?? 0;
}

/** Three stars for matching par, two for coming within a few commands of it, one for solving it at all. */
export function starsFor(commands: number, par: number): 1 | 2 | 3 {
  if (commands <= par) return 3;
  return commands <= par + Math.max(2, Math.ceil(par / 2)) ? 2 : 1;
}
