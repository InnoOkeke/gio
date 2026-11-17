import { QUESTS, type Concept, type Feature, type QuestAudience } from '../../logo/quests.js';
import { FRIEND_IDS, SHELL_SLOTS, STICKER_IDS, type FriendId, type StickerId } from './catalog';

export interface RewardsState {
  v: 1;
  friends: FriendId[];
  stickers: StickerId[];
  /** What Gio wears, one entry per shell spot. */
  shell: (StickerId | null)[];
  /** Local calendar dates (YYYY-MM-DD) on which the child learned something. Oldest first. */
  days: string[];
}

export type RewardEvent =
  | { kind: 'run-ok'; features: readonly Feature[]; colours: number; drewLines: boolean }
  | { kind: 'quest-done'; questId: string; features: readonly Feature[]; colours: number; newBadge: Concept | null }
  | { kind: 'bug-fixed' };

export interface RewardResult {
  state: RewardsState;
  newFriends: FriendId[];
  newStickers: StickerId[];
}

export const MAX_DAYS = 400;

export function emptyRewards(): RewardsState {
  return { v: 1, friends: [], stickers: [], shell: Array.from({ length: SHELL_SLOTS }, () => null), days: [] };
}

/* ------------------------------------------------------------------ dates */

const DAY_MS = 86_400_000;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The child's local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  return `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Noon local time on a date key, or null if the key is not a real date. Noon keeps DST changes from shifting the day. */
function noon(key: string): Date | null {
  const m = DATE_KEY.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

function addDays(key: string, n: number): string {
  const base = noon(key);
  if (!base) return key;
  return localDateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n, 12));
}

/** Whole calendar days from a to b (negative if b is earlier). */
function dayDiff(a: string, b: string): number {
  const da = noon(a);
  const db = noon(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / DAY_MS);
}

export interface WeekDay {
  date: string;
  learned: boolean;
  isToday: boolean;
}

/** The last 7 calendar days, oldest first, ending today. */
export function weekView(days: readonly string[], today: string): WeekDay[] {
  const learned = new Set(days);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, learned: learned.has(date), isToday: date === today };
  });
}

export function daysThisWeek(days: readonly string[], today: string): number {
  return weekView(days, today).filter((d) => d.learned).length;
}

export function totalDays(days: readonly string[]): number {
  return days.length;
}

/** Whole days since the child last learned something. 0 if never, or if the clock moved backwards. */
export function daysAway(days: readonly string[], today: string): number {
  const last = days[days.length - 1];
  if (last === undefined) return 0;
  return Math.max(0, dayDiff(last, today));
}

function withDay(days: readonly string[], today: string): string[] {
  if (noon(today) === null) return [...days];
  const merged = [...new Set([...days, today])].sort();
  return merged.length > MAX_DAYS ? merged.slice(merged.length - MAX_DAYS) : merged;
}

/* ------------------------------------------------------------------ parsing */

const friendSet = new Set<string>(FRIEND_IDS);
const stickerSet = new Set<string>(STICKER_IDS);

function isFriend(x: unknown): x is FriendId {
  return typeof x === 'string' && friendSet.has(x);
}

function isSticker(x: unknown): x is StickerId {
  return typeof x === 'string' && stickerSet.has(x);
}

/** Read whatever came out of storage. Drops unknown ids, repairs the shell, and never throws. */
export function parseRewards(raw: unknown): RewardsState {
  if (typeof raw !== 'object' || raw === null) return emptyRewards();
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return emptyRewards();

  const friends = Array.isArray(o.friends) ? [...new Set(o.friends.filter(isFriend))] : [];
  const stickers = Array.isArray(o.stickers) ? [...new Set(o.stickers.filter(isSticker))] : [];

  const worn = new Set<StickerId>();
  const shell: (StickerId | null)[] = Array.from({ length: SHELL_SLOTS }, (_, i) => {
    const id = Array.isArray(o.shell) ? (o.shell as unknown[])[i] : null;
    if (isSticker(id) && stickers.includes(id) && !worn.has(id)) {
      worn.add(id);
      return id;
    }
    return null;
  });

  const days = Array.isArray(o.days)
    ? [...new Set(o.days.filter((d): d is string => typeof d === 'string' && noon(d) !== null))].sort()
    : [];

  return { v: 1, friends, stickers, shell, days: days.length > MAX_DAYS ? days.slice(days.length - MAX_DAYS) : days };
}

