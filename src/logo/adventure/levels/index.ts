import type { Level } from '../level.js';
import { CASTLE_LEVELS } from './castle.js';
import { CAVE_LEVELS } from './cave.js';
import { HILLS_LEVELS } from './hills.js';
import { MAZE_LEVELS } from './maze.js';
import { RIVER_LEVELS } from './river.js';
import { SWAMP_LEVELS } from './swamp.js';
import { WOODS_LEVELS } from './woods.js';
/** Every adventure level in play order. */
export const LEVELS: Level[] = [...MAZE_LEVELS, ...WOODS_LEVELS, ...RIVER_LEVELS, ...SWAMP_LEVELS, ...CAVE_LEVELS, ...HILLS_LEVELS, ...CASTLE_LEVELS];
export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
