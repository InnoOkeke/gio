import { CELL, countIn, DIR_HEADING, DIR_STEP, mapSize, type Dir, type Level } from '../../logo/adventure/level.js';
import type { AdvEvent, GridPose } from '../../logo/adventure/world.js';

export interface SceneEnemy {
  id: string;
  col: number;
  row: number;
}

/** Everything the scene draws, as a pure function of (level, map, trace, how many events have happened). */
export interface SceneState {
  cols: number;
  rows: number;
  /** The map as it is now: picked-up gems, boots and shields and opened cages are plain ground. `S` is ground. */
  cells: string[][];
  gio: GridPose;
  /** Degrees, always turning the short way, so the sprite never spins the long way round. */
  heading: number;
  gems: number;
  gemsTotal: number;
  boots: boolean;
  shield: boolean;
  enemies: SceneEnemy[];
  /** Cells on fire right now. */
  fires: [number, number][];
  /** Cages that are open, with the friend who stands there now. */
  freed: [number, number][];
  beat: number;
}

const shortestTurn = (from: number, to: number): number => ((to - from + 540) % 360) - 180;

/** Where the enemies and the fire are before the first beat. */
function firstBeat(level: Level): Pick<SceneState, 'enemies' | 'fires'> {
  return {
    enemies: (level.enemies ?? []).map((e) => ({ id: e.id, col: e.route[0]![0], row: e.route[0]![1] })),
    fires: (level.fires ?? []).filter((f) => f.on.includes(0)).flatMap((f) => f.cells),
  };
}

/** The scene before Go. */
export function initialScene(level: Level, map: string[] = level.map): SceneState {
  const { cols, rows } = mapSize(map);
  return {
    cols,
    rows,
    cells: map.map((r) => [...r].map((c) => (c === 'S' ? '.' : c))),
    gio: { col: level.start.col, row: level.start.row, dir: level.start.dir },
    heading: DIR_HEADING[level.start.dir],
    gems: 0,
    gemsTotal: countIn(map, 'g'),
    boots: false,
    shield: false,
    ...firstBeat(level),
    freed: [],
    beat: 0,
  };
}

/** The cell one step in front of a pose. */
export function cellAhead(pose: GridPose): [number, number] {
  const [dc, dr] = DIR_STEP[pose.dir];
  return [pose.col + dc, pose.row + dr];
}

/**
 * The scene after the first `cursor` events of a trace. Stateless, so Step, Finish, Reset and
 * seeking all use the same function.
 */
export function sceneAt(level: Level, map: string[], trace: readonly AdvEvent[], cursor: number): SceneState {
  const s = initialScene(level, map);
  const last = Math.min(cursor, trace.length);
  let dir: Dir = level.start.dir;
  for (let k = 0; k < last; k++) {
    const ev = trace[k]!;
    s.gio = { ...ev.pose };
    if (ev.pose.dir !== dir) {
      s.heading += shortestTurn(DIR_HEADING[dir], DIR_HEADING[ev.pose.dir]);
      dir = ev.pose.dir;
    }
    s.beat = ev.beat;
    switch (ev.type) {
      case 'gem':
      case 'power':
        if (ev.what === 'shield-pop') s.shield = false;
        else {
          s.cells[ev.pose.row]![ev.pose.col] = '.';
          if (ev.what === 'gem') s.gems++;
          else if (ev.what === 'boots') s.boots = true;
          else s.shield = true;
        }
        break;
      case 'free': {
        const [c, r] = cellAhead(ev.pose);
        if (s.cells[r]?.[c] === 'F') {
          s.cells[r]![c] = '.';
          s.freed.push([c, r]);
        }
        break;
      }
      case 'beat':
        s.enemies = ev.enemies.map((e) => ({ ...e }));
        s.fires = ev.fires.map(([c, r]) => [c, r]);
        break;
      default:
    }
  }
  return s;
}

/** Position of a grid cell as a percentage of the scene, for the sprite layer. */
export function cellPercent(col: number, row: number, cols: number, rows: number): { left: number; top: number; width: number; height: number } {
  return { left: (col / cols) * 100, top: (row / rows) * 100, width: 100 / cols, height: 100 / rows };
}

/** Pixel size of the scene's drawing, one tile per cell. */
export function sceneBox(cols: number, rows: number): { width: number; height: number } {
  return { width: cols * CELL, height: rows * CELL };
}
