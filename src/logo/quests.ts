import { sameDrawing } from './compare.js';
import { check, execute } from './index.js';
import type { Program, Stmt } from './parser.js';

export type Concept = 'moves' | 'loops' | 'functions' | 'variables' | 'decisions' | 'recursion' | 'debugging' | 'colours';
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
  needs?: {
    uses?: Feature[];
    /** At most this many commands (counting REPEAT bodies once), to reward loops. */
    maxCommands?: number;
    minColours?: number;
    drawsSomething?: boolean;
  };
}

export type Feature = 'REPEAT' | 'TO' | 'INPUT' | 'MAKE' | 'IF' | 'RECURSION' | 'CIRCLE';

export const CONCEPTS: Record<Concept, { name: string; badge: string; python: string; color: string }> = {
  moves: { name: 'First steps', badge: 'Explorer', python: 'forward(100)', color: '#12a36b' },
  colours: { name: 'Colours', badge: 'Artist', python: 'pencolor("red")', color: '#ec3f86' },
  loops: { name: 'Loops', badge: 'Loop Master', python: 'for i in range(4):', color: '#7a4cf0' },
  functions: { name: 'Functions', badge: 'Inventor', python: 'def square():', color: '#2b9bf4' },
  variables: { name: 'Inputs and variables', badge: 'Shape Shifter', python: 'size = 50', color: '#f97316' },
  decisions: { name: 'Decisions', badge: 'Decider', python: 'if x > 5:', color: '#0f8fa6' },
  recursion: { name: 'Recursion', badge: 'Spiral Wizard', python: 'spiral(n + 10)', color: '#b4236b' },
  debugging: { name: 'Debugging', badge: 'Bug Hunter', python: 'fix the bug!', color: '#ef5a4c' },
};

export const QUESTS: Quest[] = [
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
  { id: 'c-spiral', audience: 'coder', concept: 'recursion', title: 'Spiral wizard', goal: 'Make a command that uses itself to draw this square spiral, starting at 10 and growing by 10 until it passes 100.', hint: 'TO SPIRAL :n  IF :n > 100 [STOP]  FD :n RT 90  SPIRAL :n + 10  END', target: 'MAKE "n 10 REPEAT 10 [FD :n RT 90 MAKE "n :n + 10]', allowMirror: true, needs: { uses: ['RECURSION'] } },
];

/* ------------------------------------------------------------------ program features */

function walk(stmts: Stmt[], visit: (s: Stmt) => void): void {
  for (const s of stmts) {
    visit(s);
    if (s.kind === 'repeat') walk(s.body, visit);
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

export function features(p: Program): Set<Feature> {
  const f = new Set<Feature>();
  const stmts = allStatements(p);
  if (stmts.some((s) => s.kind === 'repeat')) f.add('REPEAT');
  if (stmts.some((s) => s.kind === 'make')) f.add('MAKE');
  if (stmts.some((s) => s.kind === 'if')) f.add('IF');
  if (stmts.some((s) => s.kind === 'command' && s.name === 'CIRCLE')) f.add('CIRCLE');
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
};

export type QuestResult = { pass: true; message: string } | { pass: false; message: string };

export function checkQuest(quest: Quest, code: string): QuestResult {
  const parsed = check(code);
  if (!parsed.ok) return { pass: false, message: `Fix line ${parsed.problem.line} first: ${parsed.problem.message}` };
  const run = execute(code);
  if (!run.ok) return { pass: false, message: run.problem.message };
  const result = run.result;

  const drewLines = result.events.some((e) => e.type === 'line');
  if (quest.needs?.drawsSomething && !drewLines) return { pass: false, message: "I didn't draw anything yet. Make sure the pen is down!" };

  if (quest.target) {
    const target = execute(quest.target);
    if (!target.ok) throw new Error(`Quest ${quest.id} has an invalid target`);
    if (!sameDrawing(result, target.result, { allowMirror: quest.allowMirror })) {
      return { pass: false, message: drewLines ? "Not quite the same shape yet. Compare your drawing with the faint one and try again!" : "I didn't draw anything yet." };
    }
  }

  const used = features(parsed.program);
  for (const need of quest.needs?.uses ?? []) {
    if (!used.has(need)) return { pass: false, message: `${quest.target ? 'Great drawing! ' : ''}${FEATURE_HINT[need]}` };
  }

  if (quest.needs?.maxCommands !== undefined && commandCount(parsed.program) > quest.needs.maxCommands) {
    return { pass: false, message: `It works! Now can you do it in ${quest.needs.maxCommands} commands or fewer?` };
  }

  if (quest.needs?.minColours) {
    const colours = new Set(result.events.filter((e) => e.type === 'line').map((e) => (e as { color: string }).color));
    if (colours.size < quest.needs.minColours) return { pass: false, message: `Use at least ${quest.needs.minColours} different colours.` };
  }

  return { pass: true, message: `Quest complete: ${quest.title}!` };
}

