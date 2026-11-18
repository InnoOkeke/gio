import { QUESTS, type QuestAudience } from '../../logo/quests.js';
import { addDays, dayDiff, isDateKey } from '../gio/rewards';
import { ALL_ISLANDS, islandQuestIds, islandsFor, placeOf, type Island } from './islands';
import { LEGACY_QUEST_IDS } from './legacy';

/**
 * The adventure map's rules, with no React and no storage so they can be tested.
 * `gio.progress` (the list of cleared quest ids) stays the source of "cleared". This state only
 * adds what is new: which stars were earned, which islands are sailed, and the review schedule.
 */

/** `clean` is a gold star (no help), `helped` is a silver star. */
export type Star = 'clean' | 'helped';

export interface QuestRecord {
  s: Star;
  /** Local date the quest was last solved. */
  d: string;
}

export interface ReviewRecord {
  /** How many reviews were passed without help. Never goes down. */
  box: number;
  /** The date this island's next review is due. */
  due: string;
  /** The quests used in the last review. */
  last: string[];
}

export interface PathState {
  v: 1;
  quests: Record<string, QuestRecord>;
  /** Island key to the date it was first sailed. Never undone. */
  sailed: Record<string, string>;
  /** Island keys whose badge was earned under the old rule. Badges never disappear. */
  kept: string[];
  reviews: Record<string, ReviewRecord>;
  /** The date of the last finished review, so there is at most one a day. */
  reviewedOn: string | null;
}

/** Different gold stars needed to master a unit. The third quest of a unit is a bonus. */
export const GOLD_TO_MASTER = 2;
/** Days until the first review of a newly sailed island. */
export const FIRST_REVIEW_DAYS = 2;
/** Days until the next review, by how many reviews were passed: 2, 7, 21, then 60 from then on. */
export const REVIEW_INTERVALS: readonly number[] = [2, 7, 21, 60];
/** Days until a review is offered again after help was used. */
export const HELPED_REVIEW_DAYS = 2;
/** How many quests one review visits. */
export const REVIEW_SIZE = 2;
const MAX_BOX = 20;

const QUEST_IDS: ReadonlySet<string> = new Set(QUESTS.map((q) => q.id));
const ISLAND_KEYS: ReadonlySet<string> = new Set(ALL_ISLANDS.map((i) => i.key));

export function emptyPath(): PathState {
  return { v: 1, quests: {}, sailed: {}, kept: [], reviews: {}, reviewedOn: null };
}

/* ------------------------------------------------------------------ parsing */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isDate(x: unknown): x is string {
  return typeof x === 'string' && isDateKey(x);
}

/** True when raw is a stored path state of a version this code understands. */
export function hasStoredPath(raw: unknown): boolean {
  return isObject(raw) && raw.v === 1;
}

/** Read whatever came out of storage. Drops unknown ids and bad dates, and never throws. */
export function parsePath(raw: unknown): PathState {
  if (!hasStoredPath(raw)) return emptyPath();
  const o = raw as Record<string, unknown>;
  const out = emptyPath();

  if (isObject(o.quests)) {
    for (const [id, rec] of Object.entries(o.quests)) {
      if (!QUEST_IDS.has(id) || !isObject(rec)) continue;
      if ((rec.s === 'clean' || rec.s === 'helped') && isDate(rec.d)) out.quests[id] = { s: rec.s, d: rec.d };
    }
  }
  if (isObject(o.sailed)) {
    for (const [key, date] of Object.entries(o.sailed)) {
      if (ISLAND_KEYS.has(key) && isDate(date)) out.sailed[key] = date;
    }
  }
  if (Array.isArray(o.kept)) out.kept = [...new Set(o.kept.filter((k): k is string => typeof k === 'string' && ISLAND_KEYS.has(k)))];
  if (isObject(o.reviews)) {
    for (const [key, rec] of Object.entries(o.reviews)) {
      if (!ISLAND_KEYS.has(key) || !isObject(rec)) continue;
      if (typeof rec.box !== 'number' || !Number.isInteger(rec.box) || rec.box < 0 || !isDate(rec.due)) continue;
      const last = Array.isArray(rec.last) ? [...new Set(rec.last.filter((id): id is string => typeof id === 'string' && QUEST_IDS.has(id)))].slice(0, REVIEW_SIZE) : [];
      out.reviews[key] = { box: Math.min(rec.box, MAX_BOX), due: rec.due, last };
    }
  }
  if (isDate(o.reviewedOn)) out.reviewedOn = o.reviewedOn;
  return out;
}

/* ------------------------------------------------------------------ views */

