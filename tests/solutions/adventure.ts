import type { AgeModeId } from '../../src/logo/adventure/level.js';
import type { LoseReason } from '../../src/logo/adventure/world.js';

/** Reference solutions: win with 3 stars, collect every gem, and use exactly `par` commands. Never shipped to the browser. */
export const ADVENTURE_REFERENCE: Record<string, Partial<Record<AgeModeId, string>>> = {
  'maze-01': { little: 'FD 200', coder: 'FD 200' },
  'maze-02': { little: 'FD 100\nRT 90\nFD 200', coder: 'FD 100\nRT 90\nFD 200' },
  'maze-03': {
    little: 'FD 200\nLT 90\nFD 100\nLT 90\nFD 200\nRT 90\nFD 100',
    coder: 'FD 200\nLT 90\nFD 100\nLT 90\nFD 200\nRT 90\nFD 100',
  },
  'maze-04': {
    little: 'FD 150\nRT 90\nFD 150\nLT 90\nFD 100\nRT 90\nFD 100',
    coder: 'FD 150\nRT 90\nFD 150\nLT 90\nFD 100\nRT 90\nFD 100',
  },
  'maze-05': { little: 'FD 100\nRT 90\nFD 150\nFREE', coder: 'FD 100\nRT 90\nFD 150\nFREE' },
  'maze-06': { little: 'BK 100\nFD 250\nRT 90\nFD 50', coder: 'BK 100\nFD 250\nRT 90\nFD 50' },
  'maze-07': { coder: 'FD 150\nRT 90\nFD 200\nBK 200\nLT 90\nFD 150' },
  'maze-08': {
    coder: 'FD 400\nLT 90\nFD 100\nLT 90\nFD 400\nRT 90\nFD 100\nRT 90\nFD 400\nLT 90\nFD 100\nLT 90\nFD 400\nRT 90\nFD 100',
  },
};

export interface Naive {
  code: string;
  status: 'lost' | 'unfinished';
  reason: LoseReason | null;
}

/** Plausible wrong answers. Each one must not win. */
export const ADVENTURE_NAIVE: Record<string, Naive> = {
  'maze-01': { code: 'FD 100', status: 'unfinished', reason: null },
  'maze-02': { code: 'FD 100\nLT 90\nFD 200', status: 'lost', reason: 'edge' },
  'maze-03': { code: 'FD 200\nLT 90\nFD 200', status: 'lost', reason: 'rock' },
  'maze-04': { code: 'FD 150\nRT 90\nFD 150\nLT 90\nFD 100', status: 'unfinished', reason: null },
  'maze-05': { code: 'FD 100\nLT 90\nFD 150\nFREE', status: 'lost', reason: 'edge' },
  'maze-06': { code: 'FD 150\nLT 90\nFD 50', status: 'unfinished', reason: null },
  'maze-07': { code: 'FD 150\nRT 90\nFD 200', status: 'unfinished', reason: null },
  'maze-08': { code: 'FD 300\nLT 90\nFD 100', status: 'lost', reason: 'rock' },
};

/** Wins with every gem but uses more than `par` commands: exactly 2 stars. */
export const ADVENTURE_WASTEFUL: Record<string, string> = {
  'maze-01': 'FD 100\nFD 100',
  'maze-02': 'FD 50\nFD 50\nRT 90\nFD 200',
  'maze-03': 'FD 200\nLT 90\nFD 100\nLT 90\nFD 200\nRT 90\nFD 50\nFD 50',
  'maze-04': 'FD 150\nRT 90\nFD 150\nLT 90\nFD 100\nRT 90\nFD 50\nFD 50',
  'maze-05': 'FD 50\nFD 50\nRT 90\nFD 150\nFREE',
  'maze-06': 'BK 50\nBK 50\nFD 250\nRT 90\nFD 50',
  'maze-07': 'FD 150\nRT 90\nFD 200\nBK 100\nBK 100\nLT 90\nFD 150',
  'maze-08': 'FD 200\nFD 200\nLT 90\nFD 100\nLT 90\nFD 400\nRT 90\nFD 100\nRT 90\nFD 400\nLT 90\nFD 100\nLT 90\nFD 400\nRT 90\nFD 100',
};

/** Reaches the flag but skips a gem: exactly 1 star. Only where a level lets a plan skip one. */
export const ADVENTURE_NO_GEM: Record<string, string> = {
  'maze-02': 'RT 90\nFD 200\nLT 90\nFD 100',
  'maze-04': 'RT 90\nFD 250\nLT 90\nFD 250',
  'maze-06': 'FD 150\nRT 90\nFD 50',
  'maze-07': 'FD 300',
};
