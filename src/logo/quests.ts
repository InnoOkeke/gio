import { drawnDots, drawnSegments, sameDrawing } from './compare.js';
import { NEW_QUESTS } from './quest-bank.js';
import { check, DEFAULT_BACKGROUND, press, start, type RunResult, type TurtleState } from './index.js';
import { lookupPrimitive, type GameKey } from './primitives.js';
import type { Expr, Program, Stmt } from './parser.js';
import { CHECK_SEEDS, mulberry32 } from './seeded.js';

export type Concept = 'moves' | 'loops' | 'functions' | 'variables' | 'decisions' | 'recursion' | 'debugging' | 'colours' | 'events';
export type QuestAudience = 'little' | 'coder';

export interface Quest {
  id: string;
  audience: QuestAudience;
  concept: Concept;
  title: string;
  /** What to do, in kid language. */
  goal: string;
  hint: string;
  /** Code to start from (debugging quests start with a bug). */
  starter?: string;
  /** A Logo program that draws the goal. Shown faintly on the stage and used for checking. */
  target?: string;
  allowMirror?: boolean;
  /** For games: keys GIO presses, in order, after the program starts. */
  presses?: GameKey[];
  needs?: {
    uses?: Feature[];
    /** At most this many commands (counting REPEAT bodies once), to reward loops. */
    maxCommands?: number;
    minColours?: number;
    drawsSomething?: boolean;
    /** Primitive names (FD and FORWARD both work) or REPEAT, IF, MAKE, WHEN that the program must use. */
    words?: string[];
    /** Text from the starter that must still be in the code, so a bug is fixed rather than rewritten. */
    keeps?: string[];
    /** At least this many different pen sizes among the lines. */
    minSizes?: number;
    /** The background must not be the default white. */
    background?: boolean;
    /** Procedures the program must teach, with how many inputs each takes. */
    defines?: { name: string; inputs: number }[];
    /** Hidden tests: after the program, `run` is called on a clean screen and must draw what `target` draws on its own. */
    calls?: { run: string; target: string }[];
    /** Compare where the turtle is after the program and after every key press with the target program. */
    trace?: boolean;
    /** What the scoreboard (SHOW) ends up saying, and whether GAMEOVER happens. */
    expect?: { show?: string; gameOver?: boolean };
    /** Rules a random program must follow with every check seed. The target is not compared. */
    props?: QuestProps;
  };
}

export interface QuestProps {
  segments?: {
    count?: [number, number];
    /** Every line is at least the first and at most the second number long. */
    length?: [number, number];
    /** Every line points in a multiple of this many degrees. */
    angleStep?: number;
  };
  dots?: { count: [number, number] };
  /** Every line end and dot is inside this box around the middle. */
  bounds?: { x: number; y: number };
  /** The drawing ends where it began. */
  closed?: boolean;
  endsWithin?: { x: number; y: number; r: number };
  /** The drawing is different for different seeds, which proves RANDOM is used. Default true when words has RANDOM. */
  varies?: boolean;
}

export type Feature = 'REPEAT' | 'TO' | 'INPUT' | 'MAKE' | 'IF' | 'RECURSION' | 'CIRCLE' | 'WHEN' | 'NEST';

export const CONCEPTS: Record<Concept, { name: string; badge: string; python: string; color: string }> = {
  moves: { name: 'First steps', badge: 'Explorer', python: 'forward(100)', color: '#12a36b' },
  colours: { name: 'Colours', badge: 'Artist', python: 'pencolor("red")', color: '#ec3f86' },
  loops: { name: 'Loops', badge: 'Loop Master', python: 'for i in range(4):', color: '#7a4cf0' },
  functions: { name: 'Functions', badge: 'Inventor', python: 'def square():', color: '#2b9bf4' },
  variables: { name: 'Inputs and variables', badge: 'Shape Shifter', python: 'size = 50', color: '#f97316' },
  decisions: { name: 'Decisions', badge: 'Decider', python: 'if x > 5:', color: '#0f8fa6' },
  recursion: { name: 'Recursion', badge: 'Spiral Wizard', python: 'spiral(n + 10)', color: '#b4236b' },
  debugging: { name: 'Debugging', badge: 'Bug Hunter', python: 'fix the bug!', color: '#ef5a4c' },
  events: { name: 'Games and events', badge: 'Game Maker', python: 'onkey(on_up, "Up")', color: '#14b8a6' },
};

