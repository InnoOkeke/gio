import { useCallback, useEffect, useRef, useState } from 'react';
import { isLang } from '../i18n/index.js';
import { speakable, voiceLangs } from './speakable';

const KEY = 'gio.readAloud';

/** The language GIO is showing (LangProvider sets <html lang>), so French text is read by a French voice. */
function appLang(): string {
  return document.documentElement.lang || navigator.language || 'en';
}

function pickVoice(langs: string[]): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of langs) {
    const exact = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-') === lang;
    const sameBase = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(lang.slice(0, 2));
    const voice =
      voices.find((v) => exact(v) && v.localService) ??
      voices.find(exact) ??
      (lang.length === 2 ? voices.find((v) => sameBase(v) && v.localService) ?? voices.find(sameBase) : undefined);
    if (voice) return voice;
  }
  return null;
}
/**
 * Reads the turtle's messages aloud with the browser's built-in voices, so children who can't read yet
 * can still use GIO. Speech is generated on the device where the browser supports it.
 */
export function useReadAloud(defaultOn: boolean) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved === null ? defaultOn : saved === 'on';
    } catch {
      return defaultOn;
    }
  });
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
      } catch {
        /* storage blocked: the setting lasts for this visit */
      }
      if (!on && supported) window.speechSynthesis.cancel();
    },
    [supported],
  );

  const speak = useCallback(
    (text: string, force = false) => {
      if (!supported || (!enabledRef.current && !force)) return;
      const lang = appLang();
      const pieces = speakable(text, isLang(lang) ? lang : 'en');
      if (pieces.length === 0) return;
      window.speechSynthesis.cancel();
      const langs = voiceLangs(lang);
      const voice = pickVoice(langs);
      // One sentence (or a few short ones) per utterance: the voice pauses between them and long text is not cut off.
      for (const piece of pieces) {
        const u = new SpeechSynthesisUtterance(piece);
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? langs[0]!;
        u.rate = 0.95;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      }
    },
    [supported],
  );

  return { supported, enabled, setEnabled, speak };
}
