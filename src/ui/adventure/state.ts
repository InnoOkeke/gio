import { LEVELS, checkAdventure } from '../../logo/adventure/index.js';
import type { AgeModeId, Level, LevelOutcome, RealmId } from '../../logo/adventure/index.js';
import { features, type Feature } from '../../logo/quests.js';
import { isDateKey, type RewardEvent } from '../gio/rewards';

/**
 * Gio's Adventure progress, with no React and no storage so it can be tested.
 * It lives in its own key (`gio.adventure`) and never imports the quest path, so it cannot change
 * a stage, a star, a review or a skill check. Friends and stickers go through `applyEvent` only.
 */

export interface LevelRecord {
  /** The best result so far. Never goes down. */
  stars: 1 | 2 | 3;
  /** The fewest commands of any winning plan. Only ever decreases. */
  best: number;
  /** The local date the child first won or last earned another star. */
  d: string;
}

export interface AdventureState {
  v: 1;
  /** Key `${mode}:${levelId}`. */
  levels: Record<string, LevelRecord>;
  /** Realm ids whose story card was shown. */
  intros: RealmId[];
  /** Gate levels beaten (a boss, or the last level a mode plays in a realm), key `${mode}:${levelId}`. Unlocking never goes backwards. */
  bosses: string[];
  /** Critters freed, as a count. Each level counts once. */
  critters: number;
}

/** Realms in play order. A realm opens when the one before it has its gate level won. */
export const REALM_ORDER: readonly RealmId[] = ['maze', 'woods', 'river', 'swamp', 'cave', 'hills', 'castle'];

export const MAX_CODE_CHARS = 4000;
export const MAX_CODES = 100;
const MAX_CRITTERS = 9999;

export function emptyAdventure(): AdventureState {
  return { v: 1, levels: {}, intros: [], bosses: [], critters: 0 };
}

export const levelKey = (mode: AgeModeId, levelId: string): string => `${mode}:${levelId}`;

/* ------------------------------------------------------------------ ordering */

/** The levels a mode plays in a realm, in unlock order. */
export function realmLevels(realm: RealmId, mode: AgeModeId, levels: readonly Level[] = LEVELS): Level[] {
  return levels.filter((l) => l.realm === realm && l.modes.includes(mode)).sort((a, b) => a.n - b.n);
}

/** The number a child sees on a level: its place among the levels their mode plays in that realm (1, 2, 3 with no gaps). */
export function levelNumber(level: Level, mode: AgeModeId, levels: readonly Level[] = LEVELS): number {
  const at = realmLevels(level.realm, mode, levels).findIndex((l) => l.id === level.id);
  return at >= 0 ? at + 1 : level.n;
}

/** Realms a mode plays at all, in order. Coder-only realms are skipped for Little Turtles. */
export function realmsFor(mode: AgeModeId, levels: readonly Level[] = LEVELS): RealmId[] {
  return REALM_ORDER.filter((r) => realmLevels(r, mode, levels).length > 0);
}

/** The level that opens the next realm: the boss, or the last level the mode can play there. */
export function gateLevel(realm: RealmId, mode: AgeModeId, levels: readonly Level[] = LEVELS): Level | null {
  const list = realmLevels(realm, mode, levels);
  return list.find((l) => l.kind === 'boss') ?? list[list.length - 1] ?? null;
}

/** Every level a mode plays, in play order. */
export function levelsFor(mode: AgeModeId, levels: readonly Level[] = LEVELS): Level[] {
  return realmsFor(mode, levels).flatMap((r) => realmLevels(r, mode, levels));
}

/* ------------------------------------------------------------------ parsing */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function knownKeys(levels: readonly Level[]): Map<string, Level> {
  const map = new Map<string, Level>();
  for (const l of levels) for (const m of l.modes) map.set(levelKey(m, l.id), l);
  return map;
}

/** Read whatever came out of storage. Drops unknown levels, bad dates and wrong types, and never throws. */
export function parseAdventure(raw: unknown, levels: readonly Level[] = LEVELS): AdventureState {
  if (!isObject(raw) || raw.v !== 1) return emptyAdventure();
  const known = knownKeys(levels);
  const out = emptyAdventure();
  if (isObject(raw.levels)) {
    for (const [key, rec] of Object.entries(raw.levels)) {
      if (!known.has(key) || !isObject(rec)) continue;
      const { stars, best, d } = rec;
      if ((stars !== 1 && stars !== 2 && stars !== 3) || typeof d !== 'string' || !isDateKey(d)) continue;
      if (typeof best !== 'number' || !Number.isInteger(best) || best < 1 || best > MAX_CODE_CHARS) continue;
      out.levels[key] = { stars, best, d };
    }
  }
  if (Array.isArray(raw.intros)) out.intros = REALM_ORDER.filter((r) => (raw.intros as unknown[]).includes(r));
  if (Array.isArray(raw.bosses)) {
    out.bosses = [...new Set(raw.bosses.filter((k): k is string => typeof k === 'string' && known.has(k)))];
  }
  if (typeof raw.critters === 'number' && Number.isInteger(raw.critters) && raw.critters > 0) {
    out.critters = Math.min(raw.critters, MAX_CRITTERS);
  }
  return out;
}