export type QuestStatus = 'locked' | 'open' | 'cleared';

export interface QuestView {
  id: string;
  status: QuestStatus;
  /** gold (`clean`) or silver (`helped`) for a cleared quest, otherwise null. */
  star: Star | null;
}

export interface UnitView {
  index: number;
  quests: QuestView[];
  status: 'locked' | 'open';
  mastered: boolean;
  gold: number;
  silver: number;
  cleared: number;
}

export interface IslandView {
  island: Island;
  status: 'locked' | 'open';
  sailed: boolean;
  sailedOn: string | null;
  units: UnitView[];
  gold: number;
  silver: number;
  cleared: number;
  total: number;
  /** Every unit mastered. An island is sailed once, the first time this is true. */
  mastered: boolean;
}

function starFor(state: PathState, cleared: ReadonlySet<string>, id: string): Star | null {
  if (!cleared.has(id)) return null;
  // A cleared quest with no record is from before stars were tracked: it counts as gold.
  return state.quests[id]?.s ?? 'clean';
}

function countStars(state: PathState, cleared: ReadonlySet<string>, ids: readonly string[]): { gold: number; silver: number; cleared: number } {
  let gold = 0;
  let silver = 0;
  for (const id of ids) {
    const s = starFor(state, cleared, id);
    if (s === 'clean') gold++;
    else if (s === 'helped') silver++;
  }
  return { gold, silver, cleared: gold + silver };
}

function unitMastered(state: PathState, cleared: ReadonlySet<string>, ids: readonly string[]): boolean {
  return countStars(state, cleared, ids).gold >= GOLD_TO_MASTER;
}

function islandMastered(state: PathState, cleared: ReadonlySet<string>, island: Island): boolean {
  return island.units.every((u) => unitMastered(state, cleared, u));
}

function toSet(cleared: readonly string[]): ReadonlySet<string> {
  return new Set(cleared);
}

function islandIndex(island: Island): number {
  return islandsFor(island.audience).findIndex((i) => i.key === island.key);
}

function viewIsland(state: PathState, cleared: ReadonlySet<string>, island: Island): IslandView {
  const all = islandsFor(island.audience);
  const at = islandIndex(island);
  const previous = at > 0 ? all[at - 1] : undefined;
  const ids = islandQuestIds(island);
  const touched = ids.some((id) => cleared.has(id));
  const open = previous === undefined || state.sailed[previous.key] !== undefined || touched;

  const units: UnitView[] = island.units.map((unit, index) => {
    const unitTouched = unit.some((id) => cleared.has(id));
    const unitOpen = open && (index === 0 || unitTouched || unitMastered(state, cleared, island.units[index - 1]!));
    const quests: QuestView[] = unit.map((id, q) => {
      const star = starFor(state, cleared, id);
      if (star !== null) return { id, status: 'cleared', star };
      const earlierDone = unit.slice(0, q).every((e) => cleared.has(e));
      return { id, status: unitOpen && earlierDone ? 'open' : 'locked', star: null };
    });
    const counts = countStars(state, cleared, unit);
    return { index, quests, status: unitOpen ? 'open' : 'locked', mastered: counts.gold >= GOLD_TO_MASTER, ...counts };
  });

  const counts = countStars(state, cleared, ids);
  return {
    island,
    status: open ? 'open' : 'locked',
    sailed: state.sailed[island.key] !== undefined,
    sailedOn: state.sailed[island.key] ?? null,
    units,
    ...counts,
    total: ids.length,
    mastered: units.every((u) => u.mastered),
  };
}

/** One island with its units and quests, ready to draw. Throws only for a key that is not an island. */
export function islandState(state: PathState, cleared: readonly string[], key: string): IslandView {
  const island = ALL_ISLANDS.find((i) => i.key === key);
  if (!island) throw new Error(`Unknown island ${key}`);
  return viewIsland(state, toSet(cleared), island);
}

/** Every island for one mode, in sailing order. */
export function islandViews(state: PathState, cleared: readonly string[], audience: QuestAudience): IslandView[] {
  const set = toSet(cleared);
  return islandsFor(audience).map((i) => viewIsland(state, set, i));
}

export function unitState(state: PathState, cleared: readonly string[], key: string, unitIndex: number): UnitView {
  const unit = islandState(state, cleared, key).units[unitIndex];
  if (!unit) throw new Error(`Island ${key} has no unit ${unitIndex}`);
  return unit;
}

