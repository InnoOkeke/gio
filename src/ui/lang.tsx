import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLocale, guessLang, isLocaleLoaded, loadLocale, t as format, type Lang, type Locale, type Params } from '../i18n/index.js';
import { currentLang, LANG_KEY, readStoredLang, setActiveLang } from './lang-state';

interface LangContextValue {
  lang: Lang;
  locale: Locale;
  /** True once the child (or a link) picked a language, false while it is only the browser's guess. */
  chosen: boolean;
  setLang(lang: Lang): void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Lang | null>(readStoredLang);
  const lang: Lang = stored ?? guessLang(typeof navigator === 'undefined' ? undefined : navigator.languages);
  // A language other than English arrives in its own file. Until then the screen stays in English.
  const [, setLoaded] = useState(0);
  const ready = isLocaleLoaded(lang);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadLocale(lang)
      .then(() => live && setLoaded((n) => n + 1))
      .catch(() => {
        /* Offline with no copy saved yet: English stays until the file can load. */
      });
    return () => {
      live = false;
    };
  }, [lang, ready]);
  setActiveLang(lang);
  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* Private browsing can block storage; the choice still applies for this visit. */
    }
    setStored(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<LangContextValue>(() => ({ lang, locale: getLocale(lang), chosen: stored !== null, setLang }), [lang, stored, setLang, ready]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  // Outside the provider (a lone component in a test, the error screen) the current language still applies.
  if (!ctx) {
    const lang = currentLang();
    return { lang, locale: getLocale(lang), chosen: false, setLang: setActiveLang };
  }
  return ctx;
}

/** The message translator for the current language: `t('btn.close')`, `t('keys.type', { label })`. */
export function useT(): (key: string, params?: Params) => string {
  const { locale } = useLang();
  return useCallback((key, params) => format(locale.messages, key, params), [locale]);
}
