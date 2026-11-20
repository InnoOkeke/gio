import { lookupPrimitive, SPECIAL_FORMS } from '../primitives.js';
import { ADVENTURE_LOOKUP } from './words.js';

export type Dir = 'N' | 'E' | 'S' | 'W';
export type AgeModeId = 'little' | 'coder';
export type RealmId = 'maze' | 'woods' | 'river' | 'swamp' | 'cave' | 'hills' | 'castle';
export type AdventureConcept =
  | 'sequence'
  | 'turns'
  | 'debugging'
  | 'repeat'
  | 'nested'
  | 'decisions'
  | 'timing'
  | 'procedures'
  | 'variables'
  | 'recursion'
  | 'combine';

export interface Level {
  /** `maze-03`. Lower case, digits and dashes only (no dot, so it is never read as a file). */
  id: string;
  realm: RealmId;
  /** Position inside its realm, from 1. Order inside a realm is unlock order. */
  n: number;
  kind: 'play' | 'fix' | 'boss';
  modes: AgeModeId[];
  title: string;
  concept: AdventureConcept;
  /** One or two short lines for the intro card. */
  story: string;
  /** The goal chip, in kid words. */
  goal: string;
  /** Rows from top to bottom, one character per cell. All rows the same length. */
  map: string[];
  /** Other maps for the same level. The plan must win on all of them. Same size, same start. */
  variants?: string[][];
  start: { col: number; row: number; dir: Dir };
  /** Canonical words allowed in the plan, per mode. Everything not listed gives a friendly error. */
  allow: Record<AgeModeId, string[]>;
  /** Moving things. Their position depends only on the beat number. Cells are [col, row]. */
  enemies?: { id: string; route: [number, number][] }[];
  fires?: { id: string; cells: [number, number][]; period: number; on: number[] }[];
  /** Fewest commands that still collect every gem, per mode, counted by commandCount(). */
  par: Partial<Record<AgeModeId, number>>;
  /** For `fix` levels: code to start from, per mode. */
  starter?: Partial<Record<AgeModeId, string>>;
  /** Boss: name and art id, shown big. Mechanics are the same as any level. */
  boss?: { name: string; art: string };
  /** The trapped friend, if the map has an `F`. */
  friend?: {
    art: 'olly' | 'dot' | 'hoot' | 'bree' | 'nutmeg' | 'spindle' | 'critter';
    feature?: 'REPEAT' | 'IF' | 'TO' | 'MAKE' | 'RECURSION' | 'bug-fixed';
  };
  /** Offline hint ladder, no AI. `reveal` is the first part of a plan. */
  hints: { text: string; reveal?: Partial<Record<AgeModeId, string>> }[];
}

/** One cell is this many turtle units, so FD 100 is two steps. */
export const CELL = 50;

/** The map legend. `S` only marks the start; the world reads it as ground. */
export const LEGEND = '.#~=gSGFDjo';