const BASE_QUESTS: Quest[] = [
  // ---- Little Turtles (under 8): blocks ----
  { id: 'l-walk', audience: 'little', concept: 'moves', title: 'Go for a walk', goal: 'Make the turtle walk and draw a line.', hint: 'Tap the green Forward block, then press Run.', needs: { drawsSomething: true } },
  { id: 'l-corner', audience: 'little', concept: 'moves', title: 'Turn the corner', goal: 'Draw this corner shape.', hint: 'Forward 100, turn, then Forward 100 again.', target: 'FD 100 RT 90 FD 100', allowMirror: true },
  { id: 'l-square', audience: 'little', concept: 'moves', title: 'Make a box', goal: 'Draw this square box.', hint: 'Forward and turn, four times.', target: 'REPEAT 4 [FD 100 RT 90]', allowMirror: true },
  { id: 'l-repeat-square', audience: 'little', concept: 'loops', title: 'Magic repeat', goal: 'Draw the box again, but use only one Repeat block for the sides.', hint: 'Put Forward and Turn inside a Repeat 4 block.', target: 'REPEAT 4 [FD 100 RT 90]', allowMirror: true, needs: { uses: ['REPEAT'] } },
  { id: 'l-triangle', audience: 'little', concept: 'loops', title: 'Pointy triangle', goal: 'Draw this triangle with a Repeat block.', hint: 'Repeat 3 times: Forward, then turn 120.', target: 'REPEAT 3 [FD 120 RT 120]', allowMirror: true, needs: { uses: ['REPEAT'] } },
  { id: 'l-colours', audience: 'little', concept: 'colours', title: 'Rainbow time', goal: 'Draw something with at least two colours.', hint: 'Use a Colour block, draw, then another Colour block.', needs: { minColours: 2, drawsSomething: true } },
  { id: 'l-circle', audience: 'little', concept: 'moves', title: 'Round and round', goal: 'Draw a circle.', hint: 'There is a Circle block!', needs: { uses: ['CIRCLE'] } },
  { id: 'l-stairs', audience: 'little', concept: 'loops', title: 'Climb the stairs', goal: 'Draw these stairs with a Repeat block.', hint: 'Repeat 4: Forward 30, Right 90, Forward 30, Left 90.', target: 'REPEAT 4 [FD 30 RT 90 FD 30 LT 90]', allowMirror: true, needs: { uses: ['REPEAT'] } },

  // ---- Turtle Coders (8–12): text ----
  { id: 'c-line', audience: 'coder', concept: 'moves', title: 'Hello, turtle', goal: 'Draw a straight line 100 steps long, going up.', hint: 'FD 100', target: 'FD 100' },
  { id: 'c-square', audience: 'coder', concept: 'moves', title: 'Square one', goal: 'Draw a square with sides of 100.', hint: 'FD 100 RT 90, four times.', target: 'REPEAT 4 [FD 100 RT 90]', allowMirror: true },
  { id: 'c-repeat', audience: 'coder', concept: 'loops', title: 'Loop it', goal: 'Draw the same square using REPEAT, in at most 3 commands.', hint: 'REPEAT 4 [FD 100 RT 90]', target: 'REPEAT 4 [FD 100 RT 90]', allowMirror: true, needs: { uses: ['REPEAT'], maxCommands: 3 } },
  { id: 'c-star', audience: 'coder', concept: 'loops', title: 'Superstar', goal: 'Draw a 5-pointed star with sides of 150.', hint: 'The turtle turns 144 degrees at each point. Use REPEAT 5.', target: 'REPEAT 5 [FD 150 RT 144]', allowMirror: true, needs: { uses: ['REPEAT'] } },
  { id: 'c-bug-square', audience: 'coder', concept: 'debugging', title: 'Bug hunt: wonky square', goal: 'This square is broken! Fix the code so it draws a square.', hint: 'A square has four corners. How far must the turtle turn at each one?', starter: '; This should draw a square...\nREPEAT 4 [FD 100 RT 60]', target: 'REPEAT 4 [FD 100 RT 90]', allowMirror: true },
  { id: 'c-function', audience: 'coder', concept: 'functions', title: 'Invent a command', goal: 'Teach the turtle a SQUARE command with TO, then use it to draw squares of 50 and 100.', hint: 'TO SQUARE :size … END, then SQUARE 50 SQUARE 100', target: 'REPEAT 4 [FD 50 RT 90] REPEAT 4 [FD 100 RT 90]', allowMirror: true, needs: { uses: ['TO', 'INPUT'] } },
  { id: 'c-shape', audience: 'coder', concept: 'variables', title: 'Shape shifter', goal: 'Write TO SHAPE :sides and use it to draw a hexagon with sides of 60.', hint: 'Turn 360 / :sides at each corner. Then SHAPE 6.', target: 'REPEAT 6 [FD 60 RT 60]', allowMirror: true, needs: { uses: ['TO', 'INPUT'] } },
  { id: 'c-bug-triangle', audience: 'coder', concept: 'debugging', title: 'Bug hunt: open triangle', goal: "This triangle doesn't close. Fix it!", hint: 'The turns of a triangle add up to 360 degrees.', starter: 'REPEAT 3 [FD 120 RT 100]', target: 'REPEAT 3 [FD 120 RT 120]', allowMirror: true },
  { id: 'c-dashes', audience: 'coder', concept: 'decisions', title: 'Dash it', goal: 'Draw a dashed line: 5 dashes of 10 with gaps of 10. Use IF or IFELSE to choose pen up or pen down.', hint: 'MAKE "on 1, then REPEAT 10 [IFELSE :on = 1 [PD] [PU] FD 10 MAKE "on 1 - :on]', target: 'REPEAT 5 [PD FD 10 PU FD 10]', needs: { uses: ['IF'] } },
  { id: 'c-game', audience: 'coder', concept: 'events', title: 'Make a game', goal: 'Make the up arrow move the turtle forward 20, and the right arrow turn it right 90. I will test it by pressing up, right, up, right, up.', hint: 'WHEN "up [FD 20]  then  WHEN "right [RT 90]', target: 'WHEN "up [FD 20]\nWHEN "right [RT 90]', presses: ['UP', 'RIGHT', 'UP', 'RIGHT', 'UP'], needs: { uses: ['WHEN'] } },
  { id: 'c-sketch', audience: 'coder', concept: 'events', title: 'Etch-a-sketch', goal: 'Make all four arrow keys move the turtle 10 steps in their direction, without the turtle needing to turn first. I will press up, up, right, right, down, left.', hint: 'Use SETHEADING (SETH) before FD: WHEN "right [SETH 90 FD 10]', target: 'WHEN "up [SETH 0 FD 10]\nWHEN "down [SETH 180 FD 10]\nWHEN "left [SETH 270 FD 10]\nWHEN "right [SETH 90 FD 10]', presses: ['UP', 'UP', 'RIGHT', 'RIGHT', 'DOWN', 'LEFT'], needs: { uses: ['WHEN'] } },
  { id: 'c-spiral', audience: 'coder', concept: 'recursion', title: 'Spiral wizard', goal: 'Make a command that uses itself to draw this square spiral, starting at 10 and growing by 10 until it passes 100.', hint: 'TO SPIRAL :n  IF :n > 100 [STOP]  FD :n RT 90  SPIRAL :n + 10  END', target: 'MAKE "n 10 REPEAT 10 [FD :n RT 90 MAKE "n :n + 10]', allowMirror: true, needs: { uses: ['RECURSION'] } },
];

