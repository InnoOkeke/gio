import type { Level } from '../level.js';
import { MAZE_LEVELS } from './maze.js';
import { RIVER_LEVELS } from './river.js';
import { WOODS_LEVELS } from './woods.js';
/** Every adventure level in play order. More realms are added here as they are authored. */
export const LEVELS: Level[] = [...MAZE_LEVELS, ...WOODS_LEVELS, ...RIVER_LEVELS];
export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}