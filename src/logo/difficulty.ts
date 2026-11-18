import { check } from './index.js';
import type { Program, Stmt } from './parser.js';
import { wordsUsed } from './quests.js';

/** Extra weight for what a quest checks besides the code itself. */
export interface ComplexityExtras {
  /** How many TICK presses the quest plays. One point per 10 ticks. */
  ticks?: number;
  /** Hidden procedure calls the quest tests. Two points each. */
  hiddenCalls?: number;
  /** Property checks (random rules, bounds and so on). Three points each. */
  propChecks?: number;
}

/** Which family each primitive belongs to. Using more families means more ideas in one program. */
const FAMILY: Record<string, string> = {
  FORWARD: 'move',
  BACK: 'move',
  RIGHT: 'turn',
  LEFT: 'turn',
  SETHEADING: 'turn',
  HOME: 'place',
  SETXY: 'place',
  SETX: 'place',
  SETY: 'place',
  PENUP: 'pen',
  PENDOWN: 'pen',
  SETPENSIZE: 'pen',
  CLEARSCREEN: 'pen',
  CLEAN: 'pen',
  SETPENCOLOR: 'colour',
  SETBACKGROUND: 'colour',
  CIRCLE: 'curve',
  ARC: 'curve',
  DOT: 'dot',
  PRINT: 'message',
  SHOW: 'message',
  SENTENCE: 'message',
  GAMEOVER: 'game',
  RANDOM: 'chance',
  REPCOUNT: 'count',
  SQRT: 'maths',
  SIN: 'maths',
  COS: 'maths',
  HEADING: 'sense',
  XCOR: 'sense',
  YCOR: 'sense',
  DISTANCE: 'sense',
  HIDETURTLE: 'look',
  SHOWTURTLE: 'look',
  REPEAT: 'loop',
  IF: 'choice',
  MAKE: 'variable',
  WHEN: 'event',
};

function walkDepth(stmts: Stmt[], depth: number, tally: { statements: number; deepest: number; makeIf: number; handlers: number }): void {
  for (const s of stmts) {
    tally.statements++;
    if (s.kind === 'make' || s.kind === 'if') tally.makeIf++;
    if (s.kind === 'when') tally.handlers++;
    const inner = s.kind === 'repeat' || s.kind === 'if' || s.kind === 'when' ? depth + 1 : depth;
    if (inner > tally.deepest) tally.deepest = inner;
    if (s.kind === 'repeat' || s.kind === 'when') walkDepth(s.body, inner, tally);
    if (s.kind === 'if') {
      walkDepth(s.then, inner, tally);
      if (s.otherwise) walkDepth(s.otherwise, inner, tally);
    }
  }
}

function isRecursive(p: Program): boolean {
  const calls = (stmts: Stmt[], name: string): boolean =>
    stmts.some((s) => {
      if (s.kind === 'call' && s.name === name) return true;
      if (s.kind === 'repeat' || s.kind === 'when') return calls(s.body, name);
      if (s.kind === 'if') return calls(s.then, name) || (s.otherwise !== null && calls(s.otherwise, name));
      return false;
    });
  return [...p.procedures.values()].some((proc) => calls(proc.body, proc.name));
}

/**
 * A deterministic score for how much a program asks of a child: statements, nesting, procedures and their
 * inputs, recursion, event handlers, variables and decisions, and how many different families of command it
 * mixes. A program that does not parse scores 0.
 */
export function complexity(code: string, extras: ComplexityExtras = {}): number {
  const parsed = check(code);
  if (!parsed.ok) return 0;
  const p = parsed.program;
  const tally = { statements: 0, deepest: 0, makeIf: 0, handlers: 0 };
  walkDepth(p.main, 0, tally);
  for (const proc of p.procedures.values()) walkDepth(proc.body, 0, tally);

  const procedures = p.procedures.size;
  const inputs = [...p.procedures.values()].reduce((n, proc) => n + proc.params.length, 0);
  const families = new Set<string>();
  for (const w of wordsUsed(p)) {
    const f = FAMILY[w];
    if (f) families.add(f);
  }

  return (
    tally.statements +
    2 * tally.deepest +
    3 * procedures +
    3 * inputs +
    (isRecursive(p) ? 4 : 0) +
    3 * tally.handlers +
    2 * tally.makeIf +
    2 * families.size +
    Math.floor((extras.ticks ?? 0) / 10) +
    2 * (extras.hiddenCalls ?? 0) +
    3 * (extras.propChecks ?? 0)
  );
}