/** Every quest: the 20 original ones first, then the adventure map's 46 new ones. */
export const QUESTS: Quest[] = [...BASE_QUESTS, ...NEW_QUESTS];
/* ------------------------------------------------------------------ program features */

function walk(stmts: Stmt[], visit: (s: Stmt) => void): void {
  for (const s of stmts) {
    visit(s);
    if (s.kind === 'repeat' || s.kind === 'when') walk(s.body, visit);
    if (s.kind === 'if') {
      walk(s.then, visit);
      if (s.otherwise) walk(s.otherwise, visit);
    }
  }
}

function allStatements(p: Program): Stmt[] {
  const out: Stmt[] = [];
  walk(p.main, (s) => out.push(s));
  for (const proc of p.procedures.values()) walk(proc.body, (s) => out.push(s));
  return out;
}

/** True when a REPEAT sits inside another REPEAT (written in the same piece of code). */
function hasNestedRepeat(stmts: Stmt[], inside: boolean): boolean {
  for (const s of stmts) {
    if (s.kind === 'repeat') {
      if (inside || hasNestedRepeat(s.body, true)) return true;
    } else if (s.kind === 'when') {
      if (hasNestedRepeat(s.body, inside)) return true;
    } else if (s.kind === 'if') {
      if (hasNestedRepeat(s.then, inside) || (s.otherwise !== null && hasNestedRepeat(s.otherwise, inside))) return true;
    }
  }
  return false;
}

