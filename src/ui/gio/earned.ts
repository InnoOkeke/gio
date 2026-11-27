import type { TurtleEvent } from '../../logo/index.js';
import type { Feature } from '../../logo/quests.js';
import { friendById, stickerById, type FriendId, type StickerId } from './catalog';
import { friendIntro } from './lines';
import { localizeSticker } from '../../i18n/content.js';
import { translator, type Lang } from '../../i18n/index.js';

/** What one learning moment added to the garden. */
export interface Earned {
  newFriends: FriendId[];
  newStickers: StickerId[];
}

export const NOTHING: Earned = { newFriends: [], newStickers: [] };

export function mergeEarned(a: Earned, b: Earned): Earned {
  return {
    newFriends: [...new Set([...a.newFriends, ...b.newFriends])],
    newStickers: [...new Set([...a.newStickers, ...b.newStickers])],
  };
}

export function hasEarned(e: Earned): boolean {
  return e.newFriends.length > 0 || e.newStickers.length > 0;
}

/** Stickers worth naming, leaving out one the message already names (a quest badge). */
export function stickerNames(e: Earned, skip: StickerId | null = null, lang: Lang = 'en'): string[] {
  return e.newStickers.filter((s) => s !== skip).map((s) => localizeSticker(stickerById(s), lang).name);
}

/** One bubble message: the base line, then any friend who arrived, then any new sticker. Spoken once. */
export function announce(base: string, e: Earned, skipSticker: StickerId | null = null, lang: Lang = 'en'): string {
  const parts = [base];
  for (const id of e.newFriends) parts.push(friendIntro(friendById(id), lang));
  const names = stickerNames(e, skipSticker, lang);
  if (names.length) parts.push(translator(lang)(names.length > 1 ? 'gio.earned.other' : 'gio.earned.one', { names: names.join(translator(lang)('word.and')) }));
  return parts.join('\n');
}

/** What one finished run shows about the child's own work. */
export interface RunSignals {
  code: string;
  /** False when the code was written by someone or something else and is still unchanged. */
  credited: boolean;
  features: Feature[];
  colours: number;
  drewLines: boolean;
}

export function runSignals(code: string, credited: boolean, events: readonly TurtleEvent[], features: Iterable<Feature>): RunSignals {
  const colours = new Set<string>();
  let drewLines = false;
  for (const e of events) {
    if (e.type === 'line') {
      drewLines = true;
      colours.add(e.color);
    } else if (e.type === 'dot') colours.add(e.color);
  }
  return { code, credited, features: [...features], colours: colours.size, drewLines };
}