/* ------------------------------------------------------------------ earning */

const FEATURE_FRIEND: Partial<Record<Feature, FriendId>> = {
  REPEAT: 'olly',
  CIRCLE: 'puff',
  MAKE: 'nutmeg',
  IF: 'hoot',
  TO: 'bree',
  RECURSION: 'spindle',
  WHEN: 'hop',
};

function friendsFromSignals(features: readonly Feature[], colours: number): FriendId[] {
  const out: FriendId[] = [];
  for (const f of features) {
    const id = FEATURE_FRIEND[f];
    if (id) out.push(id);
  }
  if (colours >= 2) out.push('chip');
  return out;
}

function isDebuggingQuest(questId: string): boolean {
  return QUESTS.some((q) => q.id === questId && q.concept === 'debugging');
}

function firstFreeSlot(shell: readonly (StickerId | null)[]): number {
  return shell.findIndex((s) => s === null);
}

function grant(state: RewardsState, friends: FriendId[], stickers: StickerId[]): RewardResult {
  const newFriends = [...new Set(friends)].filter((f) => !state.friends.includes(f));
  const newStickers = [...new Set(stickers)].filter((s) => !state.stickers.includes(s));
  const shell = [...state.shell];
  for (const s of newStickers) {
    const slot = firstFreeSlot(shell);
    if (slot >= 0) shell[slot] = s;
  }
  return {
    state: { ...state, friends: [...state.friends, ...newFriends], stickers: [...state.stickers, ...newStickers], shell },
    newFriends,
    newStickers,
  };
}

/** Apply one learning event. Safe to apply twice: the second time earns nothing. `today` is a YYYY-MM-DD key. */
export function applyEvent(state: RewardsState, event: RewardEvent, today: string): RewardResult {
  let friends: FriendId[] = [];
  const stickers: StickerId[] = [];

  if (event.kind === 'run-ok') {
    friends = friendsFromSignals(event.features, event.colours);
    if (event.drewLines) stickers.push('first-drawing');
  } else if (event.kind === 'quest-done') {
    friends = friendsFromSignals(event.features, event.colours);
    if (event.newBadge) stickers.push(event.newBadge);
    if (isDebuggingQuest(event.questId)) {
      friends.push('dot');
      stickers.push('bug-fixer');
    }
  } else {
    friends.push('dot');
    stickers.push('bug-fixer');
  }

  const granted = grant(state, friends, stickers);
  return { ...granted, state: { ...granted.state, days: withDay(state.days, today) } };
}

/** Put a sticker the child has earned on a shell spot, or clear the spot with null. A sticker already worn moves. */
export function placeSticker(state: RewardsState, slot: number, id: StickerId | null): RewardsState {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SHELL_SLOTS) return state;
  if (id !== null && !state.stickers.includes(id)) return state;
  const shell = state.shell.map((s) => (id !== null && s === id ? null : s));
  shell[slot] = id;
  return { ...state, shell };
}

/** Rebuild what an existing child already earned from their completed quests. Adds no days. */
export function backfillFromProgress(completedQuestIds: readonly string[], today: string): RewardsState {
  void today;
  const done = new Set(completedQuestIds);
  const friends: FriendId[] = [];
  const stickers: StickerId[] = [];
  let any = false;

  for (const quest of QUESTS) {
    if (!done.has(quest.id)) continue;
    any = true;
    for (const f of quest.needs?.uses ?? []) {
      const id = FEATURE_FRIEND[f];
      if (id) friends.push(id);
    }
    if ((quest.needs?.minColours ?? 0) >= 2) friends.push('chip');
    if (quest.concept === 'debugging') {
      friends.push('dot');
      stickers.push('bug-fixer');
    }
  }
  if (any) stickers.push('first-drawing');

  const audiences: QuestAudience[] = ['little', 'coder'];
  const concepts = [...new Set(QUESTS.map((q) => q.concept))];
  for (const concept of concepts) {
    const complete = audiences.some((a) => {
      const inConcept = QUESTS.filter((q) => q.audience === a && q.concept === concept);
      return inConcept.length > 0 && inConcept.every((q) => done.has(q.id));
    });
    if (complete) stickers.push(concept);
  }

  return grant(emptyRewards(), friends, stickers).state;
}
