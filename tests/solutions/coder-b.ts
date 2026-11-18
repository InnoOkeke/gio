import { KOCH_DEF, SNOWFLAKE_DEF } from '../../src/logo/stages/coder-a';
import { CODER_B } from '../../src/logo/stages/coder-b';

const starterOf = (id: string): string => CODER_B.find((q) => q.id === id)!.starter!;

/** Swap one piece of text for another and fail loudly if the piece is not there. */
const edit = (code: string, from: string, to: string): string => {
  if (!code.includes(from)) throw new Error(`Test setup: "${from}" is not in the code`);
  return code.replace(from, to);
};

const FLOOR_BODY = 'PU\nSETXY 0 100\nPD\nMAKE "v 0\nMAKE "y 100\nWHEN "tick [\n  MAKE "v :v - 1\n  MAKE "y :y + :v\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "v 0\n  ]\n  SETY :y\n]';

/** Reference solutions for stages 15 to 20 of Turtle Coders, written the way a child might. */
export const CODER_B_SOLUTIONS: Record<string, string> = {
  // Bug Bay: the starter with a few small edits
  'c-bb-two-bugs': edit(edit(starterOf('c-bb-two-bugs'), 'RT 60]', 'RT 90]'), 'BK 60\nRT 90\nFD 90\nLT 90\nBOX 40', 'BK 60\nPU\nRT 90\nFD 90\nLT 90\nPD\nBOX 40'),
  'c-bb-name': edit(starterOf('c-bb-name'), ':trun', ':turn'),
  'c-bb-runaway': edit(starterOf('c-bb-runaway'), 'TO SPIRAL :n\n', 'TO SPIRAL :n\n  IF :n > 100 [STOP]\n'),
  'c-bb-off-by-one': edit(starterOf('c-bb-off-by-one'), ':n > 130', ':n > 120'),
  'c-bb-inputs': edit(starterOf('c-bb-inputs'), 'CARD 100 40\nCARD 100', 'CARD 40 100\nCARD 100 30'),
  'c-bb-game': edit(edit(starterOf('c-bb-game'), 'WHEN "right [LT 90]', 'WHEN "right [RT 90]'), 'WHEN "space [\n', 'WHEN "space [\n  CIRCLE 15\n'),

  // Tiny Code Temple
  'c-tiny-square': 'REPEAT 4 [FD 90 LT 90]',
  'c-tiny-ring': 'REPEAT 36 [\n  REPEAT 4 [FD 50 RT 90]\n  RT 10\n]',
  'c-tiny-burst': 'REPEAT 36 [FD 80 BK 80 RT 10]',
  'c-tiny-spiral': 'REPEAT 40 [FD REPCOUNT * 5 RT 90]',
  'c-tiny-flower': 'REPEAT 6 [\n  REPEAT 2 [\n    REPEAT 18 [FD 4 RT 5]\n    RT 90\n  ]\n  RT 60\n]',
  'c-tiny-snowflake': 'REPEAT 6 [FD 30 LT 60 FD 30 RT 120]',

  // Mirror Mountains
  'c-mir-butterfly':
    'TO WING :s\n  REPEAT 3 [FD :s RT 120]\nEND\nTO LWING :s\n  REPEAT 3 [FD :s LT 120]\nEND\nRT 30\nWING 80\nSETH 0\nLT 30\nLWING 80\nSETH 0\nRT 60\nWING 50\nSETH 0\nLT 60\nLWING 50',
  'c-mir-snowflake6': 'TO ARM :len\n  FD :len\n  RT 45\n  FD :len / 2\n  BK :len / 2\n  LT 90\n  FD :len / 2\n  BK :len / 2\n  RT 45\n  BK :len\nEND\nREPEAT 6 [\n  ARM 40\n  RT 60\n]',
  'c-mir-row': 'REPEAT 5 [\n  REPEAT 4 [FD 40 RT 90]\n  PU\n  RT 90\n  FD 50\n  LT 90\n  PD\n]',
  'c-mir-crosshatch':
    'TO TILE :s\n  REPEAT 4 [FD :s RT 135 FD SQRT :s * :s * 2 BK SQRT :s * :s * 2 LT 45]\nEND\nREPEAT 3 [\n  REPEAT 3 [\n    TILE 40\n    PU\n    RT 90\n    FD 40\n    LT 90\n    PD\n  ]\n  PU\n  LT 90\n  FD 120\n  RT 90\n  FD 40\n  PD\n]',
  'c-mir-honeycomb':
    'TO HEX :s\n  REPEAT 6 [FD :s RT 60]\nEND\nTO HONEY :s\n  HEX :s\n  REPEAT 6 [\n    PU\n    RT 30\n    FD :s * SQRT 3\n    LT 30\n    PD\n    HEX :s\n    PU\n    RT 30\n    BK :s * SQRT 3\n    RT 30\n    PD\n  ]\nEND\nHONEY 30',
  'c-mir-mandala': 'REPEAT 8 [\n  SETPC REPCOUNT + 7\n  REPEAT 3 [\n    REPEAT 4 [FD 30 RT 90]\n    RT 10\n  ]\n  RT 45\n]',

  // Physics Peak
  'c-phys-fall': 'PU\nSETXY 0 100\nPD\nMAKE "v 0\nWHEN "tick [\n  MAKE "v :v - 1\n  SETY YCOR + :v\n]',
  'c-phys-floor': FLOOR_BODY,
  'c-phys-bounce': edit(FLOOR_BODY, 'MAKE "v 0\n  ]', 'MAKE "v 0 - :v\n  ]'),
  'c-phys-damped': edit(FLOOR_BODY, 'MAKE "v 0\n  ]', 'MAKE "v :v * -3 / 4\n  ]'),
  'c-phys-throw':
    'PU\nSETXY -100 -100\nPD\nMAKE "x -100\nMAKE "y -100\nMAKE "vy 12\nWHEN "tick [\n  MAKE "vy :vy - 1\n  MAKE "x :x + 6\n  MAKE "y :y + :vy\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "vy 0 - :vy\n  ]\n  SETXY :x :y\n]',
  'c-phys-box':
    'MAKE "x 0\nMAKE "y 0\nMAKE "vx 7\nMAKE "vy 5\nWHEN "tick [\n  MAKE "x :x + :vx\n  MAKE "y :y + :vy\n  IF :x > 100 [\n    MAKE "x 100\n    MAKE "vx 0 - :vx\n  ]\n  IF :x < -100 [\n    MAKE "x -100\n    MAKE "vx 0 - :vx\n  ]\n  IF :y > 100 [\n    MAKE "y 100\n    MAKE "vy 0 - :vy\n  ]\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "vy 0 - :vy\n  ]\n  SETXY :x :y\n]',

  // Game Studio
  'c-gs-gem':
    'MAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR = 60 [\n    IF YCOR = 60 [MAKE "score :score + 1]\n  ]\n  SHOW :score\nEND\nWHEN "up [MOVE 0]\nWHEN "right [MOVE 90]\nWHEN "down [MOVE 180]\nWHEN "left [MOVE 270]',
  'c-gs-walls':
    'PU\nTO GO :h\n  SETH :h\n  FD 30\n  IF XCOR > 100 [BK 30]\n  IF XCOR < -100 [BK 30]\n  IF YCOR > 100 [BK 30]\n  IF YCOR < -100 [BK 30]\n  DOT XCOR YCOR\nEND\nWHEN "up [GO 0]\nWHEN "right [GO 90]\nWHEN "down [GO 180]\nWHEN "left [GO 270]',
  'c-gs-lives': 'MAKE "lives 3\nWHEN "up [FD 20]\nWHEN "right [RT 90]\nWHEN "space [\n  MAKE "lives :lives - 1\n  SHOW :lives\n  IF :lives = 0 [\n    SHOW "OVER\n    GAMEOVER\n  ]\n]',
  'c-gs-levels':
    'MAKE "step 10\nMAKE "level 1\nSHOW :level\nTO GO :h\n  SETH :h\n  FD :step\n  IF XCOR >= 100 [\n    MAKE "level 2\n    MAKE "step 20\n    SHOW :level\n    HOME\n  ]\nEND\nWHEN "right [GO 90]\nWHEN "up [GO 0]',
  'c-gs-chase':
    'PU\nMAKE "ex 80\nMAKE "ey 80\nDOT :ex :ey\nWHEN "up [SETH 0 FD 10]\nWHEN "right [SETH 90 FD 10]\nWHEN "tick [\n  MAKE "d DISTANCE :ex :ey\n  MAKE "ex :ex + 5 * (XCOR - :ex) / :d\n  MAKE "ey :ey + 5 * (YCOR - :ey) / :d\n  DOT :ex :ey\n  IF DISTANCE :ex :ey < 10 [\n    SHOW "CAUGHT\n    GAMEOVER\n  ]\n]',
  'c-gs-three':
    'MAKE "level 1\nMAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR >= 20 + 20 * :level [\n    MAKE "score :score + 10\n    MAKE "level :level + 1\n    PU\n    HOME\n    PD\n    IFELSE :level = 4 [\n      SHOW [YOU WIN]\n      GAMEOVER\n    ] [\n      SHOW :score\n    ]\n  ]\nEND\nWHEN "right [MOVE 90]\nWHEN "up [MOVE 0]',

  // Logo Master
  'c-lm-polyspi': 'TO POLYSPI :len :angle :n\n  IF :n = 0 [STOP]\n  FD :len\n  RT :angle\n  POLYSPI :len + 5 :angle :n - 1\nEND\nPOLYSPI 5 90 20',
  'c-lm-garden': 'TO FLOWER :r\n  REPEAT 4 [\n    FD :r\n    CIRCLE :r\n    BK :r\n    RT 90\n  ]\nEND\nREPEAT 5 [\n  PU\n  SETXY (RANDOM 201) - 100 (RANDOM 201) - 100\n  PD\n  FLOWER 10\n]',
  'c-lm-engine': edit(
    edit(edit(starterOf('c-lm-engine'), 'RT 60]', 'RT 90]'), 'REPEAT :n - 1 [', 'REPEAT :n ['),
    '    LT 90\n  ]',
    '    LT 90\n    PD\n  ]',
  ),
  'c-lm-tiny-flake': 'TO KOCH :len :depth\n  IFELSE :depth = 0 [FD :len] [\n    KOCH :len / 3 :depth - 1\n    LT 60\n    KOCH :len / 3 :depth - 1\n    RT 120\n    KOCH :len / 3 :depth - 1\n    LT 60\n    KOCH :len / 3 :depth - 1\n  ]\nEND\nTO FLAKE :len :depth\n  REPEAT 3 [KOCH :len :depth RT 120]\nEND\nFLAKE 81 2',
  'c-lm-bounce-count':
    'PU\nSETXY 0 100\nPD\nMAKE "y 100\nMAKE "v 0\nMAKE "bounces 0\nWHEN "tick [\n  MAKE "v :v - 1\n  MAKE "y :y + :v\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "v :v * -0.5\n    MAKE "bounces :bounces + 1\n  ]\n  SETY :y\n  SHOW :bounces\n  IF :bounces > 4 [GAMEOVER]\n]',
  'c-lm-final-game':
    'MAKE "level 1\nMAKE "score 0\nMAKE "lives 3\nTO GEM\n  MAKE "score :score + 10\n  IFELSE :level = 2 [\n    SHOW :score + 5 * :lives\n    GAMEOVER\n  ] [\n    MAKE "level 2\n    SHOW :score\n    PU\n    HOME\n    PD\n  ]\nEND\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR >= 40 + 20 * :level [GEM]\nEND\nWHEN "right [MOVE 90]\nWHEN "up [MOVE 0]\nWHEN "space [\n  MAKE "lives :lives - 1\n  SHOW :lives\n]',
};

