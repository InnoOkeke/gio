import type { Quest } from '../quests.js';
import type { GameKey } from '../primitives.js';
import { SNOWFLAKE_DEF } from './coder-a.js';

/**
 * Turtle Coders, content B: stages 15 Bug Bay, 16 Tiny Code Temple, 17 Mirror Mountains, 18 Physics Peak,
 * 19 Game Studio and 20 Logo Master. Six quests each, in two units of three (teach, twist, own).
 * Reference solutions, naive answers and cheating counterexamples live in tests/solutions/coder-b.ts.
 */

const ticks = (n: number): GameKey[] => Array.from({ length: n }, () => 'TICK');
const lines = (...rows: string[]): string => rows.join('\n');

const polyspi = (len: number, angle: number, n: number): string => `MAKE "len ${len}\nREPEAT ${n} [FD :len RT ${angle} MAKE "len :len + 5]`;
/** What POLYSPI draws: a spiral that grows by 5 each side, with the pen colour counting down from :n to 1. */
const spiral = (len: number, angle: number, n: number): string => `MAKE "len ${len}\nMAKE "c ${n}\nREPEAT ${n} [SETPC :c FD :len RT ${angle} MAKE "len :len + 5 MAKE "c :c - 1]`;
/** What BLOOM draws: :k spirals of 12 sides, each turned 360 / :k further round. */
const bloom = (k: number, angle: number): string => `REPEAT ${k} [\n  MAKE "len 5\n  MAKE "c 12\n  REPEAT 12 [SETPC :c FD :len RT ${angle} MAKE "len :len + 5 MAKE "c :c - 1]\n  RT ${360 / k}\n]`;
/** The engine's commands once every bug is fixed: the fix is also what Fix the engine checks against. */
const ENGINE_DEFS = lines('TO PISTON :h', '  REPEAT 2 [FD :h RT 90 FD 20 RT 90]', 'END', 'TO ENGINE :n', '  REPEAT :n [', '    PISTON 60', '    PU', '    RT 90', '    FD 30', '    LT 90', '    PD', '  ]', 'END', 'TO WHEEL :r', '  REPEAT 36 [FD :r RT 10]', 'END', 'TO GEARS :k', '  REPEAT :k [', '    WHEEL 6', '    PU', '    FD 30', '    PD', '  ]', 'END');
const ENGINE_MAIN = lines('ENGINE 4', 'PU', 'BK 40', 'PD', 'GEARS 3');
const ENGINE_STARTER = lines('TO PISTON :h', '  REPEAT 2 [FD :h RT 90 FD 20 RT 60]', 'END', 'TO ENGINE :n', '  REPEAT :n - 1 [', '    PISTON 60', '    PU', '    RT 90', '    FD 30', '    LT 90', '  ]', 'END', 'TO WHEEL :r', '  REPEAT 36 [FD :r RT 10]', 'END', 'TO GEARS :k', '  REPEAT :k [', '    WHEEL 6', '    PU', '    FD 30', '    PD', '  ]', 'END', ENGINE_MAIN);

// ---- Bug Bay starters (each is also what the child sees in the editor) ----
const BB_TWO_BUGS = lines(
  '; Two houses, side by side. Something is wrong!',
  'TO BOX :s',
  '  REPEAT 4 [FD :s RT 60]',
  'END',
  'TO ROOF :s',
  '  REPEAT 3 [FD :s RT 120]',
  'END',
  'BOX 60',
  'FD 60',
  'RT 30',
  'ROOF 60',
  'LT 30',
  'BK 60',
  'RT 90',
  'FD 90',
  'LT 90',
  'BOX 40',
);
const BB_TWO_BUGS_FIXED = lines(
  '; Two houses, side by side. Something is wrong!',
  'TO BOX :s',
  '  REPEAT 4 [FD :s RT 90]',
  'END',
  'TO ROOF :s',
  '  REPEAT 3 [FD :s RT 120]',
  'END',
  'BOX 60',
  'FD 60',
  'RT 30',
  'ROOF 60',
  'LT 30',
  'BK 60',
  'PU',
  'RT 90',
  'FD 90',
  'LT 90',
  'PD',
  'BOX 40',
);
const BB_NAME = lines(
  'MAKE "size 60',
  'MAKE "turn 360 / 6',
  'TO HEXAGON',
  '  REPEAT 6 [FD :size RT :trun]',
  'END',
  'SETPC "red',
  'HEXAGON',
  'MAKE "size 30',
  'SETPC "blue',
  'HEXAGON',
);
const BB_RUNAWAY = lines('TO SPIRAL :n', '  FD :n', '  RT 120', '  SPIRAL :n + 5', 'END', 'SPIRAL 5');
const BB_OFF_BY_ONE = lines('TO PENT :n', '  IF :n > 130 [STOP]', '  FD :n', '  RT 72', '  PENT :n + 10', 'END', 'REPEAT 4 [', '  SETPC REPCOUNT + 7', '  PENT 10', '  RT 90', ']');
const BB_INPUTS = lines('TO RECT :w :h', '  REPEAT 2 [FD :h RT 90 FD :w RT 90]', 'END', 'TO CARD :w :h', '  RECT :w :h', '  RECT :w - 20 :h - 20', 'END', 'CARD 100 40', 'CARD 100');
const BB_GAME = lines(
  'MAKE "score 0',
  'WHEN "up [FD 20]',
  'WHEN "down [BK 20]',
  'WHEN "left [LT 90]',
  'WHEN "right [LT 90]',
  'WHEN "space [',
  '  MAKE "score :score + 1',
  '  SHOW :score',
  ']',
);
const BB_GAME_FIXED = lines(
  'MAKE "score 0',
  'WHEN "up [FD 20]',
  'WHEN "down [BK 20]',
  'WHEN "left [LT 90]',
  'WHEN "right [RT 90]',
  'WHEN "space [',
  '  CIRCLE 15',
  '  MAKE "score :score + 1',
  '  SHOW :score',
  ']',
);