/* ------------------------------------------------------------------ recording */

export interface RecordResult {
  state: AdventureState;
  /** The level had never been won in this mode. */
  firstWin: boolean;
  /** Stars gained over the old record (0 when nothing improved). */
  gained: number;
  /** The level was a gate level and this win opens the next realm for the first time. */
  opensRealm: RealmId | null;
}

function nextRealm(realm: RealmId, mode: AgeModeId, levels: readonly Level[]): RealmId | null {
  const order = realmsFor(mode, levels);
  return order[order.indexOf(realm) + 1] ?? null;
}

/** Record a finished run. Only a win changes anything. Safe to apply twice. */
export function recordLevel(
  state: AdventureState,
  mode: AgeModeId,
  level: Level,
  outcome: Pick<LevelOutcome, 'status' | 'stars' | 'commands'>,
  today: string,
  levels: readonly Level[] = LEVELS,
): RecordResult {
  const key = levelKey(mode, level.id);
  const same: RecordResult = { state, firstWin: false, gained: 0, opensRealm: null };
  if (outcome.status !== 'won' || outcome.stars < 1 || !level.modes.includes(mode) || !isDateKey(today)) return same;
  const stars = Math.min(3, Math.max(1, outcome.stars)) as 1 | 2 | 3;
  const old = state.levels[key];
  const best = Math.max(1, Math.round(outcome.commands));
  const record: LevelRecord = old
    ? { stars: Math.max(old.stars, stars) as 1 | 2 | 3, best: Math.min(old.best, best), d: stars > old.stars ? today : old.d }
    : { stars, best, d: today };

  const gate = gateLevel(level.realm, mode, levels);
  const isGate = gate?.id === level.id;
  const bosses = isGate && !state.bosses.includes(key) ? [...state.bosses, key] : state.bosses;
  const critters = !old && level.friend?.art === 'critter' ? Math.min(MAX_CRITTERS, state.critters + 1) : state.critters;
  const opensRealm = isGate && !state.bosses.includes(key) ? nextRealm(level.realm, mode, levels) : null;
  return {
    state: { ...state, levels: { ...state.levels, [key]: record }, bosses, critters },
    firstWin: !old,
    gained: record.stars - (old?.stars ?? 0),
    opensRealm,
  };
}

/** Remember that a realm's story card was shown. */
export function markIntro(state: AdventureState, realm: RealmId): AdventureState {
  return state.intros.includes(realm) ? state : { ...state, intros: REALM_ORDER.filter((r) => r === realm || state.intros.includes(r)) };
}

/* ------------------------------------------------------------------ views */

export interface LevelStatus {
  /** The level can be played now. */
  open: boolean;
  stars: 0 | 1 | 2 | 3;
  best: number | null;
  won: boolean;
}

function isWon(state: AdventureState, mode: AgeModeId, levelId: string): boolean {
  return state.levels[levelKey(mode, levelId)] !== undefined;
}

/** True when the realm before this one (for the mode) has its gate level won. The first realm is always open. */
export function realmOpen(state: AdventureState, mode: AgeModeId, realm: RealmId, levels: readonly Level[] = LEVELS): boolean {
  const order = realmsFor(mode, levels);
  const at = order.indexOf(realm);
  if (at < 0) return false;
  if (at === 0) return true;
  const gate = gateLevel(order[at - 1]!, mode, levels);
  return gate === null || state.bosses.includes(levelKey(mode, gate.id)) || isWon(state, mode, gate.id);
}

export function levelStatus(state: AdventureState, mode: AgeModeId, level: Level, levels: readonly Level[] = LEVELS): LevelStatus {
  const rec = state.levels[levelKey(mode, level.id)];
  const list = realmLevels(level.realm, mode, levels);
  const at = list.findIndex((l) => l.id === level.id);
  let open = false;
  if (at >= 0 && realmOpen(state, mode, level.realm, levels)) {
    open = at === 0 || isWon(state, mode, list[at - 1]!.id);
  }
  return { open: open || rec !== undefined, stars: rec?.stars ?? 0, best: rec?.best ?? null, won: rec !== undefined };
}

