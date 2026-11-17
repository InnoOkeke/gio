import { useCallback, useRef, useState } from 'react';
import type { FriendId, StickerId } from './gio/catalog';
import { applyEvent, backfillFromProgress, emptyRewards, localDateKey, parseRewards, placeSticker, type RewardEvent, type RewardsState } from './gio/rewards';

const KEY = 'gio.rewards';
const PROGRESS_KEY = 'gio.progress';

function write(state: RewardsState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage can be blocked in private browsing; rewards then last for this visit only. */
  }
}

function questIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function read(): RewardsState {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    return emptyRewards();
  }
  if (stored !== null) {
    try {
      return parseRewards(JSON.parse(stored) as unknown);
    } catch {
      return emptyRewards();
    }
  }
  // First visit since rewards began: give back what the child already earned.
  const ids = questIds();
  if (ids.length === 0) return emptyRewards();
  const filled = backfillFromProgress(ids, localDateKey(new Date()));
  write(filled);
  return filled;
}

/** Friends, stickers, shell and learning days, kept only in this browser. Nothing is sent anywhere. */
export function useRewards() {
  const [state, setState] = useState<RewardsState>(read);
  const latest = useRef(state);

  const commit = useCallback((next: RewardsState) => {
    latest.current = next;
    write(next);
    setState(next);
  }, []);

  const record = useCallback(
    (event: RewardEvent): { newFriends: FriendId[]; newStickers: StickerId[] } => {
      const result = applyEvent(latest.current, event, localDateKey(new Date()));
      commit(result.state);
      return { newFriends: result.newFriends, newStickers: result.newStickers };
    },
    [commit],
  );

  const wear = useCallback(
    (slot: number, id: StickerId | null) => {
      commit(placeSticker(latest.current, slot, id));
    },
    [commit],
  );

  return { state, record, wear };
}
