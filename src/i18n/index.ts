import { en } from './locales/en.js';
import { es } from './locales/es.js';
import { fr } from './locales/fr.js';
import { pcm } from './locales/pcm.js';
import { LANGS, type Lang, type Locale } from './types.js';

export { LANGS } from './types.js';
export type { Lang, LangInfo, Locale, WordTable } from './types.js';
export type { Messages } from './locales/en.js';
import { t, plural, type Params } from './format.js';
export { t, plural };
export type { Params };

const LOCALES: Record<Lang, Locale> = { en, pcm, fr, es };

export function getLocale(lang: Lang): Locale {
  return LOCALES[lang];
}

export function isLang(value: unknown): value is Lang {
  return LANGS.some((l) => l.id === value);
}

/**
 * The language to start with when a child has not picked one: the first browser language that is French
 * or Spanish, otherwise English. A Nigerian English browser stays English; the child can pick Pidgin.
 */
export function guessLang(navigatorLanguages: readonly string[] | undefined): Lang {
  for (const tag of navigatorLanguages ?? []) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'fr') return 'fr';
    if (base === 'es') return 'es';
    if (base === 'en') return 'en';
  }
  return 'en';
}
/** A message function bound to one language: `tr('btn.close')`, `tr('keys.type', { label })`. */
export type Translate = (key: string, params?: Params) => string;
/** The message function of a language, for code outside React. */
export function translator(lang: Lang): Translate {
  const { messages } = getLocale(lang);
  return (key, params) => t(messages, key, params);
}
/** The count message (`key.one` / `key.other`) of a language. */
export function pluralIn(lang: Lang, key: string, n: number): string {
  return plural(getLocale(lang).messages, key, n, lang);
}
/** `one` or `other` for a count, by the language's plural rule (Pidgin counts like English). */
export function pluralForm(lang: Lang, n: number): 'one' | 'other' {
  return new Intl.PluralRules(lang === 'pcm' ? 'en' : lang).select(n) === 'one' ? 'one' : 'other';
}
