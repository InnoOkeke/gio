import { esWords, frWords, pcmWords } from '../i18n/words.js';
import type { Lang, WordTable } from '../i18n/types.js';
import { PRIMITIVES, SPECIAL_FORMS } from './primitives.js';

/** Upper-case and strip accents, so REPÈTE, repete and REPETE are the same word. Used for lookups only. */
export function foldWord(text: string): string {
  return text.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** English words per canonical name: the full name first, then the short forms (FORWARD, FD). */
export const ENGLISH_WORDS: WordTable = Object.fromEntries([
  ...PRIMITIVES.map((p) => [p.name, [p.name, ...p.aliases]] as const),
  ...SPECIAL_FORMS.map((w) => [w, [w]] as const),
]);

/** The command words each language adds to the English ones. English adds none: its words are the names and aliases. */
export const LOCAL_WORDS: Record<Lang, WordTable> = { en: {}, fr: frWords, es: esWords, pcm: pcmWords };

export interface WordEntry {
  canon: string;
  /** 0 for a full word, 1 or more for a short form. */
  index: number;
}

/** Every language's words (and the English ones), folded, mapped to the command they mean. */
const ALL = new Map<string, WordEntry>();
function add(table: WordTable): void {
  for (const [canon, list] of Object.entries(table)) {
    list.forEach((word, index) => {
      const key = foldWord(word);
      if (!ALL.has(key)) ALL.set(key, { canon, index });
    });
  }
}
add(ENGLISH_WORDS);
for (const lang of ['fr', 'es', 'pcm'] as const) add(LOCAL_WORDS[lang]);

/**
 * The command a word means, in any language. A name the program defines itself with TO keeps the
 * child's meaning, and a word nobody knows comes back as it was typed.
 */
export function canonical(word: string, definedByProgram: boolean): string {
  if (definedByProgram) return word;
  return ALL.get(foldWord(word))?.canon ?? word;
}

export function wordEntry(word: string): WordEntry | undefined {
  return ALL.get(foldWord(word));
}

/** For display: the words one language shows for each command, full form first. English words stay available in every language. */
export function wordsFor(lang: Lang): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const [canon, english] of Object.entries(ENGLISH_WORDS)) out.set(canon, LOCAL_WORDS[lang][canon] ?? english);
  return out;
}

/** One word of a language for a command: the short form when `short` is true and the language has one. */
export function wordIn(lang: Lang, canon: string, short = false): string {
  const list = LOCAL_WORDS[lang][canon] ?? ENGLISH_WORDS[canon] ?? [canon];
  return (short && list.length > 1 ? list[1] : list[0])!;
}