export function questState(state: PathState, cleared: readonly string[], questId: string): QuestView {
  const place = placeOf(questId);
  if (!place) return { id: questId, status: 'locked', star: null };
  const unit = islandState(state, cleared, place.island.key).units[place.unitIndex]!;
  return unit.quests[place.index]!;
}

/** True when the island's badge is earned: sailed now, or earned under the old rule before the map existed. */
export function badgeEarned(state: PathState, key: string): boolean {
  return state.sailed[key] !== undefined || state.kept.includes(key);
}

/* ------------------------------------------------------------------ migration */

function sail(state: PathState, key: string, today: string): PathState {
  return {
    ...state,
    sailed: { ...state.sailed, [key]: today },
    reviews: { ...state.reviews, [key]: { box: 0, due: addDays(today, FIRST_REVIEW_DAYS), last: [] } },
  };
}

/**
 * Bring stored data up to date. Every cleared quest with no star record is gold dated today, so nobody
 * is penalised for what they did before stars existed. On the first run, islands whose old concept
 * badge was already earned are remembered in `kept`, so no badge ever disappears.
 */
export function migrate(clearedIds: readonly string[], raw: unknown, today: string): PathState {
  const first = !hasStoredPath(raw);
  const parsed = parsePath(raw);
  const cleared = new Set(clearedIds.filter((id) => QUEST_IDS.has(id)));

  const quests: Record<string, QuestRecord> = {};
  for (const id of cleared) quests[id] = parsed.quests[id] ?? { s: 'clean', d: today };
  let state: PathState = { ...parsed, quests };

  if (first) {
    const kept = ALL_ISLANDS.filter((island) => {
      const legacy = islandQuestIds(island).filter((id) => LEGACY_QUEST_IDS.includes(id));
      return legacy.length > 0 && legacy.every((id) => cleared.has(id));
    }).map((i) => i.key);
    state = { ...state, kept };
  }

  for (const island of ALL_ISLANDS) {
    if (state.sailed[island.key] === undefined && islandMastered(state, cleared, island)) state = sail(state, island.key, today);
  }
  return state;
}

/* ------------------------------------------------------------------ recording a solved quest */

export interface QuestEvents {
  /** The star the quest has now. Gold is never downgraded. */
  star: Star;
  firstClear: boolean;
  /** A silver star became gold. */
  upgraded: boolean;
  unitMastered: boolean;
  islandSailed: boolean;
  /** The island that opened because this one was sailed. */
  opened: string | null;
}

export interface RecordResult {
  state: PathState;
  cleared: string[];
  events: QuestEvents;
}

/** Record a solved quest. Gold stays gold, silver can become gold, and sailing an island is never undone. */
export function recordQuest(state: PathState, clearedIds: readonly string[], id: string, helped: boolean, today: string): RecordResult {
  const place = placeOf(id);
  const played: Star = helped ? 'helped' : 'clean';
  if (!place || !QUEST_IDS.has(id)) {
    return { state, cleared: [...clearedIds], events: { star: played, firstClear: false, upgraded: false, unitMastered: false, islandSailed: false, opened: null } };
  }

  const before = toSet(clearedIds);
  const wasCleared = before.has(id);
  const previous = starFor(state, before, id);
  const star: Star = previous === 'clean' ? 'clean' : played;
  const upgraded = previous === 'helped' && star === 'clean';

  const after = new Set(before).add(id);
  let next: PathState = { ...state, quests: { ...state.quests, [id]: { s: star, d: today } } };

  const unit = place.island.units[place.unitIndex]!;
  const unitWas = unitMastered(state, before, unit);
  const unitNow = unitMastered(next, after, unit);

  const siblings = islandsFor(place.island.audience);
  const following = siblings[islandIndex(place.island) + 1];
  const followingWasOpen = following ? viewIsland(state, before, following).status === 'open' : true;

  let islandSailed = false;
  if (next.sailed[place.island.key] === undefined && islandMastered(next, after, place.island)) {
    next = sail(next, place.island.key, today);
    islandSailed = true;
  }

  const opened = islandSailed && following && !followingWasOpen && viewIsland(next, after, following).status === 'open' ? following.key : null;

  return {
    state: next,
    cleared: wasCleared ? [...clearedIds] : [...clearedIds, id],
    events: { star, firstClear: !wasCleared, upgraded, unitMastered: !unitWas && unitNow, islandSailed, opened },
  };
}

/* ------------------------------------------------------------------ reviews */

/**
 * The island with the most overdue review, or null. At most one review is finished per calendar day,
 * and a clock moved backwards simply makes a review not yet due. Pass an audience to look at one mode.
 */
