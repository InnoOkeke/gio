import { dayOf, parOf, puzzleOfTheDay, starsFor, type DailyMode, type DailyPuzzle } from '../logo/daily.js';
import { pluralIn, translator, type Lang } from '../i18n/index.js';

/** What a child solved, as JSON: puzzle number and mode to commands and stars. It stays in this browser. */
export const DAILY_KEY = 'gio.daily';
/** Older results are dropped so the key stays small. */
const KEEP = 60;

export interface DailyResult {
  commands: number;
  stars: 1 | 2 | 3;
}
export type DailyResults = Record<string, DailyResult>;

const resultKey = (number: number, mode: DailyMode) => `${number}:${mode}`;

/** Read the stored results tolerantly: bad JSON and wrong types are dropped. */
export function parseDaily(raw: string | null): DailyResults {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as { solved?: unknown };
    if (!parsed || typeof parsed.solved !== 'object' || parsed.solved === null) return {};
    const out: DailyResults = {};
    for (const [key, value] of Object.entries(parsed.solved)) {
      const v = value as Partial<DailyResult> | null;
      if (!/^\d+:(little|coder)$/.test(key) || !v) continue;
      if (typeof v.commands !== 'number' || !Number.isInteger(v.commands) || v.commands < 1 || v.commands > 999) continue;
      if (v.stars !== 1 && v.stars !== 2 && v.stars !== 3) continue;
      out[key] = { commands: v.commands, stars: v.stars };
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeDaily(results: DailyResults): string {
  const newest = Object.entries(results)
    .sort((a, b) => Number(b[0].split(':')[0]) - Number(a[0].split(':')[0]))
    .slice(0, KEEP);
  return JSON.stringify({ v: 1, solved: Object.fromEntries(newest) });
}

export function readDaily(): DailyResults {
  try {
    return parseDaily(localStorage.getItem(DAILY_KEY));
  } catch {
    return {};
  }
}

/** Keep a result. A better score for the same puzzle replaces a worse one; a worse one never does. */
export function recordDaily(number: number, mode: DailyMode, commands: number, par: number): DailyResult {
  const results = readDaily();
  const key = resultKey(number, mode);
  const next: DailyResult = { commands, stars: starsFor(commands, par) };
  const old = results[key];
  const best = old && old.commands <= next.commands ? old : next;
  results[key] = best;
  try {
    localStorage.setItem(DAILY_KEY, serializeDaily(results));
  } catch {
    /* Private browsing can block storage; the result still shows for this visit. */
  }
  return best;
}

export function savedResult(number: number, mode: DailyMode): DailyResult | null {
  return readDaily()[resultKey(number, mode)] ?? null;
}

export interface TodaysPuzzle {
  number: number;
  puzzle: DailyPuzzle;
  par: number;
}

export function todaysPuzzle(mode: DailyMode, now: Date = new Date()): TodaysPuzzle {
  const { number, puzzle } = puzzleOfTheDay(mode, dayOf(now));
  return { number, puzzle, par: parOf(puzzle) };
}

/** The line a child shares. It says how it went and never what the answer is. */
export function shareText(number: number, result: DailyResult, lang: Lang = 'en'): string {
  return translator(lang)('fun.daily.shareLine', {
    number,
    commands: pluralIn(lang, 'fun.daily.result', result.commands),
    stars: '\u2B50'.repeat(result.stars),
  });
}

export type ShareOutcome = 'shared' | 'copied' | 'failed' | 'cancelled';

/** Share through the phone's own share sheet when there is one, and copy the text when there is not. */
export async function shareDaily(text: string, url: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (err) {
      // Closing the share sheet is a choice, not an error. Anything else falls back to copying.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
