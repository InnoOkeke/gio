import { useRef } from 'react';

/**
 * Where a child got help with a quest. A quest solved with no help earns a gold star, and one solved
 * after help earns a silver star (which can be replayed for gold).
 *
 * Help is: the Hint button or spoken "hint", the "Explain my code" answer, and the tutor hint ladder.
 * Not help: the faint goal drawing, the checker's feedback after a run, Step, read-aloud, running
 * again, and the starter code of a debugging quest.
 *
 * Contract for the tutor hint ladder (Phase 2): every rung that tells the child more than the goal
 * already shows must call `help.note('tutor')`. A rung that only restates the goal or asks the child
 * to read it again may skip the call. Get the shared tracker with `useQuestHelp()`.
 */
export type HelpSource = 'hint' | 'explain' | 'tutor';

export interface HelpTracker {
  /** Record that the child used help on the current quest. */
  note(source: HelpSource): void;
  /** True when any help was noted since the quest started. */
  used(): boolean;
  /** Forget all help. Call this when a quest starts. */
  reset(): void;
}

export function createHelpTracker(): HelpTracker {
  const sources = new Set<HelpSource>();
  return {
    note: (source) => {
      sources.add(source);
    },
    used: () => sources.size > 0,
    reset: () => {
      sources.clear();
    },
  };
}

/** One tracker for the life of the component. It sits in a ref, so noting help never re-renders. */
export function useQuestHelp(): HelpTracker {
  const ref = useRef<HelpTracker | null>(null);
  if (ref.current === null) ref.current = createHelpTracker();
  return ref.current;
}
