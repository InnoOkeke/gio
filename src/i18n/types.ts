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

/** Everything one language owns. FEAT-002 and FEAT-003 add content, Logo errors, voice and AI fields. */
export interface Locale {
  lang: Lang;
  messages: Messages;
  words: WordTable;
}
