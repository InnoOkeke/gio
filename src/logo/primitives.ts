export type PrimitiveKind = 'command' | 'reporter';

export interface PrimitiveSpec {
  /** Canonical upper-case name. */
  name: string;
  aliases: string[];
  arity: number;
  kind: PrimitiveKind;
  /** One-line, kid-friendly description used in help and by the AI prompt. */
  help: string;
}

const SPECS: PrimitiveSpec[] = [
  { name: 'FORWARD', aliases: ['FD'], arity: 1, kind: 'command', help: 'Move forward by a number of steps' },
  { name: 'BACK', aliases: ['BK'], arity: 1, kind: 'command', help: 'Move backward by a number of steps' },
  { name: 'RIGHT', aliases: ['RT'], arity: 1, kind: 'command', help: 'Turn right by a number of degrees' },
  { name: 'LEFT', aliases: ['LT'], arity: 1, kind: 'command', help: 'Turn left by a number of degrees' },
  { name: 'PENUP', aliases: ['PU'], arity: 0, kind: 'command', help: 'Lift the pen so moving does not draw' },
  { name: 'PENDOWN', aliases: ['PD'], arity: 0, kind: 'command', help: 'Put the pen down so moving draws' },
  { name: 'HOME', aliases: [], arity: 0, kind: 'command', help: 'Go back to the middle, facing up' },
  { name: 'CLEARSCREEN', aliases: ['CS'], arity: 0, kind: 'command', help: 'Erase the drawing and go home' },
  { name: 'CLEAN', aliases: [], arity: 0, kind: 'command', help: 'Erase the drawing but stay where you are' },
  { name: 'SETPENCOLOR', aliases: ['SETPC', 'SETCOLOR'], arity: 1, kind: 'command', help: 'Choose the pen colour, like SETPENCOLOR "red' },
  { name: 'SETPENSIZE', aliases: ['SETWIDTH'], arity: 1, kind: 'command', help: 'Choose how thick the pen is' },
  { name: 'SETBACKGROUND', aliases: ['SETBG'], arity: 1, kind: 'command', help: 'Choose the background colour' },
  { name: 'SETHEADING', aliases: ['SETH'], arity: 1, kind: 'command', help: 'Face a direction: 0 is up, 90 is right' },
  { name: 'SETXY', aliases: [], arity: 2, kind: 'command', help: 'Jump to a spot: SETXY x y' },
  { name: 'SETX', aliases: [], arity: 1, kind: 'command', help: 'Jump sideways to an x position' },
  { name: 'SETY', aliases: [], arity: 1, kind: 'command', help: 'Jump up or down to a y position' },
  { name: 'ARC', aliases: [], arity: 2, kind: 'command', help: 'Draw part of a circle around the turtle: ARC angle radius' },
  { name: 'CIRCLE', aliases: [], arity: 1, kind: 'command', help: 'Draw a circle around the turtle: CIRCLE radius' },
  { name: 'FILL', aliases: [], arity: 0, kind: 'command', help: 'Colour in the closed shape the turtle is inside, using the pen colour' },
  { name: 'HIDETURTLE', aliases: ['HT'], arity: 0, kind: 'command', help: 'Hide the turtle' },
  { name: 'SHOWTURTLE', aliases: ['ST'], arity: 0, kind: 'command', help: 'Show the turtle' },
  { name: 'PRINT', aliases: ['PR'], arity: 1, kind: 'command', help: 'Show a message or number' },
  { name: 'DOT', aliases: [], arity: 2, kind: 'command', help: 'Draw a filled dot at a spot without moving the turtle: DOT x y (bigger with SETPENSIZE)' },
  { name: 'SHOW', aliases: [], arity: 1, kind: 'command', help: 'Show a big message on the stage, like a scoreboard: SHOW :score' },
  { name: 'GAMEOVER', aliases: [], arity: 0, kind: 'command', help: 'End the game: the keys and the tick stop' },
  { name: 'PLAY', aliases: [], arity: 1, kind: 'command', help: 'Play notes: PLAY [C D E]. A number after a note is how many beats it lasts, like PLAY [C 2 R E]. R is a rest' },
  { name: 'SETTEMPO', aliases: [], arity: 1, kind: 'command', help: 'How fast the music goes, in beats a minute from 20 to 300 (normal is 120)' },
  { name: 'WAIT', aliases: [], arity: 1, kind: 'command', help: 'Pause for a number of sixtieths of a second: WAIT 60 pauses one second' },
  { name: 'FRAME', aliases: [], arity: 0, kind: 'command', help: 'Show the picture so far and hold it for a moment, to make flip-book animations' },
  { name: 'RANDOM', aliases: [], arity: 1, kind: 'reporter', help: 'A random whole number from 0 up to (not including) the number you give' },
  { name: 'REPCOUNT', aliases: [], arity: 0, kind: 'reporter', help: 'Which time round the current REPEAT is on, starting at 1' },
  { name: 'SQRT', aliases: [], arity: 1, kind: 'reporter', help: 'Square root of a number' },
  { name: 'SIN', aliases: [], arity: 1, kind: 'reporter', help: 'Sine of an angle in degrees' },
  { name: 'COS', aliases: [], arity: 1, kind: 'reporter', help: 'Cosine of an angle in degrees' },
  { name: 'HEADING', aliases: [], arity: 0, kind: 'reporter', help: 'Which way the turtle is facing' },
  { name: 'XCOR', aliases: [], arity: 0, kind: 'reporter', help: 'The turtle\'s x position' },
  { name: 'YCOR', aliases: [], arity: 0, kind: 'reporter', help: 'The turtle\'s y position' },
  { name: 'DISTANCE', aliases: [], arity: 2, kind: 'reporter', help: 'How far the turtle is from a spot: DISTANCE x y' },
  { name: 'SENTENCE', aliases: ['SE'], arity: 2, kind: 'reporter', help: 'Join two things into a message: SHOW SENTENCE "Score: :score' },
];

/** Keywords handled by the parser itself rather than the primitive table. */
export const SPECIAL_FORMS = ['TO', 'END', 'REPEAT', 'IF', 'IFELSE', 'MAKE', 'STOP', 'WHEN'] as const;

/** Keys a game can react to with WHEN. */
export const GAME_KEYS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'TICK'] as const;

/** How often WHEN "tick runs while a game is on. */
export const TICK_MS = 100;
export type GameKey = (typeof GAME_KEYS)[number];

const byName = new Map<string, PrimitiveSpec>();
for (const spec of SPECS) {
  byName.set(spec.name, spec);
  for (const alias of spec.aliases) byName.set(alias, spec);
}

export function lookupPrimitive(name: string): PrimitiveSpec | undefined {
  return byName.get(name.toUpperCase());
}

export function allPrimitiveNames(): string[] {
  return [...byName.keys(), ...SPECIAL_FORMS];
}

export const PRIMITIVES: readonly PrimitiveSpec[] = SPECS;