// ---- Physics and game targets (the reference programs: the checker plays them with the same key presses) ----
const FALL = lines('PU', 'SETXY 0 100', 'PD', 'MAKE "v 0', 'WHEN "tick [', '  MAKE "v :v - 1', '  SETY YCOR + :v', ']');
const FLOOR = lines(
  'PU',
  'SETXY 0 100',
  'PD',
  'MAKE "v 0',
  'WHEN "tick [',
  '  MAKE "v :v - 1',
  '  MAKE "y YCOR + :v',
  '  IF :y < -100 [',
  '    MAKE "y -100',
  '    MAKE "v 0',
  '  ]',
  '  SETY :y',
  ']',
);
const BOUNCE = FLOOR.replace('MAKE "v 0\n  ]', 'MAKE "v 0 - :v\n  ]');
const DAMPED = FLOOR.replace('MAKE "v 0\n  ]', 'MAKE "v (0 - :v) * 3 / 4\n  ]');
const THROW = lines(
  'PU',
  'SETXY -100 -100',
  'PD',
  'MAKE "x -100',
  'MAKE "y -100',
  'MAKE "vy 12',
  'WHEN "tick [',
  '  MAKE "vy :vy - 1',
  '  MAKE "x :x + 6',
  '  MAKE "y :y + :vy',
  '  IF :y < -100 [',
  '    MAKE "y -100',
  '    MAKE "vy 0 - :vy',
  '  ]',
  '  SETXY :x :y',
  ']',
);
const PONG = lines(
  'MAKE "x 0',
  'MAKE "y 0',
  'MAKE "vx 7',
  'MAKE "vy 5',
  'WHEN "tick [',
  '  MAKE "x :x + :vx',
  '  MAKE "y :y + :vy',
  '  IF :x > 100 [MAKE "x 100 MAKE "vx 0 - :vx]',
  '  IF :x < -100 [MAKE "x -100 MAKE "vx 0 - :vx]',
  '  IF :y > 100 [MAKE "y 100 MAKE "vy 0 - :vy]',
  '  IF :y < -100 [MAKE "y -100 MAKE "vy 0 - :vy]',
  '  SETXY :x :y',
  ']',
);
const BOUNCE_COUNT = lines(
  'PU',
  'SETXY -100 100',
  'PD',
  'MAKE "x -100',
  'MAKE "y 100',
  'MAKE "vx 12',
  'MAKE "v 0',
  'MAKE "bounces 0',
  'WHEN "tick [',
  '  MAKE "v :v - 1',
  '  MAKE "x :x + :vx',
  '  MAKE "y :y + :v',
  '  IF :y < -100 [',
  '    MAKE "y -100',
  '    MAKE "v (0 - :v) / 2',
  '    MAKE "bounces :bounces + 1',
  '  ]',
  '  IF :x > 100 [',
  '    MAKE "x 100',
  '    MAKE "vx 0 - :vx',
  '    MAKE "bounces :bounces + 1',
  '  ]',
  '  IF :x < -100 [',
  '    MAKE "x -100',
  '    MAKE "vx 0 - :vx',
  '    MAKE "bounces :bounces + 1',
  '  ]',
  '  SETXY :x :y',
  '  SHOW :bounces',
  '  IF :bounces = 6 [GAMEOVER]',
']',
);