function exprWords(e: Expr, out: Set<string>): void {
  switch (e.kind) {
    case 'reporter':
      out.add(e.name);
      for (const a of e.args) exprWords(a, out);
      break;
    case 'bin':
      exprWords(e.left, out);
      exprWords(e.right, out);
      break;
    case 'neg':
      exprWords(e.expr, out);
      break;
    case 'list':
      for (const i of e.items) exprWords(i, out);
      break;
    default:
  }
}

/** Every primitive and special word a program uses, in canonical form (FD becomes FORWARD). */
export function wordsUsed(p: Program): Set<string> {
  const out = new Set<string>();
  const visit = (s: Stmt): void => {
    switch (s.kind) {
      case 'command':
        out.add(s.name);
        s.args.forEach((a) => exprWords(a, out));
        break;
      case 'call':
        s.args.forEach((a) => exprWords(a, out));
        break;
      case 'repeat':
        out.add('REPEAT');
        exprWords(s.count, out);
        break;
      case 'if':
        out.add('IF');
        exprWords(s.cond, out);
        break;
      case 'make':
        out.add('MAKE');
        exprWords(s.value, out);
        break;
      case 'when':
        out.add('WHEN');
        break;
      case 'stop':
        out.add('STOP');
        break;
    }
  };
  for (const s of allStatements(p)) visit(s);
  return out;
}

export function features(p: Program): Set<Feature> {
  const f = new Set<Feature>();
  const stmts = allStatements(p);
  if (stmts.some((s) => s.kind === 'repeat')) f.add('REPEAT');
  if (stmts.some((s) => s.kind === 'make')) f.add('MAKE');
  if (stmts.some((s) => s.kind === 'if')) f.add('IF');
  if (stmts.some((s) => s.kind === 'command' && s.name === 'CIRCLE')) f.add('CIRCLE');
  if (stmts.some((s) => s.kind === 'when')) f.add('WHEN');
  if (hasNestedRepeat(p.main, false) || [...p.procedures.values()].some((proc) => hasNestedRepeat(proc.body, false))) f.add('NEST');
  if (p.procedures.size) f.add('TO');
  if ([...p.procedures.values()].some((proc) => proc.params.length)) f.add('INPUT');
  for (const proc of p.procedures.values()) {
    const calls: Stmt[] = [];
    walk(proc.body, (s) => calls.push(s));
    if (calls.some((s) => s.kind === 'call' && s.name === proc.name)) f.add('RECURSION');
  }
  return f;
}

