import { useCallback, useRef, useState } from 'react';
import type { AgeModeId, Level, LevelOutcome, RealmId } from '../../logo/adventure/index.js';
import { localDateKey, type RewardEvent } from '../gio/rewards';
import { emptyAdventure, markIntro, parseAdventure, parsePlans, recordLevel, rewardFor, savePlan, type AdventureState, type RecordResult, type SavedPlans } from './state';

export const ADVENTURE_KEY = 'gio.adventure';
export const PLANS_KEY = 'gio.adventure.code';

/** The part of Storage the adventure needs, so tests can use a plain object. */
export type KeyStore = Pick<Storage, 'getItem' | 'setItem'>;

function readJson(store: KeyStore, key: string): unknown {
  try {
    const stored = store.getItem(key);
    return stored === null ? null : (JSON.parse(stored) as unknown);
  } catch {
    return null;
  }
}

function writeJson(store: KeyStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be blocked in private browsing; progress then lasts for this visit only. */
  }
}

export function readAdventure(store: KeyStore): AdventureState {
  return parseAdventure(readJson(store, ADVENTURE_KEY));
}

export function readPlans(store: KeyStore): SavedPlans {
  return parsePlans(readJson(store, PLANS_KEY));
}

export function writeAdventure(store: KeyStore, state: AdventureState): void {
  writeJson(store, ADVENTURE_KEY, state);
}

export function writePlans(store: KeyStore, plans: SavedPlans): void {
  writeJson(store, PLANS_KEY, plans);
}

function browserStore(): KeyStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export interface FinishResult extends RecordResult {
  /** Pass this to `useRewards().record` when it is not null. */
  reward: RewardEvent | null;
}

/**
 * Stars, realm intros and the last plan per level, kept only in this browser. Nothing is sent anywhere.
 * It never touches `gio.progress`, `gio.path` or `gio.rewards`; the caller records `reward` through `useRewards`.
 */
export function useAdventure() {
  const [state, setState] = useState<AdventureState>(() => {
    const store = browserStore();
    return store ? readAdventure(store) : emptyAdventure();
  });
  const [plans, setPlans] = useState<SavedPlans>(() => {
    const store = browserStore();
    return store ? readPlans(store) : {};
  });
  const latest = useRef(state);
  latest.current = state;
  const latestPlans = useRef(plans);
  latestPlans.current = plans;

  const finish = useCallback((level: Level, mode: AgeModeId, code: string, outcome: LevelOutcome): FinishResult => {
    const result = recordLevel(latest.current, mode, level, outcome, localDateKey(new Date()));
    if (result.state !== latest.current) {
      latest.current = result.state;
      const store = browserStore();
      if (store) writeAdventure(store, result.state);
      setState(result.state);
    }
    return { ...result, reward: rewardFor(level, mode, code, outcome) };
  }, []);

  const introSeen = useCallback((realm: RealmId) => {
    const next = markIntro(latest.current, realm);
    if (next === latest.current) return;
    latest.current = next;
    const store = browserStore();
    if (store) writeAdventure(store, next);
    setState(next);
  }, []);

  const rememberPlan = useCallback((mode: AgeModeId, levelId: string, code: string) => {
    const next = savePlan(latestPlans.current, mode, levelId, code);
    if (next === latestPlans.current) return;
    latestPlans.current = next;
    const store = browserStore();
    if (store) writePlans(store, next);
    setPlans(next);
  }, []);

  return { state, plans, finish, introSeen, rememberPlan };
}
