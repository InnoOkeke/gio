import { LogoError } from '../../src/logo/errors.js';
import type { Level } from '../../src/logo/adventure/level.js';
import { AdventureWorld } from '../../src/logo/adventure/world.js';

const ACTIONS: { name: string; arg: number | null }[] = [
  { name: 'FORWARD', arg: 50 },
  { name: 'BACK', arg: 50 },
  { name: 'RIGHT', arg: 90 },
  { name: 'LEFT', arg: 90 },
  { name: 'SWIM', arg: null },
  { name: 'JUMP', arg: null },
  { name: 'FREE', arg: null },
  { name: 'REST', arg: null },
];

/**
 * Breadth-first search over the real world rules (the same AdventureWorld the game uses).
 * Returns the shortest list of single actions that wins, or null when the map cannot be won.
 * State is (cell, direction, beat folded by the enemy and fire period, pickups, power-ups).
 */
export function solve(level: Level, map: string[], options: { allGems?: boolean; maxStates?: number } = {}): string[] | null {
  const start = new AdventureWorld(level, map, false);
  const seen = new Set<string>([start.key()]);
  let frontier: { world: AdventureWorld; path: string[] }[] = [{ world: start, path: [] }];
  const limit = options.maxStates ?? 400_000;
  while (frontier.length && seen.size < limit) {
    const next: typeof frontier = [];
    for (const { world, path } of frontier) {
      for (const action of ACTIONS) {
        const child = world.clone();
        try {
          child.command(action.name, action.arg, 1);
        } catch (err) {
          if (err instanceof LogoError) continue;
          throw err;
        }
        const step = [...path, action.arg === null ? action.name : `${action.name} ${action.arg}`];
        if (child.status === 'won' && (!options.allGems || child.gems === child.gemsTotal)) return step;
        const key = child.key();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ world: child, path: step });
      }
    }
    frontier = next;
  }
  return null;
}