/** Commands written in the program, counting each line of code once (REPEAT bodies are not unrolled). */
export function commandCount(p: Program): number {
  let n = 0;
  walk(p.main, () => n++);
  for (const proc of p.procedures.values()) walk(proc.body, () => n++);
  return n;
}

const FEATURE_HINT: Record<Feature, string> = {
  REPEAT: 'Now try it with REPEAT.',
  TO: 'Now teach the turtle a new command with TO … END.',
  INPUT: 'Give your command an input, like :size.',
  MAKE: 'Try storing a number with MAKE.',
  IF: 'Use IF or IFELSE to make a choice.',
  RECURSION: 'Make your command use itself.',
  CIRCLE: 'Use the Circle command.',
  WHEN: 'Use WHEN so the arrow keys control the turtle.',
  NEST: 'Put one REPEAT inside another REPEAT.',
};

/**
 * Run a program, then press the given keys, and return everything drawn.
 * With a seed, RANDOM gives the same numbers every time. `states` holds where the turtle was after the
 * program and after each key press, so games can be compared step by step.
 */
export function playWithPresses(
  code: string,
  presses: GameKey[] = [],
  options: { seed?: number } = {},
): { ok: true; result: RunResult; states: TurtleState[] } | { ok: false; message: string } {
  const started = start(code, options.seed === undefined ? undefined : { random: mulberry32(options.seed) });
  if (!started.ok) return { ok: false, message: started.problem.message };
  const events = [...started.result.events];
  const states: TurtleState[] = [started.result.final];
  for (const key of presses) {
    const r = press(started.session, key);
    events.push(...r.events);
    if (!r.ok) return { ok: false, message: r.problem.message };
    const lastOfPress = r.events[r.events.length - 1];
    states.push(lastOfPress ? lastOfPress.state : states[states.length - 1]!);
  }
  const last = events[events.length - 1];
  return { ok: true, result: { events, final: last ? last.state : started.result.final, background: started.result.background }, states };
}

export type QuestResult = { pass: true; message: string } | { pass: false; message: string };