export interface RealmStatus {
  open: boolean;
  won: number;
  total: number;
  stars: number;
  maxStars: number;
  /** The gate level is won, so the next realm is open. */
  cleared: boolean;
}

export function realmStatus(state: AdventureState, mode: AgeModeId, realm: RealmId, levels: readonly Level[] = LEVELS): RealmStatus {
  const list = realmLevels(realm, mode, levels);
  const gate = gateLevel(realm, mode, levels);
  const stars = list.reduce((n, l) => n + (state.levels[levelKey(mode, l.id)]?.stars ?? 0), 0);
  return {
    open: realmOpen(state, mode, realm, levels),
    won: list.filter((l) => isWon(state, mode, l.id)).length,
    total: list.length,
    stars,
    maxStars: list.length * 3,
    cleared: gate !== null && (state.bosses.includes(levelKey(mode, gate.id)) || isWon(state, mode, gate.id)),
  };
}

/** Stars earned and stars on offer across every level the mode plays. */
export function totalStars(state: AdventureState, mode: AgeModeId, levels: readonly Level[] = LEVELS): { stars: number; max: number } {
  const list = levelsFor(mode, levels);
  return { stars: list.reduce((n, l) => n + (state.levels[levelKey(mode, l.id)]?.stars ?? 0), 0), max: list.length * 3 };
}

/** Where the big Continue button goes: the first open level not yet won, or null when every level is won. */
export function nextLevel(state: AdventureState, mode: AgeModeId, levels: readonly Level[] = LEVELS): Level | null {
  return levelsFor(mode, levels).find((l) => !isWon(state, mode, l.id) && levelStatus(state, mode, l, levels).open) ?? null;
}

/** The level after this one in play order for the mode, if any. */
export function followingLevel(mode: AgeModeId, level: Level, levels: readonly Level[] = LEVELS): Level | null {
  const list = levelsFor(mode, levels);
  return list[list.findIndex((l) => l.id === level.id) + 1] ?? null;
}

/* ------------------------------------------------------------------ rewards */

const normal = (code: string): string => code.replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * The reward event for a won run, or null for a run that did not win.
 * A caged friend is granted only for the feature the winning plan used (`REPEAT` for Olly, and so on).
 * A fix level grants Dot only when the code differs from the starter. Winning the level alone earns the Adventurer sticker.
 */
export function rewardFor(level: Level, mode: AgeModeId, code: string, outcome: Pick<LevelOutcome, 'status' | 'friendsFreed'>): RewardEvent | null {
  if (outcome.status !== 'won') return null;
  const wanted = level.friend?.feature;
  const used: Feature[] = [];
  if (wanted && wanted !== 'bug-fixed' && outcome.friendsFreed > 0) {
    const checked = checkAdventure(level, mode, code);
    if (checked.ok && features(checked.program).has(wanted)) used.push(wanted);
  }
  const starter = level.starter?.[mode];
  const fixedBug = level.kind === 'fix' && wanted === 'bug-fixed' && starter !== undefined && normal(code) !== normal(starter);
  return { kind: 'adventure-level', levelId: level.id, mode, features: used, fixedBug };
}

/* ------------------------------------------------------------------ saved plans */

export type SavedPlans = Record<string, string>;

/** Read the saved plans. Drops unknown levels and anything too long; keeps the newest MAX_CODES. */
export function parsePlans(raw: unknown, levels: readonly Level[] = LEVELS): SavedPlans {
  if (!isObject(raw)) return {};
  const known = knownKeys(levels);
  const entries = Object.entries(raw).filter((e): e is [string, string] => known.has(e[0]) && typeof e[1] === 'string' && e[1].length <= MAX_CODE_CHARS);
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX_CODES)));
}

/** Save the plan for a level. A plan over MAX_CODE_CHARS is not kept. The oldest plans go first past MAX_CODES. */
export function savePlan(plans: SavedPlans, mode: AgeModeId, levelId: string, code: string): SavedPlans {
  if (code.length > MAX_CODE_CHARS) return plans;
  const key = levelKey(mode, levelId);
  const rest = Object.entries(plans).filter(([k]) => k !== key);
  const next = [...rest, [key, code] as const];
  return Object.fromEntries(next.slice(Math.max(0, next.length - MAX_CODES)));
}
