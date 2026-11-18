import { useCallback, useRef, useState } from 'react';
import { CONCEPTS, QUESTS, type Concept, type QuestAudience } from '../logo/quests.js';
import { localDateKey } from './gio/rewards';
import { islandOf, islandQuestIds, islandsFor } from './path/islands';
import {
  badgeEarned,
  finishReview as finishReviewIn,
  islandViews,
  masterReady,
  migrate,
  nextStop as nextStopIn,
  questState,
  recordQuest,
  reviewDue as reviewDueIn,
  reviewPlan as reviewPlanIn,
  type IslandView,
  type NextStop,
  type PathState,
  type QuestView,
  type Star,
} from './path/state';
import { passSkillCheck as passSkillCheckIn, skillCheckEligible, skillCheckPlan, type SkillChallenge } from './path/skill';

const KEY = 'gio.progress';
const PATH_KEY = 'gio.path';

function readCleared(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readPathRaw(): unknown {
  try {
    const stored = localStorage.getItem(PATH_KEY);
    return stored === null ? null : (JSON.parse(stored) as unknown);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be blocked in private browsing; progress then lasts for this visit only. */
  }
}

export interface Badge {
  concept: Concept;
  done: number;
  total: number;
  earned: boolean;
}

export interface CompleteResult {
  /** The concept badge, the first time the island is sailed. */
  newBadge: Concept | null;
  /** The star the quest has now: gold is `clean`, silver is `helped`. */
  star: Star;
  unitMastered: boolean;
  islandSailed: boolean;
  /** The island that opened because this one was sailed. */
  opened: string | null;
  /** The child just became a Logo Master. */
  masterEarned: boolean;
}

const NOTHING: CompleteResult = { newBadge: null, star: 'clean', unitMastered: false, islandSailed: false, opened: null, masterEarned: false };

interface Saved {
  cleared: string[];
  path: PathState;
}

function load(): Saved {
  const cleared = readCleared();
  const path = migrate(cleared, readPathRaw(), localDateKey(new Date()));
  writeKey(PATH_KEY, path);
  return { cleared, path };
}

/**
 * Cleared quests, stars, islands and review dates, kept only in this browser. No accounts, nothing sent
 * anywhere. `gio.progress` keeps its old format (a list of cleared quest ids); `gio.path` holds the rest.
 */
export function useProgress(audience: QuestAudience) {
  const [saved, setSaved] = useState<Saved>(load);
  const latest = useRef(saved);
  latest.current = saved;

  const commit = useCallback((next: Saved) => {
    latest.current = next;
    writeKey(KEY, next.cleared);
    writeKey(PATH_KEY, next.path);
    setSaved(next);
  }, []);

  const complete = useCallback(
    (id: string, helped: boolean): CompleteResult => {
      const { cleared, path } = latest.current;
      const quest = QUESTS.find((q) => q.id === id);
      if (!quest) return NOTHING;
      const done = recordQuest(path, cleared, id, helped, localDateKey(new Date()));
      commit({ cleared: done.cleared, path: done.state });
      const island = islandOf(id);
      const newBadge = done.events.islandSailed && island && !path.kept.includes(island.key) ? island.badge : null;
      return { newBadge, star: done.events.star, unitMastered: done.events.unitMastered, islandSailed: done.events.islandSailed, opened: done.events.opened, masterEarned: done.events.masterEarned };
    },
    [commit],
  );

  /** Open a stage after a passed skill check. Marks the skipped stages as tested out. */
  const passSkillCheck = useCallback(
    (key: string): { tested: string[]; masterEarned: boolean } => {
      const { cleared, path } = latest.current;
      const done = passSkillCheckIn(path, key, localDateKey(new Date()));
      if (done.tested.length > 0) commit({ cleared, path: done.state });
      return { tested: done.tested, masterEarned: done.masterEarned };
    },
    [commit],
  );

  const finishReview = useCallback(
    (key: string, results: readonly { questId: string; helped: boolean }[]) => {
      const { cleared, path } = latest.current;
      commit({ cleared, path: finishReviewIn(path, key, results, localDateKey(new Date())) });
    },
    [commit],
  );

  const { cleared: completed, path } = saved;
  const today = localDateKey(new Date());
  const quests = QUESTS.filter((q) => q.audience === audience);
  // One sticker per stage that has one. New stages earn a stage stamp instead and are not listed here.
  const badges: Badge[] = islandsFor(audience).flatMap((island) => {
    if (island.badge === null) return [];
    const ids = islandQuestIds(island);
    return [{ concept: island.badge, done: ids.filter((id) => completed.includes(id)).length, total: ids.length, earned: badgeEarned(path, island.key) }];
  });

  const islands: IslandView[] = islandViews(path, completed, audience);
  const nextStop = (): NextStop => nextStopIn(path, completed, audience, today);
  const due = reviewDueIn(path, today, audience);
  const quest = (id: string): QuestView => questState(path, completed, id);

  return {
    completed,
    complete,
    quests,
    badges,
    /** Where each quest of the mode's islands stands: stars, locks, units and sailing. */
    islands,
    path,
    quest,
    /** Where the one Go button and "Next quest" should lead. */
    nextStop,
    /** The island whose review is due today, or null. At most one review is finished a day. */
    reviewDue: due,
    /** The quests a review of this island visits. */
    reviewPlan: (key: string): string[] => reviewPlanIn(path, completed, key),
    finishReview,
    passSkillCheck,
    /** The challenges for a skill check that opens this stage, or none when it cannot be skipped to. */
    skillCheck: (key: string): SkillChallenge[] => skillCheckPlan(path, completed, key),
    skillCheckEligible: (key: string): boolean => skillCheckEligible(path, completed, key),
    /** The date the child became a Logo Master in this mode, or null. */
    masterOn: path.master[audience] ?? null,
    masterReady: masterReady(path, audience),
  };
}

export { CONCEPTS };