const GEM_PRESSES: GameKey[] = ['UP', 'UP', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'LEFT', 'RIGHT', 'DOWN'];
const GEM = lines(
  'MAKE "score 0',
  'TO STEP :h',
  '  SETH :h',
  '  FD 20',
  '  IF XCOR = 60 [IF YCOR = 60 [MAKE "score :score + 1]]',
  '  SHOW :score',
  'END',
  'WHEN "up [STEP 0]',
  'WHEN "right [STEP 90]',
  'WHEN "down [STEP 180]',
  'WHEN "left [STEP 270]',
);
const WALLS_PRESSES: GameKey[] = [
  ...Array.from({ length: 5 }, (): GameKey => 'RIGHT'),
  ...Array.from({ length: 5 }, (): GameKey => 'UP'),
  ...Array.from({ length: 7 }, (): GameKey => 'LEFT'),
  ...Array.from({ length: 7 }, (): GameKey => 'DOWN'),
];
const WALLS = lines(
  'PU',
  'TO GO :h',
  '  SETH :h',
  '  FD 30',
  '  IF XCOR > 100 [BK 30]',
  '  IF XCOR < -100 [BK 30]',
  '  IF YCOR > 100 [BK 30]',
  '  IF YCOR < -100 [BK 30]',
  '  DOT XCOR YCOR',
  'END',
  'WHEN "up [GO 0]',
  'WHEN "right [GO 90]',
  'WHEN "down [GO 180]',
  'WHEN "left [GO 270]',
);
const LIVES = lines(
  'MAKE "lives 3',
  'WHEN "up [FD 20]',
  'WHEN "right [RT 90]',
  'WHEN "space [',
  '  MAKE "lives :lives - 1',
  '  SHOW :lives',
  '  IF :lives = 0 [',
  '    SHOW "OVER',
  '    GAMEOVER',
  '  ]',
  ']',
);
const LEVELS_PRESSES: GameKey[] = [...Array.from({ length: 10 }, (): GameKey => 'RIGHT'), 'RIGHT', 'RIGHT', 'RIGHT', 'UP', 'UP'];
const LEVELS = lines(
  'MAKE "step 10',
  'MAKE "level 1',
  'SHOW :level',
  'TO GO :h',
  '  SETH :h',
  '  FD :step',
  '  IF XCOR >= 100 [',
  '    MAKE "level 2',
  '    MAKE "step 20',
  '    SHOW :level',
  '    HOME',
  '  ]',
  'END',
  'WHEN "right [GO 90]',
  'WHEN "up [GO 0]',
);
const CHASE_PRESSES: GameKey[] = ['RIGHT', 'RIGHT', 'RIGHT', ...ticks(14), 'UP', ...ticks(10)];
const CHASE = lines(
  'PU',
  'MAKE "ex 80',
  'MAKE "ey 80',
  'DOT :ex :ey',
  'WHEN "up [SETH 0 FD 10]',
  'WHEN "right [SETH 90 FD 10]',
  'WHEN "tick [',
  '  MAKE "d DISTANCE :ex :ey',
  '  MAKE "ex :ex + 5 * (XCOR - :ex) / :d',
  '  MAKE "ey :ey + 5 * (YCOR - :ey) / :d',
  '  DOT :ex :ey',
  '  IF DISTANCE :ex :ey < 10 [',
  '    SHOW "CAUGHT',
  '    GAMEOVER',
  '  ]',
  ']',
);
const THREE_PRESSES: GameKey[] = ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'];
const THREE = lines(
  'MAKE "level 1',
  'MAKE "score 0',
  'TO MOVE :h',
  '  SETH :h',
  '  FD 20',
  '  IF XCOR >= 20 + 20 * :level [',
  '    MAKE "score :score + 10',
  '    MAKE "level :level + 1',
  '    PU',
  '    HOME',
  '    PD',
  '    IFELSE :level = 4 [',
  '      SHOW [YOU WIN]',
  '      GAMEOVER',
  '    ] [',
  '      SHOW :score',
  '    ]',
  '  ]',
  'END',
  'WHEN "right [MOVE 90]',
  'WHEN "up [MOVE 0]',
);
const FINAL_PRESSES: GameKey[] = ['RIGHT', 'RIGHT', 'RIGHT', 'SPACE', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'];
const FINAL_GAME = lines(
  'MAKE "level 1',
  'MAKE "score 0',
  'MAKE "lives 3',
  'TO GEM',
  '  MAKE "score :score + 10',
  '  IFELSE :level = 2 [',
  '    SHOW :score + 5 * :lives',
  '    GAMEOVER',
  '  ] [',
  '    MAKE "level 2',
  '    SHOW :score',
  '    PU',
  '    HOME',
  '    PD',
  '  ]',
  'END',
  'TO MOVE :h',
  '  SETH :h',
  '  FD 20',
  '  IF XCOR >= 40 + 20 * :level [GEM]',
  'END',
  'WHEN "right [MOVE 90]',
  'WHEN "up [MOVE 0]',
  'WHEN "space [',
  '  MAKE "lives :lives - 1',
  '  SHOW :lives',
  ']',
);

export const CODER_B: Quest[] = [
  // ---- Stage 15: Bug Bay (every starter fails; fix it with a few small edits, do not rewrite it) ----
  { id: 'c-bb-two-bugs', audience: 'coder', concept: 'debugging', title: 'Two bugs', goal: 'This code should draw a house with sides of 60 and a roof, then, 90 steps to the right, a small box with sides of 40, with no line joining them. It has two bugs. Fix them.', hint: 'Look at how far BOX turns at each corner. Then ask: does the turtle lift its pen before it walks to the second box?', starter: BB_TWO_BUGS, target: BB_TWO_BUGS_FIXED, needs: { keeps: ['TO BOX :s', 'TO ROOF :s'], uses: ['TO', 'INPUT'] } },
  { id: 'c-bb-name', audience: 'coder', concept: 'debugging', title: 'Wrong name', goal: 'This code should draw a red hexagon with sides of 60 and a blue hexagon with sides of 30. It stops with an error. Find the misspelt name and fix it.', hint: 'Read the error message. Compare every :name with the name used in MAKE.', starter: BB_NAME, target: 'SETPC "red\nREPEAT 6 [FD 60 RT 60]\nSETPC "blue\nREPEAT 6 [FD 30 RT 60]', needs: { keeps: ['MAKE "size 60', 'TO HEXAGON'], minColours: 2 } },
  { id: 'c-bb-runaway', audience: 'coder', concept: 'debugging', title: 'Runaway', goal: 'SPIRAL should draw a triangle spiral with 20 lines: the first is 5 long and each is 5 longer, up to 100. It never stops and GIO shuts it down. Make it stop after the line of 100.', hint: 'A command that calls itself needs a way out. Add an IF with STOP as its first line.', starter: BB_RUNAWAY, target: polyspi(5, 120, 20), needs: { keeps: ['SPIRAL :n + 5', 'TO SPIRAL :n'] } },
  { id: 'c-bb-off-by-one', audience: 'coder', concept: 'debugging', title: 'One too many', goal: 'PENT should draw a five-sided spiral with 12 lines: 10, 20, 30, and so on up to 120. It is repeated 4 times, each in its own colour, turning right 90 in between. Every spiral has one line too many. Fix the test that stops it.', hint: 'The last line should be 120 long. The spiral stops when :n is bigger than which number?', starter: BB_OFF_BY_ONE, target: 'REPEAT 4 [SETPC REPCOUNT + 7 MAKE "len 10 REPEAT 12 [FD :len RT 72 MAKE "len :len + 10] RT 90]', needs: { keeps: ['PENT :n + 10', 'REPEAT 4'], minColours: 4 } },
  { id: 'c-bb-inputs', audience: 'coder', concept: 'debugging', title: 'Mixed-up inputs', goal: 'RECT :w :h draws a rectangle :w wide and :h tall. CARD :w :h draws RECT :w :h and then a smaller RECT inside it, 20 less in both directions. Draw CARD 40 100 (40 wide, 100 tall) and then CARD 100 30. The first call has its inputs the wrong way round and the second one is missing an input.', hint: 'The first input is the width. CARD needs two inputs every time, so the last line must give both.', starter: BB_INPUTS, target: 'REPEAT 2 [FD 100 RT 90 FD 40 RT 90]\nREPEAT 2 [FD 80 RT 90 FD 20 RT 90]\nREPEAT 2 [FD 30 RT 90 FD 100 RT 90]\nREPEAT 2 [FD 10 RT 90 FD 80 RT 90]', needs: { keeps: ['TO RECT :w :h', 'TO CARD :w :h'], uses: ['TO', 'INPUT'] } },
  { id: 'c-bb-game', audience: 'coder', concept: 'debugging', title: 'Broken game', goal: 'In this game the arrows move the turtle (up 20 forward, down 20 back, left turns left 90, right should turn right 90), and the space bar should draw a circle with a radius of 15 and add 1 to the score on the scoreboard. The right arrow turns the wrong way and space forgets the circle. I will press: up, right, up, space, right, up, space, left, down. The scoreboard must end on 2.', hint: 'Check the turn in the "right handler. Then look at everything the "space handler does, one line at a time.', starter: BB_GAME, target: BB_GAME_FIXED, presses: ['UP', 'RIGHT', 'UP', 'SPACE', 'RIGHT', 'UP', 'SPACE', 'LEFT', 'DOWN'], needs: { uses: ['WHEN'], words: ['SHOW'], trace: true, keeps: ['WHEN "up', 'WHEN "space'], expect: { show: '2' } } },

  // ---- Stage 16: Tiny Code Temple (the number of commands is the puzzle; REPEAT and each command inside it count) ----
  { id: 'c-tiny-square', audience: 'coder', concept: 'loops', title: 'Square in 3', goal: 'Draw a square with sides of 90, turning left at every corner, in 3 commands or fewer. A REPEAT counts as one command, and so does each command inside it.', hint: 'REPEAT 4 [FD 90 LT 90] is REPEAT, FD and LT: 3 commands.', target: 'REPEAT 4 [FD 90 LT 90]', needs: { uses: ['REPEAT'], maxCommands: 3 } },
  { id: 'c-tiny-ring', audience: 'coder', concept: 'loops', title: 'Ring in 5', goal: 'Draw 36 squares with sides of 50, each turned 10 degrees from the one before (the turtle turns right 90 for the corners). Use 5 commands or fewer.', hint: 'A square is REPEAT 4 [FD 50 RT 90]. Put it inside another REPEAT 36 together with RT 10.', target: 'REPEAT 36 [REPEAT 4 [FD 50 RT 90] RT 10]', needs: { uses: ['REPEAT'], maxCommands: 5 } },
  { id: 'c-tiny-burst', audience: 'coder', concept: 'loops', title: 'Burst in 4', goal: 'Draw 36 spokes, each 80 long and 10 degrees apart: go out 80, come back, turn right 10. Use 4 commands or fewer.', hint: 'REPEAT 36 [FD 80 BK 80 RT 10]. Count them: REPEAT, FD, BK, RT.', target: 'REPEAT 36 [FD 80 BK 80 RT 10]', needs: { uses: ['REPEAT'], maxCommands: 4 } },
  { id: 'c-tiny-spiral', audience: 'coder', concept: 'loops', title: 'Spiral in 4', goal: 'Draw a square spiral of 40 lines. The 1st line is 5 long, the 2nd is 10, the 3rd is 15, and so on up to 200. Turn right 90 after every line. Use 4 commands or fewer.', hint: 'MAKE and a counter cost too many commands. REPCOUNT already knows which round you are on: FD REPCOUNT * 5.', target: 'REPEAT 40 [FD REPCOUNT * 5 RT 90]', needs: { uses: ['REPEAT'], maxCommands: 4 } },
  { id: 'c-tiny-flower', audience: 'coder', concept: 'loops', title: 'Flower in 7', goal: 'Draw a flower of 6 petals. A petal is two curves: REPEAT 18 [FD 4 RT 5], then RT 90, then the same curve again, then RT 90. The petals are 60 degrees apart. Use 7 commands or fewer.', hint: 'Put the curve in a REPEAT 2 for one petal, and that in a REPEAT 6 together with RT 60. No TO needed: it costs commands too.', target: 'REPEAT 6 [REPEAT 2 [REPEAT 18 [FD 4 RT 5] RT 90] RT 60]', needs: { uses: ['REPEAT'], maxCommands: 7 } },
  { id: 'c-tiny-snowflake', audience: 'coder', concept: 'loops', title: 'Snow star in 5', goal: 'Draw a snow star: three sides, and each side is FD 30, LT 60, FD 30, RT 120, FD 30, LT 60, FD 30. Turn right 120 at each corner. Use 5 commands or fewer.', hint: 'Look at the turns: left 60, right 120, left 60, right 120 (the corner), and then they repeat. Six pairs of FD 30 and a turn make the whole star.', target: 'REPEAT 3 [FD 30 LT 60 FD 30 RT 120 FD 30 LT 60 FD 30 RT 120]', needs: { uses: ['REPEAT'], maxCommands: 5 } },

  // ---- Stage 17: Mirror Mountains ----
  { id: 'c-mir-butterfly', audience: 'coder', concept: 'functions', title: 'Butterfly', goal: 'Teach the turtle WING :s: a triangle with sides of :s, REPEAT 3 [FD :s RT 120]. Teach LWING :s: the same triangle turning left, REPEAT 3 [FD :s LT 120]. Draw a big butterfly: RT 30, WING 80, SETH 0, LT 30, LWING 80. Then a small one on top: SETH 0, RT 60, WING 50, SETH 0, LT 60, LWING 50.', hint: 'LWING is the mirror image of WING. Teach both with TO ... END and give each an input. I will try other sizes too.', target: 'RT 30 REPEAT 3 [FD 80 RT 120] SETH 0 LT 30 REPEAT 3 [FD 80 LT 120] SETH 0 RT 60 REPEAT 3 [FD 50 RT 120] SETH 0 LT 60 REPEAT 3 [FD 50 LT 120]', needs: { uses: ['TO', 'INPUT'], defines: [{ name: 'WING', inputs: 1 }, { name: 'LWING', inputs: 1 }], calls: [{ run: 'WING 40', target: 'REPEAT 3 [FD 40 RT 120]' }, { run: 'LWING 60', target: 'REPEAT 3 [FD 60 LT 120]' }] } },
  { id: 'c-mir-snowflake6', audience: 'coder', concept: 'functions', title: 'Six-fold snowflake', goal: 'Teach the turtle ARM :len: FD :len, RT 45, FD :len / 2, BK :len / 2, LT 90, FD :len / 2, BK :len / 2, RT 45, BK :len. Then draw 6 arms with ARM 40, turning right 60 after each one.', hint: 'REPEAT 6 [ARM 40 RT 60]. The arm ends back where it began. I will try other lengths too.', target: 'REPEAT 6 [FD 40 RT 45 FD 20 BK 20 LT 90 FD 20 BK 20 RT 45 BK 40 RT 60]', needs: { uses: ['TO', 'INPUT', 'REPEAT'], defines: [{ name: 'ARM', inputs: 1 }], calls: [{ run: 'ARM 60', target: 'FD 60 RT 45 FD 30 BK 30 LT 90 FD 30 BK 30 RT 45 BK 60' }, { run: 'ARM 20', target: 'FD 20 RT 45 FD 10 BK 10 LT 90 FD 10 BK 10 RT 45 BK 20' }] } },
  { id: 'c-mir-row', audience: 'coder', concept: 'functions', title: 'Tile row', goal: 'Draw a row of 5 squares with sides of 40, going to the right. After each square, lift the pen, turn right 90, go 50 steps, turn left 90 and put the pen down, so the squares are 10 apart.', hint: 'REPEAT 5 [ a square, then PU RT 90 FD 50 LT 90 PD ]', target: 'REPEAT 5 [REPEAT 4 [FD 40 RT 90] PU RT 90 FD 50 LT 90 PD]', needs: { uses: ['REPEAT'], words: ['PU', 'PD'] } },
  { id: 'c-mir-crosshatch', audience: 'coder', concept: 'functions', title: 'Crosshatch', goal: 'Teach the turtle TILE :s: a square with sides of :s that has both of its diagonals drawn. Each diagonal is SQRT :s * :s * 2 long. Then tile a floor of 3 rows of 3 tiles with TILE 40, side by side with no gaps, starting at the turtle and going right and up.', hint: 'REPEAT 4 [FD :s RT 135 FD SQRT :s * :s * 2 BK SQRT :s * :s * 2 LT 45] draws the square and the diagonals. For the floor, put a REPEAT 3 of TILE inside a REPEAT 3 and move with the pen up between tiles.', target: 'REPEAT 3 [REPEAT 3 [REPEAT 4 [FD 40 RT 135 FD 56.5685 BK 56.5685 LT 45] PU RT 90 FD 40 LT 90 PD] PU LT 90 FD 120 RT 90 FD 40 PD]', needs: { uses: ['TO', 'INPUT', 'NEST'], words: ['SQRT'], defines: [{ name: 'TILE', inputs: 1 }], calls: [{ run: 'TILE 30', target: 'REPEAT 4 [FD 30 RT 135 FD 42.4264 BK 42.4264 LT 45]' }, { run: 'TILE 50', target: 'REPEAT 4 [FD 50 RT 135 FD 70.7107 BK 70.7107 LT 45]' }] } },
  { id: 'c-mir-honeycomb', audience: 'coder', concept: 'functions', title: 'Honeycomb', goal: 'Teach the turtle HEX :s (a hexagon with sides of :s, REPEAT 6 [FD :s RT 60]) and HONEY :s, which calls HEX. HONEY draws one hexagon and then 6 more around it. Each of the 6 starts :s * SQRT 3 steps from the first one (51.96 when :s is 30), in the directions 30, 90, 150, 210, 270 and 330 degrees. Draw HONEY 30.', hint: 'REPEAT 6 [ PU RT 30 FD :s * SQRT 3 LT 30 PD HEX :s PU RT 30 BK :s * SQRT 3 RT 30 PD ]. Each time round the turtle is 60 degrees further round.', target: 'REPEAT 6 [FD 30 RT 60]\nREPEAT 6 [PU RT 30 FD 51.9615 LT 30 PD REPEAT 6 [FD 30 RT 60] PU RT 30 BK 51.9615 RT 30 PD]', needs: { uses: ['TO', 'INPUT', 'REPEAT'], words: ['SQRT'], defines: [{ name: 'HEX', inputs: 1 }, { name: 'HONEY', inputs: 1 }], calls: [{ run: 'HONEY 20', target: 'REPEAT 6 [FD 20 RT 60]\nREPEAT 6 [PU RT 30 FD 34.641 LT 30 PD REPEAT 6 [FD 20 RT 60] PU RT 30 BK 34.641 RT 30 PD]' }] } },
  { id: 'c-mir-mandala', audience: 'coder', concept: 'functions', title: 'Mandala', goal: 'Draw a mandala with three REPEATs inside each other. REPEAT 8 times: start with SETPC REPCOUNT + 7 so every round has its own colour, then REPEAT 3 times: a square with sides of 30 (REPEAT 4 [FD 30 RT 90]) and RT 10; then RT 45.', hint: 'The innermost is the square. Around it is REPEAT 3 [ square RT 10 ]. Around that is REPEAT 8 [ SETPC REPCOUNT + 7 ... RT 45 ].', target: 'REPEAT 8 [SETPC REPCOUNT + 7 REPEAT 3 [REPEAT 4 [FD 30 RT 90] RT 10] RT 45]', needs: { uses: ['REPEAT', 'NEST'], words: ['REPCOUNT'], minColours: 8 } },

  // ---- Stage 18: Physics Peak (the turtle moves a little on every tick, and the checker compares every position) ----
  { id: 'c-phys-fall', audience: 'coder', concept: 'variables', title: 'Gravity', goal: 'Go to (0, 100) with the pen up, then put the pen down, and MAKE "v 0. On every tick: take 1 off :v, then move the turtle up by :v with SETY YCOR + :v (it is negative, so the turtle falls faster and faster). I will tick 12 times.', hint: 'WHEN "tick [ MAKE "v :v - 1  SETY YCOR + :v ]', target: FALL, presses: ticks(12), needs: { uses: ['WHEN', 'MAKE'], trace: true } },
  { id: 'c-phys-floor', audience: 'coder', concept: 'variables', title: 'Floor', goal: 'Gravity again, with a floor at y = -100. On every tick: take 1 off :v, work out the new height MAKE "y YCOR + :v, and if :y is below -100, set :y to -100 and :v to 0. Then SETY :y, so the turtle never goes through the floor. I will tick 25 times.', hint: 'IF :y < -100 [ MAKE "y -100  MAKE "v 0 ] goes before SETY :y.', target: FLOOR, presses: ticks(25), needs: { uses: ['WHEN', 'IF'], trace: true } },
  { id: 'c-phys-bounce', audience: 'coder', concept: 'variables', title: 'Bounce', goal: 'Same as the floor, but when the turtle hits the floor it bounces: set :y to -100 and turn :v around with MAKE "v 0 - :v, so it shoots back up. I will tick 50 times.', hint: 'Only one line changes from the floor: MAKE "v 0 - :v instead of MAKE "v 0.', target: BOUNCE, presses: ticks(50), needs: { uses: ['WHEN', 'IF'], trace: true } },
  { id: 'c-phys-damped', audience: 'coder', concept: 'variables', title: 'Tired ball', goal: 'A bouncing ball that gets tired: on a bounce the new :v is the old speed turned around and made 3/4 as big, MAKE "v (0 - :v) * 3 / 4. Everything else is the same as the bounce. I will tick 70 times.', hint: 'The brackets matter: (0 - :v) * 3 / 4. Then every bounce is smaller than the one before.', target: DAMPED, presses: ticks(70), needs: { uses: ['WHEN', 'IF'], trace: true } },
  { id: 'c-phys-throw', audience: 'coder', concept: 'variables', title: 'Throw', goal: 'Go to (-100, -100) with the pen up, pen down, and MAKE "x -100, MAKE "y -100, MAKE "vy 12. On every tick, in this order: take 1 off :vy, add 6 to :x, add :vy to :y. If :y is below -100, set :y to -100 and turn :vy around (0 - :vy). Then SETXY :x :y. I will tick 30 times.', hint: 'It is the bounce with a sideways move. The order of the lines matters because the checker compares every tick.', target: THROW, presses: ticks(30), needs: { uses: ['WHEN', 'IF'], words: ['SETXY'], trace: true } },
  { id: 'c-phys-box', audience: 'coder', concept: 'variables', title: 'Pong ball', goal: 'A ball starts at (0, 0) with MAKE "x 0, "y 0, "vx 7 and "vy 5. On every tick: add :vx to :x and :vy to :y. Then in each of the four walls (x above 100, x below -100, y above 100, y below -100) put the ball on the wall and turn the speed for that direction around. Then SETXY :x :y. I will tick 60 times.', hint: 'Four IFs, one per wall. For the right wall: IF :x > 100 [ MAKE "x 100  MAKE "vx 0 - :vx ].', target: PONG, presses: ticks(60), needs: { uses: ['WHEN', 'IF'], words: ['SETXY'], trace: true } },

  // ---- Stage 19: Game Studio ----
  { id: 'c-gs-gem', audience: 'coder', concept: 'events', title: 'Gem collector', goal: 'Make the 4 arrow keys move the turtle 20 steps in their direction (SETH 0, 90, 180, 270 then FD 20). A gem is at (60, 60): each time the turtle lands on it, add 1 to :score (start with MAKE "score 0). After every move, SHOW :score. I will press: up, up, up, right, right, right, left, right, down. The scoreboard must end on 2.', hint: 'Use a command like STEP :h so all 4 keys share the code. IF XCOR = 60 [ IF YCOR = 60 [ ... ] ] checks both numbers.', target: GEM, presses: GEM_PRESSES, needs: { uses: ['WHEN', 'MAKE', 'IF'], words: ['SHOW'], trace: true, expect: { show: '2' } } },
  { id: 'c-gs-walls', audience: 'coder', concept: 'events', title: 'Walls', goal: 'Start with PU. The arrows move the turtle 30 steps in their direction. If that would put it past a wall (x or y beyond 100 or -100), it steps back so it stays inside. After every key leave a DOT at the turtle with DOT XCOR YCOR. I will press right 5 times, up 5 times, left 7 times and down 7 times.', hint: 'Move first, then test: IF XCOR > 100 [BK 30], and the same for the other three walls. The dot goes last.', target: WALLS, presses: WALLS_PRESSES, needs: { uses: ['WHEN', 'IF'], words: ['DOT', 'XCOR', 'YCOR'], trace: true } },
  { id: 'c-gs-lives', audience: 'coder', concept: 'events', title: 'Three lives', goal: 'MAKE "lives 3. The up arrow goes forward 20 and the right arrow turns right 90. SPACE hits a trap: take 1 off :lives and SHOW :lives. When :lives reaches 0, SHOW "OVER and GAMEOVER. I will press: space, up, space, right, space, space. The scoreboard must end on OVER.', hint: 'IF :lives = 0 [ SHOW "OVER  GAMEOVER ] goes at the end of the space handler. The last space press does nothing because the game is over.', target: LIVES, presses: ['SPACE', 'UP', 'SPACE', 'RIGHT', 'SPACE', 'SPACE'], needs: { uses: ['WHEN', 'IF'], words: ['SHOW', 'GAMEOVER'], trace: true, expect: { show: 'OVER', gameOver: true } } },
  { id: 'c-gs-levels', audience: 'coder', concept: 'events', title: 'Two levels', goal: 'MAKE "step 10 and MAKE "level 1, and SHOW :level. The right and up arrows move the turtle :step steps (SETH 90 or 0, then FD :step). When XCOR reaches 100 or more: MAKE "level 2, make :step 20, SHOW :level, and go HOME. I will press right 13 times, then up twice. The scoreboard must end on 2.', hint: 'Put the level test at the end of the shared move command, so both arrows use it.', target: LEVELS, presses: LEVELS_PRESSES, needs: { uses: ['WHEN', 'IF', 'TO'], words: ['SHOW', 'HOME'], trace: true, expect: { show: '2' } } },
  { id: 'c-gs-chase', audience: 'coder', concept: 'events', title: 'Chase', goal: 'Start with PU. A monster begins at (80, 80): MAKE "ex 80, MAKE "ey 80, and DOT :ex :ey. Right and up arrows move the turtle 10 (SETH 90 or 0). On each tick the monster moves 5 steps straight towards the turtle: MAKE "d DISTANCE :ex :ey, then add 5 * (XCOR - :ex) / :d to :ex and 5 * (YCOR - :ey) / :d to :ey, then DOT :ex :ey. If DISTANCE :ex :ey is under 10: SHOW "CAUGHT and GAMEOVER. I will press right 3 times, tick 14 times, up, then tick 10 times.', hint: 'DISTANCE x y tells you how far the turtle is from a spot. Do the maths in the order of the goal and the dots will line up.', target: CHASE, presses: CHASE_PRESSES, needs: { uses: ['WHEN', 'IF', 'MAKE'], words: ['DOT', 'DISTANCE', 'GAMEOVER', 'SHOW'], expect: { show: 'CAUGHT', gameOver: true } } },
  { id: 'c-gs-three', audience: 'coder', concept: 'events', title: 'Three-level game', goal: 'MAKE "level 1 and MAKE "score 0. The right arrow (SETH 90) and up arrow (SETH 0) move the turtle 20. When XCOR reaches 20 + 20 * :level or more: add 10 to :score, add 1 to :level, and PU, HOME, PD. Then if :level is 4, SHOW [YOU WIN] and GAMEOVER, otherwise SHOW :score. I will press right 5 times, up, then right 5 times.', hint: 'Make a command MOVE :h that the two arrows share. IFELSE :level = 4 [ ... ] [ SHOW :score ]', target: THREE, presses: THREE_PRESSES, needs: { uses: ['WHEN', 'IF', 'TO'], words: ['SHOW', 'GAMEOVER', 'HOME'], trace: true, expect: { show: 'YOU WIN', gameOver: true } } },

  // ---- Stage 20: Logo Master (each quest mixes at least three skills) ----
  { id: 'c-lm-polyspi', audience: 'coder', concept: 'recursion', title: 'Colour bloom', goal: 'Teach the turtle POLYSPI :len :angle :n. If :n is 0, STOP. Otherwise SETPC :n, FD :len, RT :angle, and call POLYSPI again with :len + 5 and :n - 1. Then teach BLOOM :k :angle: REPEAT :k times, draw POLYSPI 5 :angle 12 and turn RT 360 / :k. Draw BLOOM 4 90. I will also try other numbers!', hint: 'POLYSPI :len + 5 :angle :n - 1 is the call inside. BLOOM is a REPEAT :k with POLYSPI 5 :angle 12 and RT 360 / :k inside it.', target: bloom(4, 90), needs: { uses: ['RECURSION', 'INPUT', 'REPEAT'], words: ['SETPC'], defines: [{ name: 'POLYSPI', inputs: 3 }, { name: 'BLOOM', inputs: 2 }], calls: [{ run: 'BLOOM 3 120', target: bloom(3, 120) }, { run: 'BLOOM 6 60', target: bloom(6, 60) }, { run: 'POLYSPI 8 72 10', target: spiral(8, 72, 10) }] } },
  { id: 'c-lm-garden', audience: 'coder', concept: 'recursion', title: 'Random garden', goal: 'Start with SETBACKGROUND "navy, SETPC "yellow and MAKE "n 5. Teach the turtle FLOWER :r: REPEAT 4 [FD :r, CIRCLE :r, BK :r, RT 90]. Teach PLANT :x :y: PU, SETXY :x :y, PD, then FLOWER 10. Then REPEAT :n times: PLANT at a random spot, each one with its centre inside the box from -100 to 100 across and up.', hint: 'REPEAT :n [ PLANT (RANDOM 201) - 100 (RANDOM 201) - 100 ]. The brackets matter!', needs: { uses: ['TO', 'INPUT', 'REPEAT', 'MAKE'], words: ['RANDOM', 'SETXY', 'SETBACKGROUND', 'SETPC'], background: true, defines: [{ name: 'FLOWER', inputs: 1 }, { name: 'PLANT', inputs: 2 }], props: { segments: { count: [1480, 1480], length: [0.8, 10] }, bounds: { x: 120, y: 120 } } } },
  { id: 'c-lm-engine', audience: 'coder', concept: 'recursion', title: 'Fix the engine', goal: 'ENGINE 4 should draw 4 pistons in a row: PISTON :h draws a box 20 wide and :h tall, and ENGINE :n draws :n pistons of height 60 in a row: after each piston the turtle lifts the pen, goes 30 to the right and puts the pen down again. WHEEL :r and GEARS :k are fine. The code has three bugs, in both commands and in the loop. Fix them without rewriting it. I will also run ENGINE and GEARS with other numbers.', hint: 'Check the turn in PISTON, how many times ENGINE repeats, and whether the pen goes back down.', starter: ENGINE_STARTER, target: lines(ENGINE_DEFS, ENGINE_MAIN), needs: { keeps: ['TO PISTON :h', 'TO ENGINE :n', 'TO WHEEL :r', 'TO GEARS :k'], uses: ['TO', 'INPUT', 'REPEAT'], calls: [{ run: 'ENGINE 2', target: lines(ENGINE_DEFS, 'ENGINE 2') }, { run: 'GEARS 2', target: lines(ENGINE_DEFS, 'GEARS 2') }] } },
  { id: 'c-lm-tiny-flake', audience: 'coder', concept: 'recursion', title: 'Tiny snowflake', goal: 'Teach the turtle FLAKE :len :depth: three Koch curves of length :len, each followed by RT 120 (a Koch curve is the KOCH recipe from Fractal Falls). Draw FLAKE 81 2. I will also try other sizes and depths. Use 13 commands or fewer in the whole program.', hint: 'Every command counts, even STOP. IFELSE :depth = 0 [FD :len] [ the four calls with turns ] has no STOP, so it saves one command.', target: `${SNOWFLAKE_DEF}SNOWFLAKE 81 2`, needs: { uses: ['RECURSION', 'INPUT'], maxCommands: 13, defines: [{ name: 'FLAKE', inputs: 2 }], calls: [{ run: 'FLAKE 54 1', target: `${SNOWFLAKE_DEF}SNOWFLAKE 54 1` }, { run: 'FLAKE 27 3', target: `${SNOWFLAKE_DEF}SNOWFLAKE 27 3` }] } },
  { id: 'c-lm-bounce-count', audience: 'coder', concept: 'recursion', title: 'Ball in a box', goal: 'A tired ball is thrown across a box. Start with PU, SETXY -100 100 and PD, then MAKE "x -100, "y 100, "vx 6, "v 0 and "bounces 0. On every tick: take 1 off :v, add :vx to :x and add :v to :y. If :y is below -100: set :y to -100, MAKE "v (0 - :v) / 2 and add 1 to :bounces. If :x is above 100: set :x to 100, turn the sideways speed round with MAKE "vx 0 - :vx and add 1 to :bounces. If :x is below -100: do the same with -100. Then SETXY :x :y and SHOW :bounces. When :bounces reaches 6, GAMEOVER. I will tick 80 times. The scoreboard must end on 6.', hint: 'It is the tired ball with a counter and two side walls. Three IFs, one for the floor and one for each wall, and every one of them adds 1 to :bounces.', target: BOUNCE_COUNT, presses: ticks(80), needs: { uses: ['WHEN', 'IF', 'MAKE'], words: ['SHOW', 'SETXY', 'GAMEOVER'], trace: true, expect: { show: '6', gameOver: true } } },
  { id: 'c-lm-final-game', audience: 'coder', concept: 'recursion', title: 'The final game', goal: 'Make a game with 2 levels, a score and 3 lives. MAKE "level 1, "score 0, "lives 3. Right (SETH 90) and up (SETH 0) arrows move 20. SPACE takes a life and SHOWs :lives. Reaching XCOR 40 + 20 * :level or more wins the level: add 10 to :score. On level 1 that means level 2, SHOW :score, and PU, HOME, PD. On level 2 it means SHOW :score + 5 * :lives and GAMEOVER. I will press right 3 times, space, up, then right 4 times.', hint: 'A command GEM for winning a level and a command MOVE :h for the arrows keep it tidy. The final scoreboard is 20 points plus 5 for each of your 2 lives left.', target: FINAL_GAME, presses: FINAL_PRESSES, needs: { uses: ['WHEN', 'IF', 'TO', 'MAKE'], words: ['SHOW', 'GAMEOVER', 'HOME'], trace: true, expect: { show: '30', gameOver: true } } },
];
