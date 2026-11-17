import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'gio.readAloud';

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const lang = (navigator.language || 'en').toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lang && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)) && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2))) ??
    null
  );
}

/** Turn the bubble's text into something pleasant to hear. */
function speakable(text: string): string {
  return text
    .replace(/•\s*/g, '')
    .replace(/\bFD\b/g, 'forward')
    .replace(/\bBK\b/g, 'back')
    .replace(/\bRT\b/g, 'right')
    .replace(/\bLT\b/g, 'left')
    .replace(/[[\]":;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
      const words = speakable(text);
      if (!words) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(words);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 0.98;
      u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  return { supported, enabled, setEnabled, speak };
}
