import { getLocale, guessLang, isLang, t, type Lang, type Params } from '../i18n/index.js';
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
}/** A Logo problem (or a quest checker message) in the current language. English is always the original message. */
export function problemText(problem: { message: string; key?: string; params?: Params }): string {
  const lang = currentLang();
  if (lang === 'en' || !problem.key) return problem.message;
  const locale = getLocale(lang);
  const template = locale.logoErrors[problem.key] ?? (locale.messages as Record<string, string>)[problem.key];
  if (!template) return problem.message;
  const params = Object.fromEntries(Object.entries(problem.params ?? {}).map(([k, v]) => [k, typeof v === 'string' && v.startsWith('@') ? problemText({ message: v, key: v.slice(1) }) : v]));
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}
