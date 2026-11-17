import { useCallback, useState } from 'react';
import { CONCEPTS, QUESTS, type Concept, type QuestAudience } from '../logo/quests.js';

const KEY = 'gio.progress';

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export interface Badge {
  concept: Concept;
  done: number;
  total: number;
  earned: boolean;
}

/** Completed quests and badges, kept only in this browser. No accounts, nothing sent anywhere. */
export function useProgress(audience: QuestAudience) {
  const [completed, setCompleted] = useState<string[]>(read);

  const complete = useCallback((id: string): { newBadge: Concept | null } => {
    const before = read();
    if (before.includes(id)) return { newBadge: null };
    const after = [...before, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(after));
    } catch {
      /* Storage can be blocked in private browsing; progress then lasts for this visit only. */
    }
    setCompleted(after);
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest) return { newBadge: null };
    const inConcept = QUESTS.filter((q) => q.audience === quest.audience && q.concept === quest.concept);
    const wasEarned = inConcept.every((q) => before.includes(q.id));
    const nowEarned = inConcept.every((q) => after.includes(q.id));
    return { newBadge: !wasEarned && nowEarned ? quest.concept : null };
  }, []);

  const quests = QUESTS.filter((q) => q.audience === audience);
  const concepts = [...new Set(quests.map((q) => q.concept))];
  const badges: Badge[] = concepts.map((concept) => {
    const inConcept = quests.filter((q) => q.concept === concept);
    const done = inConcept.filter((q) => completed.includes(q.id)).length;
    return { concept, done, total: inConcept.length, earned: done === inConcept.length };
  });

  return { completed, complete, quests, badges };
}

export { CONCEPTS };
