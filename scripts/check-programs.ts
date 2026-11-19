/**
 * The Logo programs that scripts check against real Python (and later against GIO's in-browser Python).
 * PRESSES lists the keys pressed (in order) after the main program, for programs that are games.
 */
import type { GameKey } from '../src/logo/index.js';

export const PROGRAMS: Record<string, string> = {
  square: 'REPEAT 4 [FD 100 RT 90]',
  star: 'REPEAT 5 [FD 150 RT 144]',
  spiral: 'TO SPIRAL :n\n IF :n > 120 [STOP]\n FD :n RT 91\n SPIRAL :n + 7\nEND\nSPIRAL 5',
  flower: '; Rainbow Flower\nSETPENSIZE 4\nREPEAT 12 [\n  SETPENCOLOR REPCOUNT\n  REPEAT 2 [ARC 60 120 RT 120]\n  RT 30\n]\nSETPENCOLOR "yellow\nCIRCLE 18',
  arc: 'RT 30 ARC 90 100',
  setxy: 'PU SETXY -100 -50 PD SETXY 40 80 SETHEADING 135 FD 30',
  globals: 'MAKE "size 20\nTO GROW\n MAKE "size :size * 2\nEND\nREPEAT 4 [GROW FD :size LT 45]',
  ifelse: 'MAKE "x 3\nREPEAT 6 [IFELSE REPCOUNT > :x [RT 60] [LT 30] FD 40]',
  maths: 'FD 100 - (20 - 5) RT (2 + 3) * 4 FD 10 * SIN 30 BK SQRT 16',
  clearscreen: 'FD 50 RT 90 FD 50 CS FD 25',
  home: 'RT 45 FD 70 HOME FD 10',
  penup: 'PU FD 50 RT 90 FD 20 PD CIRCLE 10 HT',
  game: 'MAKE "step 10\nWHEN "up [FD :step MAKE "step :step + 5]\nWHEN "right [RT 90]\nWHEN "left [LT 45]\nWHEN "space [CIRCLE 15]',
  catch: 'MAKE "score 0\nMAKE "ay 50\nSETPENCOLOR "red\nDOT 0 :ay\nSHOW :score\nWHEN "up [FD 10]\nWHEN "tick [\n  IF DISTANCE 0 :ay < 15 [\n    MAKE "score :score + 1\n    SHOW :score\n    IF :score = 2 [SHOW [You win!] GAMEOVER]\n    MAKE "ay :ay + 50\n    DOT 0 :ay\n  ]\n]',
  sketch: 'WHEN "up [SETH 0 FD 10]\nWHEN "down [SETH 180 FD 10]\nWHEN "left [SETH 270 FD 10]\nWHEN "right [SETH 90 FD 10]',
  tune: 'SETTEMPO 90\nPLAY [C D E 2 R F# G4 0.5 Bb3]',
  loop: 'REPEAT 4 [PLAY [C E] FD 20 RT 90]',
  flipbook: 'REPEAT 5 [CLEAN FD 10 * REPCOUNT FRAME RT 20]',
  pause: 'FD 10 WAIT 30 FD 10',
};

/** Keys pressed (in order) for programs that are games. Python calls the same handler functions. */
export const PRESSES: Record<string, GameKey[]> = {
  game: ['UP', 'RIGHT', 'UP', 'SPACE', 'LEFT', 'UP', 'UP'],
  sketch: ['UP', 'UP', 'RIGHT', 'RIGHT', 'DOWN', 'LEFT'],
  catch: ['UP', 'UP', 'UP', 'UP', 'UP', 'TICK', 'UP', 'UP', 'UP', 'UP', 'UP', 'TICK', 'UP'],
};
