import { BUSH_DEF, FERN_DEF, KOCH_DEF, SIERP_DEF, SNOWFLAKE_DEF, TREE_DEF } from '../../src/logo/stages/coder-a';

/** Reference solutions for stages 3, 6, 8, 10, 12 and 14 of Turtle Coders, written the way a child might. */
export const CODER_A_SOLUTIONS: Record<string, string> = {
  // Colour Cove
  'c-red-blue': 'SETPC "red\nFD 100\nRT 90\nSETPC "blue\nFD 100',
  'c-four-colours': 'SETPC "red\nFD 100\nRT 90\nSETPC "blue\nFD 100\nRT 90\nSETPC "green\nFD 100\nRT 90\nSETPC "purple\nFD 100',
  'c-fat-lines': 'REPEAT 2 [\n  SETPENSIZE 2\n  FD 80\n  RT 90\n  SETPENSIZE 12\n  FD 80\n  RT 90\n]',
  'c-night-sky': 'SETBACKGROUND "navy\nSETPC "yellow\nREPEAT 5 [\n  FD 100\n  RT 144\n]',
  'c-rainbow-fan': 'REPEAT 8 [\n  SETPC REPCOUNT + 7\n  FD 80\n  BK 80\n  RT 45\n]',
  'c-colour-wheel': 'SETBACKGROUND "navy\nREPEAT 12 [\n  SETPC REPCOUNT + 3\n  FD 30\n  CIRCLE 30\n  BK 30\n  RT 30\n]',

  // Ingredient Island
  'c-ing-square': 'TO SQ :s\n  REPEAT 4 [FD :s RT 90]\nEND\nSQ 50',
  'c-ing-poly': 'TO POLY :sides :len\n  REPEAT :sides [FD :len RT 360 / :sides]\nEND\nPOLY 6 50',
  'c-ing-petals': 'TO PETALS :n :r\n  REPEAT :n [\n    FD :r\n    CIRCLE :r\n    BK :r\n    RT 360 / :n\n  ]\nEND\nPETALS 8 40',
  'c-ing-house': 'TO ROOF :s\n  REPEAT 3 [FD :s RT 120]\nEND\nTO HOUSE :s\n  REPEAT 4 [FD :s RT 90]\n  FD :s\n  RT 30\n  ROOF :s\nEND\nHOUSE 80',
  'c-ing-grid':
    'TO ROW :n :s\n  REPEAT :n [\n    REPEAT 4 [FD :s RT 90]\n    PU\n    RT 90\n    FD :s\n    LT 90\n    PD\n  ]\nEND\nTO GRID :rows :n :s\n  REPEAT :rows [\n    ROW :n :s\n    PU\n    LT 90\n    FD :n * :s\n    RT 90\n    FD :s\n    PD\n  ]\nEND\nGRID 3 2 40',
  'c-ing-stars': 'TO STARN :points :len\n  REPEAT :points [FD :len RT 180 - 180 / :points]\nEND\nSTARN 5 120',

  // Grid Garden
  'c-grid-corners': 'DOT 80 80\nDOT 80 -80\nDOT -80 -80\nDOT -80 80',
  'c-grid-ruler': 'PU\nRT 90\nBK 100\nREPEAT 11 [\n  DOT XCOR 0\n  FD 20\n]',
  'c-grid-diagonal': 'REPEAT 5 [DOT REPCOUNT * 20 REPCOUNT * 20]',
  'c-grid-lattice': 'MAKE "y -60\nREPEAT 5 [\n  MAKE "x -60\n  REPEAT 5 [\n    DOT :x :y\n    MAKE "x :x + 30\n  ]\n  MAKE "y :y + 30\n]',
  'c-grid-axes':
    'PU\nSETXY -100 0\nPD\nSETX 100\nPU\nSETXY 0 -100\nPD\nSETY 100\nPU\nSETXY -100 -5\nREPEAT 11 [\n  PD\n  SETY 5\n  PU\n  SETY -5\n  SETX XCOR + 20\n]\nSETXY -5 -100\nREPEAT 11 [\n  PD\n  SETX 5\n  PU\n  SETX -5\n  SETY YCOR + 20\n]',
  'c-grid-parabola': 'MAKE "x -100\nPU\nSETXY :x :x * :x / 50\nPD\nREPEAT 20 [\n  MAKE "x :x + 10\n  SETXY :x :x * :x / 50\n]',

  // Surprise Springs
  'c-rand-step': 'FD 20 + RANDOM 80',
  'c-rand-wobble': 'REPEAT 10 [\n  FD 30\n  RT RANDOM 360\n]',
  'c-rand-coin': 'REPEAT 20 [\n  FD 20\n  IFELSE RANDOM 2 = 0 [LT 90] [RT 90]\n]',
  'c-rand-dice': 'MAKE "n 3 + RANDOM 5\nREPEAT :n [\n  FD 40\n  RT 360 / :n\n]',
  'c-rand-confetti': 'REPEAT 30 [DOT (RANDOM 201) - 100 (RANDOM 201) - 100]',
  'c-rand-maze': 'REPEAT 40 [\n  SETH 90 * RANDOM 4\n  FD 15\n]',

  // Clockwork Canyon
  'c-clock-walk': 'WHEN "tick [\n  FD 5\n]',
  'c-clock-spiral': 'MAKE "n 2\nWHEN "tick [\n  FD :n\n  RT 90\n  MAKE "n :n + 2\n]',
  'c-clock-count': 'MAKE "n 0\nWHEN "tick [\n  MAKE "n :n + 1\n  SHOW :n\n  FD 3\n]',
  'c-clock-timer': 'MAKE "t 10\nWHEN "tick [\n  MAKE "t :t - 1\n  FD 10\n  SHOW :t\n  IF :t = 0 [GAMEOVER]\n]',
  'c-clock-score':
    'MAKE "score 0\nWHEN "space [\n  MAKE "score :score + 10\n  FD 10\n  SHOW :score\n]\nWHEN "tick [\n  MAKE "score :score - 1\n  RT 15\n  SHOW :score\n]',
  'c-clock-race':
    'TO FINISH\n  IF XCOR > 100 [\n    SHOW "WIN\n    GAMEOVER\n  ]\nEND\nRT 90\nWHEN "tick [\n  FD 10\n  FINISH\n]\nWHEN "space [\n  FD 20\n  FINISH\n]',

  // Fractal Falls
  'c-frac-tree': `${TREE_DEF}TREE 80 3`,
  'c-frac-koch': `${KOCH_DEF}KOCH 150 2`,
  'c-frac-sierpinski': `${SIERP_DEF}SIERP 160 3`,
  'c-frac-snowflake': `${SNOWFLAKE_DEF}SNOWFLAKE 120 2`,
  'c-frac-general': `${BUSH_DEF}BUSH 70 3 25`,
  'c-frac-fern': `${FERN_DEF}FERN 80 4`,
};

