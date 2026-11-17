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
  { name: 'HIDETURTLE', aliases: ['HT'], arity: 0, kind: 'command', help: 'Hide the turtle' },
  { name: 'SHOWTURTLE', aliases: ['ST'], arity: 0, kind: 'command', help: 'Show the turtle' },
  { name: 'PRINT', aliases: ['PR'], arity: 1, kind: 'command', help: 'Show a message or number' },
  { name: 'RANDOM', aliases: [], arity: 1, kind: 'reporter', help: 'A random whole number from 0 up to (not including) the number you give' },
  { name: 'REPCOUNT', aliases: [], arity: 0, kind: 'reporter', help: 'Which time round the current REPEAT is on, starting at 1' },
  { name: 'SQRT', aliases: [], arity: 1, kind: 'reporter', help: 'Square root of a number' },
  { name: 'SIN', aliases: [], arity: 1, kind: 'reporter', help: 'Sine of an angle in degrees' },
  { name: 'COS', aliases: [], arity: 1, kind: 'reporter', help: 'Cosine of an angle in degrees' },
  { name: 'HEADING', aliases: [], arity: 0, kind: 'reporter', help: 'Which way the turtle is facing' },
  { name: 'XCOR', aliases: [], arity: 0, kind: 'reporter', help: 'The turtle\'s x position' },
  { name: 'YCOR', aliases: [], arity: 0, kind: 'reporter', help: 'The turtle\'s y position' },
];

/** Keywords handled by the parser itself rather than the primitive table. */
export const SPECIAL_FORMS = ['TO', 'END', 'REPEAT', 'IF', 'IFELSE', 'MAKE', 'STOP', 'WHEN'] as const;

/** Keys a game can react to with WHEN. */
export const GAME_KEYS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'] as const;
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