/**
 * Tiny Code Temple: the answer most children write first. It draws the right picture and uses REPEAT,
 * but needs more commands than the quest allows, so it must be sent back with "can you do it in N".
 */
export const CODER_B_NAIVE: Record<string, string> = {
  'c-tiny-square': 'REPEAT 2 [FD 90 LT 90 FD 90 LT 90]',
  'c-tiny-ring': 'REPEAT 36 [FD 50 RT 90 FD 50 RT 90 FD 50 RT 90 FD 50 RT 90 RT 10]',
  'c-tiny-burst': 'REPEAT 18 [FD 80 BK 80 RT 10 FD 80 BK 80 RT 10]',
  'c-tiny-spiral': 'MAKE "n 5\nREPEAT 40 [FD :n RT 90 MAKE "n :n + 5]',
  'c-tiny-flower': 'TO PETAL\n  REPEAT 2 [REPEAT 18 [FD 4 RT 5] RT 90]\nEND\nREPEAT 6 [PETAL RT 60]',
  'c-tiny-snowflake': 'REPEAT 3 [FD 30 LT 60 FD 30 RT 120 FD 30 LT 60 FD 30 RT 120]',
};

const GAME_UP_RIGHT = 'WHEN "up [FD 20]\nWHEN "right [RT 90]';