export function checkQuest(quest: Quest, code: string): QuestResult {
  const parsed = check(code);
  if (!parsed.ok) return { pass: false, message: `Fix line ${parsed.problem.line} first: ${parsed.problem.message}` };
  const needs = quest.needs;
  const run = playWithPresses(code, quest.presses, { seed: CHECK_SEEDS[0] });
  if (!run.ok) return { pass: false, message: run.message };
  const result = run.result;

  const drewLines = result.events.some((e) => e.type === 'line');
  if (needs?.drawsSomething && !drewLines) return { pass: false, message: "I didn't draw anything yet. Make sure the pen is down!" };

  if (needs?.props) {
    const failed = checkProps(code, quest, needs.props);
    if (failed) return { pass: false, message: failed };
  } else if (quest.target) {
    const target = playWithPresses(quest.target, quest.presses, { seed: CHECK_SEEDS[0] });
    if (!target.ok) throw new Error(`Quest ${quest.id} has an invalid target`);
    if (!sameDrawing(result, target.result, { allowMirror: quest.allowMirror })) {
      return { pass: false, message: drewLines ? "Not quite the same shape yet. Compare your drawing with the faint one and try again!" : "I didn't draw anything yet." };
    }
    if (needs?.trace && !sameTrace(run.states, target.states)) {
      return { pass: false, message: 'The turtle ends up in the wrong place when I press the keys. Check what each key does, in order.' };
    }
  }

  if (needs?.expect) {
    const failed = checkExpect(result, needs.expect);
    if (failed) return { pass: false, message: failed };
  }

  for (const want of needs?.defines ?? []) {
    const proc = parsed.program.procedures.get(want.name.toUpperCase());
    if (!proc) return { pass: false, message: `Teach the turtle a command called ${want.name.toUpperCase()} with TO ... END.` };
    if (proc.params.length !== want.inputs) {
      return { pass: false, message: `${want.name.toUpperCase()} should take ${want.inputs} ${want.inputs === 1 ? 'input' : 'inputs'}, but yours takes ${proc.params.length}.` };
    }
  }

  for (const call of needs?.calls ?? []) {
    const failed = checkCall(code, call);
    if (failed) return { pass: false, message: failed };
  }

  const used = features(parsed.program);
  for (const need of needs?.uses ?? []) {
    if (!used.has(need)) return { pass: false, message: `${quest.target ? 'Great drawing! ' : ''}${FEATURE_HINT[need]}` };
  }

  if (needs?.words?.length) {
    const seen = wordsUsed(parsed.program);
    for (const word of needs.words) {
      const canon = (lookupPrimitive(word)?.name ?? word).toUpperCase();
      if (!seen.has(canon)) return { pass: false, message: `It works! This quest also wants you to use ${canon}.` };
    }
  }

  if (needs?.keeps?.length) {
    const upper = code.toUpperCase();
    for (const token of needs.keeps) {
      if (!upper.includes(token.toUpperCase())) return { pass: false, message: `Fix the bug, but keep ${token} in your code. Do not rewrite it from scratch.` };
    }
  }

  if (needs?.maxCommands !== undefined && commandCount(parsed.program) > needs.maxCommands) {
    return { pass: false, message: `It works! Now can you do it in ${needs.maxCommands} commands or fewer?` };
  }

  if (needs?.minColours) {
    const colours = new Set(result.events.filter((e) => e.type === 'line').map((e) => (e as { color: string }).color));
    if (colours.size < needs.minColours) return { pass: false, message: `Use at least ${needs.minColours} different colours.` };
  }

  if (needs?.minSizes) {
    const sizes = new Set(result.events.filter((e) => e.type === 'line').map((e) => (e as { size: number }).size));
    if (sizes.size < needs.minSizes) return { pass: false, message: `Use at least ${needs.minSizes} different pen sizes.` };
  }

  if (needs?.background && result.background === DEFAULT_BACKGROUND) {
    return { pass: false, message: 'Change the background colour with SETBACKGROUND.' };
  }

  return { pass: true, message: `Quest complete: ${quest.title}!` };
}

/* ------------------------------------------------------------------ checks that need more than one run */

const POINT_TOL = 0.5;
const HEADING_TOL = 1;
const LENGTH_TOL = 0.01;
const ANGLE_STEP_TOL = 0.75;

function sameTrace(a: TurtleState[], b: TurtleState[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => {
    const o = b[i]!;
    const apart = Math.abs((((s.heading - o.heading) % 360) + 540) % 360 - 180);
    return Math.abs(s.x - o.x) <= POINT_TOL && Math.abs(s.y - o.y) <= POINT_TOL && apart <= HEADING_TOL;
  });
}

function lastShow(result: RunResult): string | null {
  let text: string | null = null;
  for (const e of result.events) if (e.type === 'show') text = e.text;
  return text;
}

function checkExpect(result: RunResult, expect: { show?: string; gameOver?: boolean }): string | null {
  if (expect.show !== undefined) {
    const shown = lastShow(result);
    if (shown !== expect.show) {
      return shown === null ? `The scoreboard should end up showing ${expect.show}, but you never used SHOW.` : `The scoreboard should end up showing ${expect.show}, but it shows ${shown}.`;
    }
  }
  if (expect.gameOver !== undefined) {
    const over = result.events.some((e) => e.type === 'gameover');
    if (over !== expect.gameOver) return expect.gameOver ? 'The game should end with GAMEOVER, but it did not.' : 'The game ended too early. GAMEOVER should not happen here.';
  }
  return null;
}

/** Run the player's program, clear the stage, then make one more call. It must draw what the target draws alone. */
function checkCall(code: string, call: { run: string; target: string }): string | null {
  const player = playWithPresses(`${code}\nCS\nPD\n${call.run}`, [], { seed: CHECK_SEEDS[0] });
  if (!player.ok) return `I also tried ${call.run} and it went wrong: ${player.message}`;
  const target = playWithPresses(call.target, [], { seed: CHECK_SEEDS[0] });
  if (!target.ok) throw new Error(`Hidden call ${call.run} has an invalid target`);
  if (!sameDrawing(player.result, target.result)) return `It works for your own numbers, but I also tried ${call.run} and the drawing was different. Does your command use its inputs?`;
  return null;
}