export function reviewDue(state: PathState, today: string, audience?: QuestAudience): string | null {
  if (state.reviewedOn === today) return null;
  let best: { key: string; due: string } | null = null;
  for (const island of ALL_ISLANDS) {
    if (audience !== undefined && island.audience !== audience) continue;
    const rec = state.reviews[island.key];
    if (!rec || state.sailed[island.key] === undefined) continue;
    if (dayDiff(rec.due, today) < 0) continue;
    if (best === null || dayDiff(rec.due, best.due) > 0) best = { key: island.key, due: rec.due };
  }
  return best ? best.key : null;
}

/**
 * The quests a review visits: the cleared quests of the island done longest ago, ties in island order.
 * Quests used in the last review are skipped when there are enough others.
 */
export function reviewPlan(state: PathState, clearedIds: readonly string[], key: string): string[] {
  const island = ALL_ISLANDS.find((i) => i.key === key);
  if (!island) return [];
  const cleared = toSet(clearedIds);
  const ordered = islandQuestIds(island)
    .map((id, order) => ({ id, order, date: state.quests[id]?.d ?? '' }))
    .filter((q) => cleared.has(q.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order))
    .map((q) => q.id);
  const last = new Set(state.reviews[key]?.last ?? []);
  const fresh = ordered.filter((id) => !last.has(id));
  const pick = fresh.slice(0, REVIEW_SIZE);
  if (pick.length < REVIEW_SIZE) pick.push(...ordered.filter((id) => last.has(id)).slice(0, REVIEW_SIZE - pick.length));
  return pick;
}

/**
 * Close a review. Every quest solved without help: the box goes up and the next review is due after the
 * next interval. Any help: the box stays and the review comes back in 2 days. Boxes never go down.
 */
export function finishReview(state: PathState, key: string, results: readonly { questId: string; helped: boolean }[], today: string): PathState {
  const rec = state.reviews[key];
  if (!rec || state.sailed[key] === undefined) return state;
  const clean = results.length > 0 && results.every((r) => !r.helped);
  const box = clean ? Math.min(rec.box + 1, MAX_BOX) : rec.box;
  const days = clean ? REVIEW_INTERVALS[Math.min(box, REVIEW_INTERVALS.length - 1)]! : HELPED_REVIEW_DAYS;
  const last = [...new Set(results.map((r) => r.questId).filter((id) => QUEST_IDS.has(id)))].slice(0, REVIEW_SIZE);
  return {
    ...state,
    reviews: { ...state.reviews, [key]: { box, due: addDays(today, days), last } },
    reviewedOn: today,
  };
}

/* ------------------------------------------------------------------ next stop */

export type NextStop =
  /** The first open quest nobody has cleared yet. */
  | { kind: 'quest'; questId: string; islandKey: string; unitIndex: number }
  /** A unit with every quest cleared but fewer than two gold stars: try a silver quest again on your own. */
  | { kind: 'retry'; questId: string; islandKey: string; unitIndex: number }
  /** Every island is sailed and a bonus quest is still waiting. */
  | { kind: 'bonus'; questId: string; islandKey: string; unitIndex: number }
  /** Every island is sailed and a review is due. */
  | { kind: 'review'; islandKey: string }
  /** Every island is sailed and every quest cleared. */
  | { kind: 'done' };

/**
 * Where to go next in one mode: the first open uncleared quest in the earliest unmastered unit of the
 * earliest unsailed open island. After every island is sailed: a due review, then a bonus quest, then done.
 */
export function nextStop(state: PathState, clearedIds: readonly string[], audience: QuestAudience, today: string): NextStop {
  const views = islandViews(state, clearedIds, audience);

  for (const view of views) {
    if (view.sailed || view.status !== 'open') continue;
    const unit = view.units.find((u) => u.status === 'open' && !u.mastered);
    if (!unit) continue;
    const fresh = unit.quests.find((q) => q.status === 'open');
    if (fresh) return { kind: 'quest', questId: fresh.id, islandKey: view.island.key, unitIndex: unit.index };
    const silver = unit.quests.find((q) => q.star === 'helped');
    if (silver) return { kind: 'retry', questId: silver.id, islandKey: view.island.key, unitIndex: unit.index };
  }

  const review = reviewDue(state, today, audience);
  if (review) return { kind: 'review', islandKey: review };

  for (const view of views) {
    for (const unit of view.units) {
      const bonus = unit.quests.find((q) => q.status === 'open');
      if (bonus) return { kind: 'bonus', questId: bonus.id, islandKey: view.island.key, unitIndex: unit.index };
    }
  }
  return { kind: 'done' };
}
