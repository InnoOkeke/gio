import { messages as english } from './locales/en.js';
import type { Lang } from './types.js';

export type Params = Readonly<Record<string, string | number>>;

const fill = (template: string, params?: Params): string =>
  params ? template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole)) : template;

const englishMessages: Readonly<Record<string, string>> = english;

/** A message with its {name} placeholders filled in. A key missing at run time falls back to the English text, then to the key. */
export function t(messages: Readonly<Record<string, string>>, key: string, params?: Params): string {
  return fill(messages[key] ?? englishMessages[key] ?? key, params);
}

/** Pidgin counts like English. */
const RULE_LOCALE: Record<Lang, string> = { en: 'en', pcm: 'en', fr: 'fr', es: 'es' };

/** The `key.one` or `key.other` message for a count; {n} is filled in with the count. */
export function plural(messages: Readonly<Record<string, string>>, key: string, n: number, lang: Lang = 'en'): string {
  const rule = new Intl.PluralRules(RULE_LOCALE[lang]).select(n);
  const form = rule === 'one' ? 'one' : 'other';
  const chosen = `${key}.${form}` in messages || `${key}.${form}` in englishMessages ? `${key}.${form}` : `${key}.other`;
  return t(messages, chosen, { n });
}
