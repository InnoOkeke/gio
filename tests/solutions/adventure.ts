import type { AgeModeId } from '../../src/logo/adventure/level.js';
import type { LoseReason } from '../../src/logo/adventure/world.js';

/** Look ahead before every step: swim when it is water, walk when it is not. */
const look = (times: number): string => `REPEAT ${times} [IFELSE AHEAD = "water [SWIM] [FD 50]]`;
/** The Little Turtles' version with two If blocks (no IFELSE in blocks). */
const lookLittle = (times: number): string => `REPEAT ${times} [IF AHEAD = "water [SWIM] IF AHEAD <> "water [FD 50]]`;

/** The same plan for both modes. */
const both = (code: string): Partial<Record<AgeModeId, string>> => ({ little: code, coder: code });
/** Crystal Cave: a stair-climbing command with an input. */
const CLIMB = 'TO CLIMB :n\n  REPEAT :n [FD 50 RT 90 FD 50 LT 90]\nEND';
/** Bree's workshop: a command built from a command. */
const HOPS = 'TO HOP\n  FD 50\n  JUMP\nEND\nTO TWOHOPS\n  HOP\n  HOP\nEND';
/** One zig-zag of the Little web. */
const WEB_TURN = 'FD 150 RT 90 FD 100 RT 90 FD 150 LT 90 FD 100 LT 90';

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
  'swamp-01': both('REST\nFD 300'),
  'swamp-02': both('FD 100\nRT 90\nREST\nFD 200'),
  'swamp-03': both('REPEAT 7 [IF AHEAD = "fire [REST] FD 50]'),
  'swamp-04': both('REPEAT 8 [IF AHEAD = "fire [REST] IF AHEAD = "enemy [REST] FD 50]'),
  'swamp-05': both('LT 90\nFD 50\nRT 90\nFD 300'),
  'swamp-06': both('REST\nFD 150\nREST\nFD 150'),
  'cave-01': both('FD 100\nJUMP\nFD 100'),
  'cave-02': both('FD 100\nREPEAT 3 [JUMP]'),
  'cave-03': { coder: 'TO HOPSTEP\n  FD 50\n  JUMP\n  FD 50\nEND\nHOPSTEP\nHOPSTEP' },
  'cave-04': { little: 'REPEAT 2 [REPEAT 2 [FD 50 JUMP] RT 90]' },
  'cave-05': { coder: `${CLIMB}\nCLIMB 2\nFD 50\nCLIMB 5` },
  'cave-06': { little: 'REPEAT 10 [IF AHEAD = "rock [RT 90 IF AHEAD = "rock [RT 90 RT 90]] FD 50]' },
  'cave-07': { coder: `${HOPS}\nTWOHOPS\nRT 90\nTWOHOPS\nRT 90\nTWOHOPS\nFREE` },
  'cave-08': { little: 'REPEAT 2 [REPEAT 2 [FD 50 JUMP] LT 90]\nREPEAT 2 [FD 50 JUMP]\nFREE' },
  'cave-09': both('FD 100\nREST\nREPEAT 3 [JUMP]'),
  'hills-01': { coder: 'MAKE "n 3\nFD :n * 50\nRT 90\nFD :n * 50' },
  'hills-02': { coder: 'MAKE "n 1\nREPEAT 4 [FD :n * 50 RT 90 MAKE "n :n + 1]' },
  'hills-03': { coder: 'FD 250\nRT 90\nFD GEMS * 50' },
  'hills-04': { coder: 'MAKE "n 0\nREPEAT 6 [IF AHEAD = "clear [FD 50 MAKE "n :n + 1]]\nRT 90\nFD :n * 50' },
  'hills-05': { coder: 'MAKE "n 1\nREPEAT 3 [FD :n * 50 RT 90 FD :n * 50 LT 90 MAKE "n :n + 1]\nFREE' },
  'hills-06': { coder: 'REST\nMAKE "n 1\nREPEAT 5 [FD :n * 50 RT 90 MAKE "n :n + 1]' },
  'castle-01': both('FD 150\nRT 90\nFD 100\nLT 90\nFD 100'),
  'castle-02': both('FD 50\nSWIM\nREST\nFD 300'),
  'castle-03': { coder: 'TO CLIMB :n\n  IF :n = 0 [STOP]\n  FD :n * 50\n  RT 90\n  CLIMB :n - 1\nEND\nCLIMB 4' },
  'castle-04': { little: 'REPEAT 2 [REPEAT 3 [FD 50 RT 90 FD 50 LT 90] RT 90]' },
  'castle-05': { little: 'FD 100\nLT 90\nIF AHEAD = "rock [RT 90 RT 90]\nFD 100', coder: 'FD 100\nLT 90\nIF AHEAD = "rock [RT 180]\nFD 100' },
  'castle-06': { coder: 'TO WEB :n\n  IF :n > 4 [STOP]\n  RT 90\n  FD :n * 50\n  WEB :n + 1\nEND\nWEB 1\nFREE' },
  'castle-07': { little: `REPEAT 2 [${WEB_TURN}]\nFREE` },
  'castle-08': both('REST\nREST\nFD 50\nJUMP\nSWIM\nFD 200'),
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
  // Walks straight on and arrives just as the fire lights.
  'swamp-01': { code: 'FD 300', status: 'lost', reason: 'fire' },
  // Does not wait, and meets the Grumble in the middle of the path.
  'swamp-02': { code: 'FD 100\nRT 90\nFD 200', status: 'lost', reason: 'enemy' },
  // Never looks ahead and walks onto a lit stone.
  'swamp-03': { code: 'FD 350', status: 'lost', reason: 'fire' },
  // Waits for the fire but forgets to look for the Grumble.
  'swamp-04': { code: 'REPEAT 8 [IF AHEAD = "fire [REST] FD 50]', status: 'lost', reason: 'enemy' },
  // Walks into the fire wall without the shield.
  'swamp-05': { code: 'FD 300', status: 'lost', reason: 'fire' },
  // Rushes the boss path and bumps the first Grumble.
  'swamp-06': { code: 'FD 300', status: 'lost', reason: 'enemy' },
  // Tries to walk through the rocks.
  'cave-01': { code: 'FD 300', status: 'lost', reason: 'rock' },
  // One hop short of the flag.
  'cave-02': { code: 'FD 100\nJUMP\nJUMP', status: 'unfinished', reason: null },
  // Forgets the step after the first hop, so the second hop lands on rock.
  'cave-03': { code: 'FD 50\nJUMP\nFD 50\nJUMP', status: 'lost', reason: 'bad-landing' },
  // Turns left at the corner and hops off the map.
  'cave-04': { code: 'REPEAT 2 [REPEAT 2 [FD 50 JUMP] LT 90]', status: 'lost', reason: 'edge' },
  // One long CLIMB, with no step on the landing.
  'cave-05': { code: `${CLIMB}\nCLIMB 7`, status: 'lost', reason: 'rock' },
  // Only ever turns right, so the left bend walks into the wall.
  'cave-06': { code: 'REPEAT 10 [IF AHEAD = "rock [RT 90] FD 50]', status: 'lost', reason: 'rock' },
  // Turns left at the top of the tunnel and hops off the map.
  'cave-07': { code: `${HOPS}\nTWOHOPS\nLT 90\nTWOHOPS`, status: 'lost', reason: 'edge' },
  // Repeats the turning side a third time, so the cage is not in front.
  'cave-08': { code: 'REPEAT 3 [REPEAT 2 [FD 50 JUMP] LT 90]\nFREE', status: 'lost', reason: 'nothing-to-free' },
  // Hops at once and lands on a Grumble.
  'cave-09': { code: 'FD 100\nREPEAT 3 [JUMP]', status: 'lost', reason: 'enemy' },
  // Turns the wrong way at the top.
  'hills-01': { code: 'MAKE "n 3\nFD :n * 50\nLT 90\nFD :n * 50', status: 'lost', reason: 'edge' },
  // Forgets to make n bigger, so every side is one step.
  'hills-02': { code: 'MAKE "n 1\nREPEAT 4 [FD :n * 50 RT 90]', status: 'lost', reason: 'rock' },
  // Counts the steps across on the first hill; on the next the cage is further.
  'hills-03': { code: 'FD 250\nRT 90\nFD 150', status: 'unfinished', reason: null },
  // Remembers the first hill; on the taller one Gio stops short of the flag.
  'hills-04': { code: 'FD 200\nRT 90\nFD 200', status: 'unfinished', reason: null },
  // Forgets to grow the steps.
  'hills-05': { code: 'MAKE "n 1\nREPEAT 3 [FD :n * 50 RT 90 FD :n * 50 LT 90]\nFREE', status: 'lost', reason: 'rock' },
  // The spiral without the wait meets the Grumble on the bottom path.
  'hills-06': { code: 'MAKE "n 1\nREPEAT 5 [FD :n * 50 RT 90 MAKE "n :n + 1]', status: 'lost', reason: 'enemy' },
  // Goes straight for the gate without the gems.
  'castle-01': { code: 'RT 90\nFD 100\nLT 90\nFD 300', status: 'lost', reason: 'gate' },
  // Does not wait after the swim and walks into the fire.
  'castle-02': { code: 'FD 50\nSWIM\nFD 300', status: 'lost', reason: 'fire' },
  // Calls CLIMB with the same number, so the stairs never get shorter.
  'castle-03': { code: 'TO CLIMB :n\n  IF :n = 0 [STOP]\n  FD :n * 50\n  RT 90\n  CLIMB :n\nEND\nCLIMB 4', status: 'lost', reason: 'rock' },
  // Turns left at the top of the tower and walks off the map.
  'castle-04': { code: 'REPEAT 2 [REPEAT 3 [FD 50 RT 90 FD 50 LT 90] LT 90]', status: 'lost', reason: 'edge' },
  // Remembers the first room; in the mirror room Gio walks into the wall.
  'castle-05': { code: 'FD 100\nLT 90\nFD 100', status: 'lost', reason: 'rock' },
  // Turns the wrong way round the web.
  'castle-06': { code: 'TO WEB :n\n  IF :n > 4 [STOP]\n  LT 90\n  FD :n * 50\n  WEB :n + 1\nEND\nWEB 1\nFREE', status: 'lost', reason: 'rock' },
  // Turns right at the bottom of the zig-zag instead of left.
  'castle-07': { code: 'REPEAT 2 [FD 150 RT 90 FD 100 RT 90 FD 150 RT 90 FD 100 RT 90]\nFREE', status: 'lost', reason: 'rock' },
  // Hurries through and walks into the King's fire.
  'castle-08': { code: 'FD 50\nJUMP\nSWIM\nFD 200', status: 'lost', reason: 'fire' },
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
  'swamp-01': 'REST\nFD 150\nFD 150',
  'swamp-02': 'FD 50\nFD 50\nRT 90\nREST\nFD 200',
  'swamp-03': 'REPEAT 4 [IF AHEAD = "fire [REST] FD 50]\nREPEAT 3 [IF AHEAD = "fire [REST] FD 50]',
  'swamp-04': 'REPEAT 4 [IF AHEAD = "fire [REST] IF AHEAD = "enemy [REST] FD 50]\nREPEAT 4 [IF AHEAD = "fire [REST] IF AHEAD = "enemy [REST] FD 50]',
  'swamp-05': 'LT 90\nFD 50\nRT 90\nFD 150\nFD 150',
  'swamp-06': 'REST\nFD 100\nFD 50\nREST\nFD 150',
  'cave-01': 'FD 50\nFD 50\nJUMP\nFD 100',
  'cave-02': 'FD 100\nJUMP\nJUMP\nJUMP',
  'cave-03': 'FD 50\nJUMP\nFD 50\nFD 50\nJUMP\nFD 50',
  'cave-04': 'REPEAT 2 [FD 50 JUMP FD 50 JUMP RT 90]',
  'cave-05': `${CLIMB}\nCLIMB 2\nFD 50\nCLIMB 3\nCLIMB 2`,
  'cave-06': 'REPEAT 5 [IF AHEAD = "rock [RT 90 IF AHEAD = "rock [RT 90 RT 90]] FD 50]\nREPEAT 5 [IF AHEAD = "rock [RT 90 IF AHEAD = "rock [RT 90 RT 90]] FD 50]',
  'cave-07': 'TO HOP\n  FD 50\n  JUMP\nEND\nHOP\nHOP\nRT 90\nHOP\nHOP\nRT 90\nHOP\nHOP\nFREE',
  'cave-08': 'REPEAT 2 [FD 50 JUMP FD 50 JUMP LT 90]\nREPEAT 2 [FD 50 JUMP]\nFREE',
  'cave-09': 'FD 100\nREST\nJUMP\nJUMP\nJUMP',
  'hills-01': 'FD 50\nFD 100\nRT 90\nFD 100\nFD 50',
  'hills-02': 'FD 50\nRT 90\nFD 100\nRT 90\nFD 150\nRT 90\nFD 200',
  'hills-03': 'FD 50\nFD 200\nRT 90\nFD GEMS * 50',
  'hills-04': 'MAKE "n 0\nREPEAT 6 [IF AHEAD = "clear [FD 50 MAKE "n :n + 1]]\nRT 90\nREPEAT :n [FD 50]',
  'hills-05': 'FD 50\nRT 90\nFD 50\nLT 90\nFD 100\nRT 90\nFD 100\nLT 90\nFD 150\nRT 90\nFD 150\nLT 90\nFREE',
  'hills-06': 'REST\nFD 50\nRT 90\nFD 100\nRT 90\nFD 150\nRT 90\nFD 200\nRT 90\nFD 250',
  'castle-01': 'FD 50\nFD 100\nRT 90\nFD 100\nLT 90\nFD 100',
  'castle-02': 'FD 50\nSWIM\nREST\nFD 150\nFD 150',
  'castle-03': 'FD 200\nRT 90\nFD 150\nRT 90\nFD 100\nRT 90\nFD 50',
  'castle-04': 'REPEAT 3 [FD 50 RT 90 FD 50 LT 90]\nRT 90\nREPEAT 3 [FD 50 RT 90 FD 50 LT 90]',
  'castle-05': 'FD 50\nFD 50\nLT 90\nIF AHEAD = "rock [RT 90 RT 90]\nFD 100',
  'castle-06': 'RT 90\nFD 50\nRT 90\nFD 100\nRT 90\nFD 150\nRT 90\nFD 200\nFREE',
  'castle-07': 'REPEAT 2 [FD 150 RT 90 FD 100 RT 90 FD 100 FD 50 LT 90 FD 100 LT 90]\nFREE',
  'castle-08': 'REST\nREST\nFD 50\nJUMP\nSWIM\nFD 100\nFD 100',
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