/**
 * Answers that look right on the picture the child sees but cheat: hard-coded numbers instead of inputs,
 * a fixed answer where RANDOM is needed, or a result written straight to the scoreboard. Each must fail.
 */
export const CODER_A_COUNTEREXAMPLES: Record<string, string[]> = {
  'c-red-blue': ['FD 100\nRT 90\nFD 100'],
  'c-four-colours': ['REPEAT 4 [FD 100 RT 90]'],
  'c-fat-lines': ['REPEAT 4 [FD 80 RT 90]'],
  'c-night-sky': ['REPEAT 5 [FD 100 RT 144]'],
  'c-rainbow-fan': ['REPEAT 8 [FD 80 BK 80 RT 45]', 'REPEAT 8 [SETPC 4 FD 80 BK 80 RT 45]'],
  'c-colour-wheel': ['REPEAT 12 [FD 30 CIRCLE 30 BK 30 RT 30]', 'REPEAT 12 [SETPC 4 FD 30 CIRCLE 30 BK 30 RT 30]'],

  'c-ing-square': ['TO SQ :s\n  REPEAT 4 [FD 50 RT 90]\nEND\nSQ 50', 'REPEAT 4 [FD 50 RT 90]'],
  'c-ing-poly': ['TO POLY :sides :len\n  REPEAT 6 [FD 50 RT 60]\nEND\nPOLY 6 50', 'TO POLY :sides :len\n  REPEAT :sides [FD 50 RT 360 / :sides]\nEND\nPOLY 6 50'],
  'c-ing-petals': ['TO PETALS :n :r\n  REPEAT 8 [FD 40 CIRCLE 40 BK 40 RT 45]\nEND\nPETALS 8 40', 'TO PETALS :n :r\n  REPEAT :n [FD 40 CIRCLE 40 BK 40 RT 360 / :n]\nEND\nPETALS 8 40'],
  'c-ing-house': [
    'TO ROOF :s\n  REPEAT 3 [FD :s RT 120]\nEND\nTO HOUSE :s\n  REPEAT 4 [FD 80 RT 90]\n  FD 80\n  RT 30\n  ROOF 80\nEND\nHOUSE 80',
    'TO HOUSE :s\n  REPEAT 4 [FD :s RT 90]\n  FD :s\n  RT 30\n  REPEAT 3 [FD :s RT 120]\nEND\nHOUSE 80',
  ],
  'c-ing-grid': [
    'TO ROW :n :s\n  REPEAT 2 [REPEAT 4 [FD 40 RT 90] PU RT 90 FD 40 LT 90 PD]\nEND\nTO GRID :rows :n :s\n  REPEAT 3 [ROW 2 40 PU LT 90 FD 80 RT 90 FD 40 PD]\nEND\nGRID 3 2 40',
  ],
  'c-ing-stars': ['TO STARN :points :len\n  REPEAT 5 [FD :len RT 144]\nEND\nSTARN 5 120', 'TO STARN :points :len\n  REPEAT :points [FD 120 RT 144]\nEND\nSTARN 5 120'],

  'c-grid-corners': ['DOT 80 80\nDOT 80 -80\nDOT -80 -80', 'FD 80\nRT 90\nFD 160'],
  'c-grid-ruler': ['PU\nRT 90\nBK 100\nREPEAT 10 [\n  DOT XCOR 0\n  FD 20\n]', 'PU\nRT 90\nBK 100\nREPEAT 11 [\n  DOT XCOR 0\n  FD 10\n]'],
  'c-grid-diagonal': ['REPEAT 5 [DOT REPCOUNT * 20 0]', 'DOT 20 20\nDOT 40 40\nDOT 60 60\nDOT 80 80\nDOT 100 100'],
  'c-grid-lattice': ['REPEAT 25 [DOT 0 0]', 'MAKE "x -60\nREPEAT 5 [\n  DOT :x 0\n  MAKE "x :x + 30\n]'],
  'c-grid-axes': ['PU\nSETXY -100 0\nPD\nSETX 100\nPU\nSETXY 0 -100\nPD\nSETY 100'],
  'c-grid-parabola': ['PU\nSETXY -100 200\nPD\nSETXY 100 200', 'MAKE "x -100\nPU\nSETXY :x :x * :x / 50\nPD\nREPEAT 20 [\n  MAKE "x :x + 10\n  SETXY :x :x / 5\n]'],

  'c-rand-step': ['FD 50', 'FD RANDOM 10'],
  'c-rand-wobble': ['REPEAT 10 [FD 30 RT 45]', 'REPEAT 10 [FD 30 RT RANDOM 360 / 360]'],
  'c-rand-coin': ['REPEAT 20 [FD 20 RT 90]', 'REPEAT 20 [FD 20 IFELSE RANDOM 2 = 0 [LT 45] [RT 45]]'],
  'c-rand-dice': ['REPEAT 5 [FD 40 RT 72]', 'MAKE "n 3 + RANDOM 5\nREPEAT :n [FD 40 RT 72]'],
  'c-rand-confetti': ['REPEAT 30 [DOT 0 0]', 'REPEAT 30 [DOT RANDOM 201 RANDOM 201]'],
  'c-rand-maze': ['REPEAT 40 [FD 15 RT 90]', 'REPEAT 40 [SETH RANDOM 360 FD 15]'],

  'c-clock-walk': ['FD 50', 'WHEN "tick [FD 4]'],
  'c-clock-spiral': ['MAKE "n 2\nWHEN "tick [FD :n RT 90 MAKE "n :n + 1]', 'MAKE "n 2\nWHEN "tick [FD 2 RT 90]'],
  'c-clock-count': ['SHOW 10\nFD 30', 'MAKE "n 0\nWHEN "tick [MAKE "n :n + 1 FD 3]', 'MAKE "n 0\nWHEN "tick [MAKE "n :n + 2 SHOW :n FD 3]'],
  'c-clock-timer': ['SHOW 0\nGAMEOVER', 'MAKE "t 10\nWHEN "tick [MAKE "t :t - 1 FD 10 SHOW :t]', 'FD 100\nSHOW 0\nGAMEOVER'],
  'c-clock-score': ['SHOW 35', 'MAKE "score 0\nWHEN "space [MAKE "score :score + 10 SHOW :score]\nWHEN "tick [MAKE "score :score - 1 SHOW :score]'],
  'c-clock-race': ['RT 90\nFD 110\nSHOW "WIN\nGAMEOVER', 'RT 90\nWHEN "tick [FD 10 IF XCOR > 100 [SHOW "WIN GAMEOVER]]\nWHEN "space [FD 10 IF XCOR > 100 [SHOW "WIN GAMEOVER]]'],

  'c-frac-tree': ['TO TREE :len :depth\n  IF :depth = 0 [STOP]\n  FD 80\n  LT 30\n  TREE 56 :depth - 1\n  RT 60\n  TREE 56 :depth - 1\n  LT 30\n  BK 80\nEND\nTREE 80 3'],
  'c-frac-koch': ['TO KOCH :len :depth\n  IF :depth = 0 [FD 50 STOP]\n  KOCH 50 :depth - 1\n  LT 60\n  KOCH 50 :depth - 1\n  RT 120\n  KOCH 50 :depth - 1\n  LT 60\n  KOCH 50 :depth - 1\nEND\nKOCH 150 2'],
  'c-frac-sierpinski': ['TO SIERP :size :depth\n  IF :depth = 0 [REPEAT 3 [FD 20 RT 120] STOP]\n  REPEAT 3 [SIERP 80 :depth - 1 FD 160 RT 120]\nEND\nSIERP 160 3'],
  'c-frac-snowflake': [`${KOCH_DEF}TO SNOWFLAKE :len :depth\n  REPEAT 3 [KOCH 120 2 RT 120]\nEND\nSNOWFLAKE 120 2`],
  'c-frac-general': ['TO BUSH :len :depth :angle\n  IF :depth = 0 [STOP]\n  FD :len\n  LT 25\n  BUSH :len * 0.7 :depth - 1 :angle\n  RT 50\n  BUSH :len * 0.7 :depth - 1 :angle\n  LT 25\n  BK :len\nEND\nBUSH 70 3 25'],
  'c-frac-fern': ['TO FERN :len :depth\n  IF :depth = 0 [STOP]\n  FD :len\n  LT 30\n  FERN :len * 0.5 :depth - 1\n  RT 55\n  FERN :len * 0.5 :depth - 1\n  LT 25\n  BK :len\nEND\nFERN 80 4'],
};