export const DIR_HEADING: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };
export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
/** Column and row change for one step in each direction (row 0 is the top). */
export const DIR_STEP: Record<Dir, readonly [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

export const MAX_SIZE = 9;
export const MIN_SIZE = 3;

/** Centre of cell (col, row) in turtle units. The map is centred on the turtle origin. */
export function cellCentre(col: number, row: number, cols: number, rows: number): { x: number; y: number } {
  return { x: (col - (cols - 1) / 2) * CELL, y: ((rows - 1) / 2 - row) * CELL };
}

export function mapSize(map: string[]): { cols: number; rows: number } {
  return { cols: map[0]?.length ?? 0, rows: map.length };
}

export function allMaps(level: Level): string[][] {
  return [level.map, ...(level.variants ?? [])];
}

export function countIn(map: string[], char: string): number {
  return map.reduce((n, row) => n + [...row].filter((c) => c === char).length, 0);
}

function knownWord(name: string): boolean {
  return (SPECIAL_FORMS as readonly string[]).includes(name) || !!lookupPrimitive(name) || ADVENTURE_LOOKUP.has(name);
}

/** Everything wrong with a level's data, in plain words. An empty list means the level is well formed. */
export function validateLevel(level: Level): string[] {
  const bad: string[] = [];
  const say = (msg: string) => bad.push(`${level.id}: ${msg}`);

  if (!/^[a-z0-9-]+$/.test(level.id)) say('id must be lower case letters, digits and dashes');
  if (level.modes.length === 0) say('no modes');
  if (level.kind === 'fix') for (const m of level.modes) if (!level.starter?.[m]) say(`fix level needs a starter for ${m}`);
  if (level.kind === 'boss' && !level.boss) say('boss level needs a boss');

  const { cols, rows } = mapSize(level.map);
  const maps = allMaps(level);
  maps.forEach((map, k) => {
    const label = k === 0 ? 'map' : `variant ${k}`;
    if (map.length < MIN_SIZE || map.length > MAX_SIZE) say(`${label} must be ${MIN_SIZE} to ${MAX_SIZE} rows`);
    if (map.some((row) => row.length !== cols)) say(`${label} rows are not all the same length`);
    if (cols < MIN_SIZE || cols > MAX_SIZE) say(`${label} must be ${MIN_SIZE} to ${MAX_SIZE} columns`);
    if (map.length !== rows) say(`${label} has a different height from the main map`);
    for (const row of map) for (const c of row) if (!LEGEND.includes(c)) say(`${label} has an unknown character "${c}"`);
    if (countIn(map, 'S') !== 1) say(`${label} needs exactly one S`);
    else {
      const sRow = map.findIndex((row) => row.includes('S'));
      const sCol = map[sRow]!.indexOf('S');
      if (sRow !== level.start.row || sCol !== level.start.col) say(`${label} S is not at start (${level.start.col},${level.start.row})`);
    }
    if (countIn(map, 'g') < 1) say(`${label} needs at least one gem`);
    if (countIn(map, 'G') + countIn(map, 'F') < 1) say(`${label} needs a goal flag or a caged friend`);
    if (countIn(map, 'G') > 1) say(`${label} has more than one goal flag`);
  });
  if (!DIRS.includes(level.start.dir)) say('start.dir must be N, E, S or W');

  for (const m of level.modes) {
    if (!level.allow[m] || level.allow[m].length === 0) say(`no allowed words for ${m}`);
    for (const w of level.allow[m] ?? []) if (!knownWord(w)) say(`allowed word ${w} for ${m} does not exist`);
    if (level.par[m] === undefined || level.par[m]! < 1) say(`no par for ${m}`);
  }

  if (level.hints.length < 2 || level.hints.length > 3) say('needs 2 or 3 hints');

  const inside = ([c, r]: [number, number]) => c >= 0 && r >= 0 && c < cols && r < rows;
  for (const e of level.enemies ?? []) {
    if (e.route.length === 0) say(`enemy ${e.id} has no route`);
    for (const cell of e.route) {
      if (!inside(cell)) say(`enemy ${e.id} leaves the map`);
      else if ('#~DF'.includes(level.map[cell[1]]![cell[0]]!)) say(`enemy ${e.id} stands on a wall, water, cage or gate`);
    }
    if (e.route.some(([c, r]) => c === level.start.col && r === level.start.row) && e.route[0]![0] === level.start.col && e.route[0]![1] === level.start.row) {
      say(`enemy ${e.id} starts on Gio`);
    }
  }
  for (const f of level.fires ?? []) {
    if (f.period < 1 || f.on.length === 0 || f.on.some((b) => b < 0 || b >= f.period)) say(`fire ${f.id} has a bad rhythm`);
    for (const cell of f.cells) if (!inside(cell)) say(`fire ${f.id} leaves the map`);
  }
  return bad;
}