/**
 * Answers that look right but cheat or break a rule: a rewrite that throws the starter away, a fix of only
 * some of the bugs, hard-coded numbers, physics in the wrong order, or a scoreboard that is wrong. Each must fail.
 */
export const CODER_B_COUNTEREXAMPLES: Record<string, string[]> = {
  'c-bb-two-bugs': [
    'REPEAT 4 [FD 60 RT 90]\nFD 60\nRT 30\nREPEAT 3 [FD 60 RT 120]\nLT 30\nBK 60\nPU\nRT 90\nFD 90\nLT 90\nPD\nREPEAT 4 [FD 40 RT 90]',
    edit(starterOf('c-bb-two-bugs'), 'RT 60]', 'RT 90]'),
  ],
  'c-bb-name': ['REPEAT 6 [FD 60 RT 60]\nREPEAT 6 [FD 30 RT 60]', starterOf('c-bb-name')],
  'c-bb-runaway': ['MAKE "len 5\nREPEAT 20 [FD :len RT 120 MAKE "len :len + 5]', edit(starterOf('c-bb-runaway'), 'TO SPIRAL :n\n', 'TO SPIRAL :n\n  IF :n > 105 [STOP]\n')],
  'c-bb-off-by-one': [
    'REPEAT 4 [MAKE "len 10 REPEAT 12 [FD :len RT 72 MAKE "len :len + 10] RT 90]',
    edit(starterOf('c-bb-off-by-one'), ':n > 130', ':n > 110'),
  ],
  'c-bb-inputs': [
    'REPEAT 2 [FD 100 RT 90 FD 40 RT 90]\nREPEAT 2 [FD 80 RT 90 FD 20 RT 90]\nREPEAT 2 [FD 30 RT 90 FD 100 RT 90]\nREPEAT 2 [FD 10 RT 90 FD 80 RT 90]',
    edit(starterOf('c-bb-inputs'), 'CARD 100 40\nCARD 100', 'CARD 40 100\nCARD 30 100'),
  ],
  'c-bb-game': [
    `${GAME_UP_RIGHT}\nWHEN "space [CIRCLE 15]`,
    edit(starterOf('c-bb-game'), 'WHEN "right [LT 90]', 'WHEN "right [RT 90]'),
    edit(edit(starterOf('c-bb-game'), 'WHEN "right [LT 90]', 'WHEN "right [RT 90]'), 'WHEN "space [\n', 'WHEN "space [\n  CIRCLE 10\n'),
  ],

  'c-mir-butterfly': [
    'RT 30\nREPEAT 3 [FD 80 RT 120]\nSETH 0\nLT 30\nREPEAT 3 [FD 80 LT 120]\nSETH 0\nRT 60\nREPEAT 3 [FD 50 RT 120]\nSETH 0\nLT 60\nREPEAT 3 [FD 50 LT 120]',
    'TO WING :s\n  REPEAT 3 [FD 80 RT 120]\nEND\nTO LWING :s\n  REPEAT 3 [FD 80 LT 120]\nEND\nRT 30\nWING 80\nSETH 0\nLT 30\nLWING 80\nSETH 0\nRT 60\nWING 50\nSETH 0\nLT 60\nLWING 50',
    'TO WING :s\n  REPEAT 3 [FD :s RT 120]\nEND\nTO LWING :s\n  REPEAT 3 [FD :s RT 120]\nEND\nRT 30\nWING 80\nSETH 0\nLT 30\nLWING 80',
  ],
  'c-mir-snowflake6': [
    'REPEAT 6 [FD 40 RT 45 FD 20 BK 20 LT 90 FD 20 BK 20 RT 45 BK 40 RT 60]',
    'TO ARM :len\n  FD 40\n  RT 45\n  FD 20\n  BK 20\n  LT 90\n  FD 20\n  BK 20\n  RT 45\n  BK 40\nEND\nREPEAT 6 [ARM 40 RT 60]',
  ],
  'c-mir-row': ['REPEAT 5 [REPEAT 4 [FD 40 RT 90] RT 90 FD 50 LT 90]'],
  'c-mir-crosshatch': [
    'REPEAT 3 [REPEAT 3 [REPEAT 4 [FD 40 RT 135 FD 56.5685 BK 56.5685 LT 45] PU RT 90 FD 40 LT 90 PD] PU LT 90 FD 120 RT 90 FD 40 PD]',
    'TO TILE :s\n  REPEAT 4 [FD 40 RT 135 FD 56.5685 BK 56.5685 LT 45]\nEND\nREPEAT 3 [REPEAT 3 [TILE 40 PU RT 90 FD 40 LT 90 PD] PU LT 90 FD 120 RT 90 FD 40 PD]',
    'TO TILE :s\n  REPEAT 4 [FD :s RT 90]\nEND\nREPEAT 3 [REPEAT 3 [TILE 40 PU RT 90 FD 40 LT 90 PD] PU LT 90 FD 120 RT 90 FD 40 PD]',
  ],
  'c-mir-honeycomb': [
    'TO HEX :s\n  REPEAT 6 [FD :s RT 60]\nEND\nTO HONEY :s\n  HEX 30\n  REPEAT 6 [PU RT 30 FD 51.9615 LT 30 PD HEX 30 PU RT 30 BK 51.9615 RT 30 PD]\nEND\nHONEY 30',
    'TO HEX :s\n  REPEAT 6 [FD :s RT 60]\nEND\nTO HONEY :s\n  HEX :s\n  REPEAT 5 [PU RT 30 FD :s * SQRT 3 LT 30 PD HEX :s PU RT 30 BK :s * SQRT 3 RT 30 PD]\nEND\nHONEY 30',
  ],
  'c-mir-mandala': ['REPEAT 8 [REPEAT 3 [REPEAT 4 [FD 30 RT 90] RT 10] RT 45]', 'REPEAT 8 [SETPC REPCOUNT + 7 REPEAT 3 [REPEAT 4 [FD 30 RT 90] RT 10] RT 40]'],

  'c-phys-fall': [
    'PU\nSETXY 0 100\nPD\nMAKE "v 0\nWHEN "tick [\n  MAKE "v :v + 1\n  SETY YCOR + :v\n]',
    'PU\nSETXY 0 100\nPD\nMAKE "v 0\nWHEN "tick [\n  SETY YCOR + :v\n  MAKE "v :v - 1\n]',
  ],
  'c-phys-floor': [CODER_B_SOLUTIONS['c-phys-fall']!, edit(FLOOR_BODY, 'MAKE "y -100\n    MAKE "v 0', 'MAKE "y -90\n    MAKE "v 0')],
  'c-phys-bounce': [FLOOR_BODY, edit(FLOOR_BODY, 'MAKE "v 0\n  ]', 'MAKE "v 5\n  ]')],
  'c-phys-damped': [CODER_B_SOLUTIONS['c-phys-bounce']!, edit(FLOOR_BODY, 'MAKE "v 0\n  ]', 'MAKE "v :v * -0.5\n  ]')],
  'c-phys-throw': [
    'PU\nSETXY -100 -100\nPD\nMAKE "x -100\nMAKE "y -100\nMAKE "vy 12\nWHEN "tick [\n  MAKE "vy :vy - 1\n  MAKE "x :x + 6\n  MAKE "y :y + :vy\n  SETXY :x :y\n]',
    'PU\nSETXY -100 -100\nPD\nMAKE "x -100\nMAKE "y -100\nMAKE "vy 12\nWHEN "tick [\n  MAKE "x :x + 6\n  MAKE "y :y + :vy\n  MAKE "vy :vy - 1\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "vy 0 - :vy\n  ]\n  SETXY :x :y\n]',
  ],
  'c-phys-box': [
    'MAKE "x 0\nMAKE "y 0\nMAKE "vx 7\nMAKE "vy 5\nWHEN "tick [\n  MAKE "x :x + :vx\n  MAKE "y :y + :vy\n  IF :x > 100 [MAKE "x 100 MAKE "vx 0 - :vx]\n  IF :x < -100 [MAKE "x -100 MAKE "vx 0 - :vx]\n  SETXY :x :y\n]',
  ],

  'c-gs-gem': [
    'MAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  MAKE "score :score + 1\n  SHOW :score\nEND\nWHEN "up [MOVE 0]\nWHEN "right [MOVE 90]\nWHEN "down [MOVE 180]\nWHEN "left [MOVE 270]',
    'MAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR = 60 [MAKE "score :score + 1]\n  SHOW :score\nEND\nWHEN "up [MOVE 0]\nWHEN "right [MOVE 90]\nWHEN "down [MOVE 180]\nWHEN "left [MOVE 270]',
  ],
  'c-gs-walls': [
    'PU\nTO GO :h\n  SETH :h\n  FD 30\n  DOT XCOR YCOR\nEND\nWHEN "up [GO 0]\nWHEN "right [GO 90]\nWHEN "down [GO 180]\nWHEN "left [GO 270]',
    'PU\nTO GO :h\n  SETH :h\n  FD 30\n  IF XCOR > 100 [BK 30]\n  IF XCOR < -100 [BK 30]\n  IF YCOR > 100 [BK 30]\n  IF YCOR < -100 [BK 30]\nEND\nWHEN "up [GO 0]\nWHEN "right [GO 90]\nWHEN "down [GO 180]\nWHEN "left [GO 270]',
  ],
  'c-gs-lives': [
    'MAKE "lives 3\nWHEN "up [FD 20]\nWHEN "right [RT 90]\nWHEN "space [\n  SHOW "OVER\n  GAMEOVER\n]',
    'MAKE "lives 3\nWHEN "up [FD 20]\nWHEN "right [RT 90]\nWHEN "space [\n  MAKE "lives :lives - 1\n  SHOW :lives\n  IF :lives = 0 [GAMEOVER]\n]',
  ],
  'c-gs-levels': [
    'MAKE "step 10\nMAKE "level 1\nSHOW :level\nTO GO :h\n  SETH :h\n  FD :step\n  IF XCOR >= 100 [\n    SHOW 2\n    HOME\n  ]\nEND\nWHEN "right [GO 90]\nWHEN "up [GO 0]',
    'MAKE "step 10\nMAKE "level 1\nSHOW :level\nTO GO :h\n  SETH :h\n  FD :step\n  IF XCOR >= 100 [\n    MAKE "level 2\n    SHOW :level\n    HOME\n  ]\nEND\nWHEN "right [GO 90]\nWHEN "up [GO 0]',
  ],
  'c-gs-chase': [
    'PU\nMAKE "ex 80\nMAKE "ey 80\nDOT :ex :ey\nWHEN "up [SETH 0 FD 10]\nWHEN "right [SETH 90 FD 10]\nWHEN "tick [\n  MAKE "d DISTANCE :ex :ey\n  MAKE "ex :ex + 6 * (XCOR - :ex) / :d\n  MAKE "ey :ey + 6 * (YCOR - :ey) / :d\n  DOT :ex :ey\n  IF DISTANCE :ex :ey < 10 [\n    SHOW "CAUGHT\n    GAMEOVER\n  ]\n]',
    'PU\nMAKE "ex 80\nMAKE "ey 80\nDOT :ex :ey\nWHEN "up [SETH 0 FD 10]\nWHEN "right [SETH 90 FD 10]\nWHEN "tick [\n  MAKE "d DISTANCE :ex :ey\n  MAKE "ex :ex + 5 * (XCOR - :ex) / :d\n  MAKE "ey :ey + 5 * (YCOR - :ey) / :d\n  DOT :ex :ey\n  IF DISTANCE :ex :ey < 10 [SHOW "CAUGHT]\n]',
  ],
  'c-gs-three': [
    'MAKE "level 1\nMAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR >= 20 + 20 * :level [\n    MAKE "score :score + 10\n    MAKE "level :level + 1\n    PU\n    HOME\n    PD\n    IFELSE :level = 4 [\n      SHOW "WIN\n      GAMEOVER\n    ] [\n      SHOW :score\n    ]\n  ]\nEND\nWHEN "right [MOVE 90]\nWHEN "up [MOVE 0]',
    'MAKE "level 1\nMAKE "score 0\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR >= 20 + 20 * :level [\n    MAKE "score :score + 10\n    MAKE "level :level + 1\n    PU\n    HOME\n    PD\n    SHOW :score\n  ]\nEND\nWHEN "right [MOVE 90]\nWHEN "up [MOVE 0]',
  ],

  'c-lm-polyspi': [
    'TO POLYSPI :len :angle :n\n  IF :n = 0 [STOP]\n  FD :len\n  RT 90\n  POLYSPI :len + 5 :angle :n - 1\nEND\nPOLYSPI 5 90 20',
    'TO POLYSPI :len :angle :n\n  IF :n = 0 [STOP]\n  FD :len\n  RT :angle\n  POLYSPI :len + 5 :angle :n - 1\nEND\nPOLYSPI 5 90 20\nPOLYSPI 5 90 20',
    'MAKE "len 5\nREPEAT 20 [FD :len RT 90 MAKE "len :len + 5]',
  ],
  'c-lm-garden': [
    'TO FLOWER :r\n  REPEAT 4 [FD :r CIRCLE :r BK :r RT 90]\nEND\nREPEAT 5 [FLOWER 10]',
    'TO FLOWER :r\n  REPEAT 4 [FD :r CIRCLE :r BK :r RT 90]\nEND\nREPEAT 5 [PU SETXY RANDOM 300 RANDOM 300 PD FLOWER 10]',
    'TO FLOWER :r\n  REPEAT 4 [FD :r CIRCLE :r BK :r RT 90]\nEND\nREPEAT 4 [PU SETXY (RANDOM 201) - 100 (RANDOM 201) - 100 PD FLOWER 10]',
  ],
  'c-lm-engine': [
    'REPEAT 4 [REPEAT 2 [FD 60 RT 90 FD 20 RT 90] PU RT 90 FD 30 LT 90 PD]',
    edit(starterOf('c-lm-engine'), 'RT 60]', 'RT 90]'),
  ],
  'c-lm-tiny-flake': [
    `${KOCH_DEF}TO FLAKE :len :depth\n  REPEAT 3 [KOCH :len :depth RT 120]\nEND\nFLAKE 81 2`,
    'TO FLAKE :len :depth\n  REPEAT 3 [FD :len RT 120]\nEND\nFLAKE 81 2',
    `${SNOWFLAKE_DEF}SNOWFLAKE 81 2`,
  ],
  'c-lm-bounce-count': [
    'PU\nSETXY 0 100\nPD\nMAKE "y 100\nMAKE "v 0\nMAKE "bounces 0\nWHEN "tick [\n  MAKE "v :v - 1\n  MAKE "y :y + :v\n  MAKE "bounces :bounces + 1\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "v :v * -0.5\n  ]\n  SETY :y\n  SHOW :bounces\n  IF :bounces > 4 [GAMEOVER]\n]',
    'PU\nSETXY 0 100\nPD\nMAKE "y 100\nMAKE "v 0\nMAKE "bounces 0\nWHEN "tick [\n  MAKE "v :v - 1\n  MAKE "y :y + :v\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "v 0 - :v\n    MAKE "bounces :bounces + 1\n  ]\n  SETY :y\n  SHOW :bounces\n  IF :bounces > 4 [GAMEOVER]\n]',
    'PU\nSETXY 0 100\nPD\nMAKE "y 100\nMAKE "v 0\nMAKE "bounces 0\nWHEN "tick [\n  MAKE "v :v - 1\n  MAKE "y :y + :v\n  IF :y < -100 [\n    MAKE "y -100\n    MAKE "v :v * -0.5\n    MAKE "bounces :bounces + 1\n  ]\n  SETY :y\n  SHOW :bounces\n]',
  ],
  'c-lm-final-game': [
    'MAKE "level 1\nMAKE "score 0\nMAKE "lives 3\nTO GEM\n  MAKE "score :score + 10\n  IFELSE :level = 2 [\n    SHOW :score\n    GAMEOVER\n  ] [\n    MAKE "level 2\n    SHOW :score\n    PU\n    HOME\n    PD\n  ]\nEND\nTO MOVE :h\n  SETH :h\n  FD 20\n  IF XCOR >= 40 + 20 * :level [GEM]\nEND\nWHEN "right [MOVE 90]\nWHEN "up [MOVE 0]\nWHEN "space [\n  MAKE "lives :lives - 1\n  SHOW :lives\n]',
  ],
};
