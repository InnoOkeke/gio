import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/** Little Turtles: under 8, blocks and voice. Turtle Coders: 8–12, text code plus Python and JavaScript. */
export type AgeMode = 'little' | 'coder';

const KEY = 'gio.mode';

const isMode = (v: unknown): v is AgeMode => v === 'little' || v === 'coder';

/** A link can pick the mode (e.g. a teacher sharing `?mode=little`); otherwise use the remembered choice. */
function readMode(): AgeMode | null {
  try {
    const fromLink = new URLSearchParams(window.location.search).get('mode');
    if (isMode(fromLink)) {
      localStorage.setItem(KEY, fromLink);
      return fromLink;
    }
    const v = localStorage.getItem(KEY);
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

interface ModeContextValue {
  mode: AgeMode | null;
  setMode(mode: AgeMode): void;
  /** Show the picker again (e.g. from the header). */
  chooseAgain(): void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AgeMode | null>(readMode);

  const setMode = useCallback((m: AgeMode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* Private browsing can block storage; the choice still applies for this visit. */
    }
    setModeState(m);
  }, []);

  const chooseAgain = useCallback(() => setModeState(null), []);

  return <ModeContext.Provider value={{ mode, setMode, chooseAgain }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside ModeProvider');
  return ctx;
}

export const MODE_LABEL: Record<AgeMode, string> = {
  little: 'Little Turtles',
  coder: 'Turtle Coders',
};
