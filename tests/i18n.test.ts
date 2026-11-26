import { describe, expect, it } from 'vitest';
import { getLocale, guessLang, isLang, LANGS, plural, t, type Lang } from '../src/i18n/index.js';
import { messages as en } from '../src/i18n/locales/en.js';

const OTHERS: Lang[] = ['pcm', 'fr', 'es'];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('format', () => {
  it('fills {name} placeholders and leaves unknown ones alone', () => {
    expect(t({ a: 'Hi {name}, {x}' }, 'a', { name: 'Ada' })).toBe('Hi Ada, {x}');
  });
  it('falls back to English, then the key, when a message is missing', () => {
    expect(t({}, 'btn.close')).toBe('Close');
    expect(t({}, 'no.such.key')).toBe('no.such.key');
  });
  it('plural picks .one or .other with Intl.PluralRules', () => {
    const m = { 'stars.one': '{n} star', 'stars.other': '{n} stars' };
    expect(plural(m, 'stars', 1)).toBe('1 star');
    expect(plural(m, 'stars', 2)).toBe('2 stars');
    expect(plural(m, 'stars', 0)).toBe('0 stars');
    expect(plural({ 'e.one': '{n} étoile', 'e.other': '{n} étoiles' }, 'e', 0, 'fr')).toBe('0 étoile');
  });
});

describe('guessLang', () => {
  it('reads the browser languages', () => {
    expect(guessLang(['fr-FR', 'en'])).toBe('fr');
    expect(guessLang(['es-MX'])).toBe('es');
    expect(guessLang(['en-NG'])).toBe('en');
    expect(guessLang(['de-DE', 'es'])).toBe('es');
    expect(guessLang(['en-GB', 'fr'])).toBe('en');
    expect(guessLang([])).toBe('en');
    expect(guessLang(undefined)).toBe('en');
  });
  it('isLang knows the four languages only', () => {
    expect(LANGS.map((l) => l.id)).toEqual(['en', 'pcm', 'fr', 'es']);
    expect(isLang('pcm')).toBe(true);
    expect(isLang('de')).toBe(false);
  });
});

describe('locale parity', () => {
  it.each(OTHERS)('%s has every English key with the same placeholders', (lang) => {
    const m: Record<string, string> = getLocale(lang).messages;
    expect(Object.keys(m).sort()).toEqual(Object.keys(en).sort());
    for (const [key, text] of Object.entries(en)) {
      expect(placeholders(m[key]!), `${lang} ${key}`).toEqual(placeholders(text));
      expect(m[key]!.trim().length, `${lang} ${key} is empty`).toBeGreaterThan(0);
    }
  });
  it.each(OTHERS)('%s short labels fit the phone layout', (lang) => {
    const m: Record<string, string> = getLocale(lang).messages;
    for (const [key, text] of Object.entries(en)) {
      if (!key.startsWith('btn.') && !key.startsWith('nav.')) continue;
      expect(m[key]!.length, `${lang} ${key}`).toBeLessThanOrEqual(Math.ceil(text.length * 1.6) + 6);
    }
  });
});
