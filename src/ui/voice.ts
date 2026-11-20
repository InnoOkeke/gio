import { useCallback, useEffect, useRef, useState } from 'react';

/* Minimal typing for the Web Speech API, which TypeScript's DOM library doesn't include. */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const OFFLINE_VOICE = 'Talking to Gio needs the internet. You can still type.';
const FRIENDLY_ERRORS: Record<string, string> = {
  'not-allowed': 'I need permission to use the microphone. A grown-up can allow it in the browser.',
  'service-not-allowed': 'I need permission to use the microphone. A grown-up can allow it in the browser.',
  'no-speech': "I didn't hear anything. Tap the microphone and try again.",
  'audio-capture': "I can't find a microphone.",
  network: OFFLINE_VOICE,
};

/**
 * Tap-to-talk speech input using the browser's built-in speech recognition.
 * It only listens after a tap and stops after one phrase; nothing is recorded by GIO.
 */
export function useVoice(onText: (text: string) => void) {
  const [supported] = useState(() => typeof window !== 'undefined' && recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e) => {
      let text = '';
      for (let k = 0; k < e.results.length; k++) {
        const r = e.results[k]!;
        text += r[0].transcript;
        if (r.isFinal) finalText = text;
      }
      setHeard(text);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(navigator.onLine === false ? OFFLINE_VOICE : (FRIENDLY_ERRORS[e.error] ?? 'Something went wrong with the microphone. Try again?'));
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      const text = finalText.trim();
      if (text) onTextRef.current(text);
    };
    setError(null);
    setHeard('');
    setListening(true);
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
      setError('The microphone is busy. Try again in a moment.');
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, heard, error, start, stop };
}
