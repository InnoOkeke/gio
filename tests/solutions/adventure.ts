import type { AgeModeId } from '../../src/logo/adventure/level.js';
import type { LoseReason } from '../../src/logo/adventure/world.js';

/** Look ahead before every step: swim when it is water, walk when it is not. */
const look = (times: number): string => `REPEAT ${times} [IFELSE AHEAD = "water [SWIM] [FD 50]]`;
/** The Little Turtles' version with two If blocks (no IFELSE in blocks). */
const lookLittle = (times: number): string => `REPEAT ${times} [IF AHEAD = "water [SWIM] IF AHEAD <> "water [FD 50]]`;

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
  'woods-01': { little: 'REPEAT 5 [FD 50 RT 90 FD 50 LT 90]', coder: 'REPEAT 5 [FD 50 RT 90 FD 50 LT 90]' },
  'woods-02': { little: 'REPEAT 4 [FD 50 RT 90 FD 100 LT 90]', coder: 'REPEAT 4 [FD 50 RT 90 FD 100 LT 90]' },
  'woods-03': { little: 'REPEAT 4 [FD 200 RT 90]', coder: 'REPEAT 4 [FD 200 RT 90]' },
  'woods-04': { coder: 'REPEAT 2 [REPEAT 2 [FD 50 RT 90 FD 50 LT 90] FD 50]' },
  'woods-05': { little: 'REPEAT 3 [FD 100 RT 90 FD 50 LT 90]' },
  'woods-06': { little: 'REPEAT 3 [FD 150 RT 90]\nFREE', coder: 'REPEAT 3 [FD 150 RT 90]\nFREE' },
  'woods-07': { little: 'REPEAT 6 [FD 50 RT 90 FD 50 LT 90]', coder: 'REPEAT 6 [FD 50 RT 90 FD 50 LT 90]' },
  'river-01': { little: 'FD 100\nSWIM\nSWIM\nFD 100', coder: 'FD 100\nSWIM\nSWIM\nFD 100' },
  'river-02': { little: lookLittle(6), coder: look(6) },
  'river-03': { little: lookLittle(8), coder: look(8) },
  'river-04': { little: 'REPEAT 16 [IF AHEAD = "rock [RT 90] FD 50]', coder: 'REPEAT 16 [IF AHEAD = "rock [RT 90] FD 50]' },
  'river-05': { coder: `${look(5)}\nFREE` },
  'river-06': { little: 'REPEAT 4 [IF AHEAD = "water [SWIM] FD 50]\nFREE' },
  'river-07': { little: lookLittle(6), coder: look(6) },
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
  // Stops a step short of the top.
  'woods-01': { code: 'REPEAT 4 [FD 50 RT 90 FD 50 LT 90]', status: 'unfinished', reason: null },
  // The narrow stairs from the last level: the wide stones need FD 100 across.
  'woods-02': { code: 'REPEAT 4 [FD 50 RT 90 FD 50 LT 90]', status: 'lost', reason: 'rock' },
  // Turns the wrong way at the first corner and walks off the map.
  'woods-03': { code: 'REPEAT 4 [FD 200 LT 90]', status: 'lost', reason: 'edge' },
  // Forgets the landing between the two flights.
  'woods-04': { code: 'REPEAT 4 [FD 50 RT 90 FD 50 LT 90]', status: 'lost', reason: 'rock' },
  // The one-up stairs pattern on two-up steps.
  'woods-05': { code: 'REPEAT 3 [FD 50 RT 90 FD 50 LT 90]', status: 'lost', reason: 'rock' },
  // Goes round a fourth time and walks into the cage.
  'woods-06': { code: 'REPEAT 4 [FD 150 RT 90]\nFREE', status: 'lost', reason: 'cage' },
  // Cuts right at the top of the stairs, into the Grumble's path.
  'woods-07': { code: 'REPEAT 4 [FD 50 RT 90 FD 50 LT 90]\nRT 90\nFD 50\nLT 90\nFD 150', status: 'lost', reason: 'enemy' },
  // Walks straight into the river.
  'river-01': { code: 'FD 250', status: 'lost', reason: 'water' },
  // Remembers the first river; on the next map SWIM meets dry land.
  'river-02': { code: 'FD 100\nSWIM\nFD 150', status: 'lost', reason: 'dry' },
  // Remembers the first map; on the next one the water starts at the first step.
  'river-03': { code: 'FD 50\nSWIM\nFD 150\nSWIM\nFD 100', status: 'lost', reason: 'water' },
  // Turns left at the rocks instead of right.
  'river-04': { code: 'REPEAT 16 [IF AHEAD = "rock [LT 90] FD 50]', status: 'lost', reason: 'rock' },
  // Remembers the first river, so it swims on dry land on the next map.
  'river-05': { code: 'FD 50\nSWIM\nSWIM\nFD 100\nFREE', status: 'lost', reason: 'dry' },
  // Remembers where the first stream was; on the next map Gio walks into it.
  'river-06': { code: 'FD 100\nSWIM\nFD 100\nFREE', status: 'lost', reason: 'water' },
  // Remembers the first river; on the next map Gio walks into it.
  'river-07': { code: 'FD 50\nSWIM\nSWIM\nFD 150', status: 'lost', reason: 'water' },
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
  'woods-01': 'REPEAT 4 [FD 50 RT 90 FD 50 LT 90]\nFD 50\nRT 90\nFD 50',
  'woods-02': 'REPEAT 3 [FD 50 RT 90 FD 100 LT 90]\nFD 50\nRT 90\nFD 100',
  'woods-03': 'FD 200\nRT 90\nFD 200\nRT 90\nFD 200\nRT 90\nFD 150',
  'woods-04': 'REPEAT 2 [FD 50 RT 90 FD 50 LT 90 FD 50 RT 90 FD 50 LT 90 FD 50]',
  'woods-05': 'FD 100\nRT 90\nFD 50\nLT 90\nREPEAT 2 [FD 100 RT 90 FD 50 LT 90]',
  'woods-06': 'FD 150\nRT 90\nFD 150\nRT 90\nFD 150\nRT 90\nFREE',
  'woods-07': 'REPEAT 3 [FD 50 RT 90 FD 50 LT 90]\nREPEAT 3 [FD 50 RT 90 FD 50 LT 90]',
  'river-01': 'FD 50\nFD 50\nSWIM\nSWIM\nFD 100',
  'river-02': `${lookLittle(3)}\n${lookLittle(3)}`,
  'river-03': `${lookLittle(4)}\n${lookLittle(4)}`,
  'river-04': 'REPEAT 8 [IF AHEAD = "rock [RT 90] FD 50]\nREPEAT 8 [IF AHEAD = "rock [RT 90] FD 50]',
  'river-05': `${look(2)}\n${look(3)}\nFREE`,
  'river-06': 'REPEAT 2 [IF AHEAD = "water [SWIM] FD 50]\nREPEAT 2 [IF AHEAD = "water [SWIM] FD 50]\nFREE',
  'river-07': `${lookLittle(3)}\n${lookLittle(3)}`,
};

/** Reaches the flag but skips a gem: exactly 1 star. Only where a level lets a plan skip one. */
export const ADVENTURE_NO_GEM: Record<string, string> = {
  'maze-02': 'RT 90\nFD 200\nLT 90\nFD 100',
  'maze-04': 'RT 90\nFD 250\nLT 90\nFD 250',
  'maze-06': 'FD 150\nRT 90\nFD 50',
  'maze-07': 'FD 300',
  'woods-03': 'RT 90\nFD 50',
  'woods-06': 'RT 90\nFD 50\nFREE',
  'river-01': 'LT 90\nFD 100\nRT 90\nFD 300\nRT 90\nFD 100',
  'river-04': 'FD 50\nRT 90\nSWIM\nFD 50\nLT 90\nFD 50',
};
