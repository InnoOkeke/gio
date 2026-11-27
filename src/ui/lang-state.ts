import { getLocale, guessLang, isLang, t, type Lang, type Params } from '../i18n/index.js';
import { translateText } from '../i18n/say.js';
export const LANG_KEY = 'gio.lang';
/** A link can pick the language (`?lang=fr`); otherwise the remembered choice. Nothing stored means no choice yet. */
export function readStoredLang(): Lang | null {
  try {
    const fromLink = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromLink)) {
      localStorage.setItem(LANG_KEY, fromLink);
      return fromLink;
    }
    const v = localStorage.getItem(LANG_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}
let active: Lang | null = null;
/**
 * The language right now, for code that is not a React component (the error screen, the network layer, helpers).
 * Components use useLang()/useT(); LangProvider keeps this in step with them.
 */
export function currentLang(): Lang {
  active ??= readStoredLang() ?? guessLang(typeof navigator === 'undefined' ? undefined : navigator.languages);
  return active;
}
export function setActiveLang(lang: Lang): void {
  active = lang;
}
/** Translate outside React, in the current language. */
export function tr(key: string, params?: Params): string {
  return t(getLocale(currentLang()).messages, key, params);
}/** A Logo problem, quest checker note or adventure sentence in the current language. English is the original text. */
export function problemText(problem: { message: string }): string {
  return translateText(problem.message, currentLang());
}
/** Engine text (narration, results) in the current language. */
export function sayText(text: string): string {
  return translateText(text, currentLang());
}
/** An English UI word that has a message under `prefix.<English>` (block names, group titles), in the current language. */
export function trWord(prefix: string, english: string): string {
  const key = `${prefix}.${english}`;
  return key in (getLocale('en').messages as Record<string, string>) ? tr(key) : english;
}
