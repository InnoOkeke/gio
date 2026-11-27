import type { Messages } from './locales/en.js';

/** The languages GIO speaks. `pcm` is Nigerian Pidgin (its ISO 639-3 tag, valid in <html lang>). */
export type Lang = 'en' | 'pcm' | 'fr' | 'es';

export interface LangInfo {
  id: Lang;
  /** The language's name in itself, shown on the picker. */
  name: string;
  /** Short code on the language button. */
  code: string;
}

export const LANGS: readonly LangInfo[] = [
  { id: 'en', name: 'English', code: 'EN' },
  { id: 'pcm', name: 'Naijá Pidgin', code: 'PCM' },
  { id: 'fr', name: 'Français', code: 'FR' },
  { id: 'es', name: 'Español', code: 'ES' },
];

/**
 * Logo command words of one language: the canonical English name (FORWARD, REPEAT, IF ...) mapped to
 * the words that language uses, ASCII and without accents. The first word is the full form; a second
 * word, when there is one, is the short form (AV, RE ...). English needs no table: its words are the
 * names and aliases in src/logo/primitives.ts.
 */
export type WordTable = Readonly<Record<string, readonly string[]>>;

/** The text of one quest. A missing `hint` keeps the English hint, for hints that are only Logo code. */
export interface QuestText {
  title: string;
  goal: string;
  hint?: string;
}
/**
 * Text that lives in data files (quests, stages, friends, adventure levels), keyed by the data's own ids.
 * English is not repeated: the data files hold it, and a missing entry falls back to it.
 */
export interface Content {
  quests: Readonly<Record<string, QuestText>>;
  /** Concept name and sticker badge, by concept id. */
  concepts: Readonly<Record<string, { name: string; badge: string }>>;
  /** Stage (island) name and tagline, by island key. */
  stages: Readonly<Record<string, { name: string; tagline: string }>>;
  friends: Readonly<Record<string, { species: string; idea: string; hint: string }>>;
  stickers: Readonly<Record<string, { name: string; hint: string }>>;
  /** Pools of lines Gio says, by pool id (for example `little.greeting`). */
  lines: Readonly<Record<string, readonly string[]>>;
  /** Adventure text by id: realm names, level titles, intro lines, hints. */
  adventure: Readonly<Record<string, string>>;
}
/** Everything one language owns. FEAT-003 adds voice and AI fields. */
export interface Locale {
  lang: Lang;
  messages: Messages;
  words: WordTable;
  content: Content;
  /** Logo error text by error key, with {placeholders}. Empty for English: src/i18n/logo-errors.ts holds it. */
  logoErrors: Readonly<Record<string, string>>;
}
