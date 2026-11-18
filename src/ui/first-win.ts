import { BLOCK_COLORS } from '../logo/blocks.js';
import { NAMED_COLORS } from '../logo/colors.js';
import type { AgeMode } from './mode';

/** The age modes that have already been shown the first drawing, as a JSON array. Stays on this device. */
export const FIRST_WIN_KEY = 'gio.firstWin';

export type BlockColour = (typeof BLOCK_COLORS)[number];

export const DEFAULT_FIRST_COLOUR: BlockColour = 'blue';

export interface FirstWinColour {
  name: BlockColour;
  hex: string;
}

/** The first six block colours except black, with the hex the canvas draws them in. */
export const FIRST_WIN_COLOURS: readonly FirstWinColour[] = BLOCK_COLORS.filter((c) => c !== 'black')
  .slice(0, 6)
  .map((name) => ({ name, hex: NAMED_COLORS[name.toUpperCase()]! }));

/** A five-pointed star: five lines, each 180 long, turning 144 degrees between them. */
const STAR = ['SETPENSIZE 6', 'SETPENCOLOR "{colour}', 'REPEAT 5 [', 'FD 180', 'RT 144', ']'];

/** The program for the first drawing. Little Turtles get blocks-friendly code; Turtle Coders get a titled program. */
export function firstWinProgram(mode: AgeMode, colour: BlockColour = DEFAULT_FIRST_COLOUR): string {
  const lines = STAR.map((l) => l.replace('{colour}', colour));
  return (mode === 'coder' ? ['; My first star', ...lines] : lines).join('\n');
}

const MODES: readonly AgeMode[] = ['little', 'coder'];

/** Read the stored list tolerantly: bad JSON, wrong types and unknown modes are dropped. */
export function parseFirstWin(raw: string | null): AgeMode[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return MODES.filter((m) => parsed.includes(m));
  } catch {
    return [];
  }
}

export function readFirstWin(): AgeMode[] {
  try {
    return parseFirstWin(localStorage.getItem(FIRST_WIN_KEY));
  } catch {
    return [];
  }
}

export interface FirstWinFacts {
  mode: AgeMode;
  shown: readonly AgeMode[];
  completedQuests: readonly string[];
  learnedDays: readonly string[];
  draftCode: string;
  onSharedLink: boolean;
}

/** Only a brand-new child on an empty page is offered the first drawing, once per age mode. */
export function shouldOfferFirstWin(f: FirstWinFacts): boolean {
  return !f.shown.includes(f.mode) && f.completedQuests.length === 0 && f.learnedDays.length === 0 && f.draftCode.trim() === '' && !f.onSharedLink;
}

export function markFirstWinShown(mode: AgeMode): void {
  try {
    const next = [...new Set([...readFirstWin(), mode])];
    localStorage.setItem(FIRST_WIN_KEY, JSON.stringify(next));
  } catch {
    /* Storage can be blocked in private browsing; the welcome then shows again next visit. */
  }
}