function signature(result: RunResult): string {
  const r = (n: number): number => Math.round(n * 10) / 10;
  const segs = drawnSegments(result).map((s) => `${r(s.x1)},${r(s.y1)},${r(s.x2)},${r(s.y2)}`);
  const dots = drawnDots(result).map((d) => `d${r(d.x)},${r(d.y)}`);
  return [...segs, ...dots].join('|');
}

function checkOneSeed(result: RunResult, props: QuestProps): string | null {
  const segs = drawnSegments(result);
  const dots = drawnDots(result);
  const seg = props.segments;
  if (seg?.count && (segs.length < seg.count[0] || segs.length > seg.count[1])) {
    return seg.count[0] === seg.count[1] ? `I expected ${seg.count[0]} lines, but I saw ${segs.length}.` : `I expected between ${seg.count[0]} and ${seg.count[1]} lines, but I saw ${segs.length}.`;
  }
  if (seg?.length) {
    const [min, max] = seg.length;
    for (const s of segs) {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (len < min - LENGTH_TOL || len > max + LENGTH_TOL) return `Every line should be between ${min} and ${max} steps long, but one was ${Math.round(len)}.`;
    }
  }
  if (seg?.angleStep) {
    const step = seg.angleStep;
    for (const s of segs) {
      const deg = (Math.atan2(s.x2 - s.x1, s.y2 - s.y1) * 180) / Math.PI;
      const rem = ((deg % step) + step) % step;
      if (Math.min(rem, step - rem) > ANGLE_STEP_TOL) return `Every line should point in a multiple of ${step} degrees, but one did not.`;
    }
  }
  if (props.dots && (dots.length < props.dots.count[0] || dots.length > props.dots.count[1])) {
    return props.dots.count[0] === props.dots.count[1] ? `I expected ${props.dots.count[0]} dots, but I saw ${dots.length}.` : `I expected between ${props.dots.count[0]} and ${props.dots.count[1]} dots, but I saw ${dots.length}.`;
  }
  if (props.bounds) {
    const { x, y } = props.bounds;
    const points = [...segs.flatMap((s) => [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]), ...dots];
    if (points.some((p) => Math.abs(p.x) > x + POINT_TOL || Math.abs(p.y) > y + POINT_TOL)) return `Stay inside the box: nothing may go further than ${x} across or ${y} up and down from the middle.`;
  }
  if (props.closed) {
    const first = segs[0];
    const last = segs[segs.length - 1];
    if (!first || !last || Math.hypot(last.x2 - first.x1, last.y2 - first.y1) > POINT_TOL * 3) return 'The shape should close up: finish where you started.';
  }
  if (props.endsWithin) {
    const { x, y, r } = props.endsWithin;
    if (Math.hypot(result.final.x - x, result.final.y - y) > r) return 'The turtle ends up too far from where it should finish.';
  }
  return null;
}

/** Run the program with every check seed and test the rules. Seeds are never shown to the child. */
function checkProps(code: string, quest: Quest, props: QuestProps): string | null {
  const signatures = new Set<string>();
  for (const seed of CHECK_SEEDS) {
    const run = playWithPresses(code, quest.presses, { seed });
    if (!run.ok) return run.message;
    const failed = checkOneSeed(run.result, props);
    if (failed) return failed;
    signatures.add(signature(run.result));
  }
  const mustVary = props.varies ?? (quest.needs?.words ?? []).some((w) => (lookupPrimitive(w)?.name ?? w).toUpperCase() === 'RANDOM');
  if (mustVary && signatures.size < 2) return 'It draws the very same thing every time. Use RANDOM so each run is a surprise.';
  return null;
}

