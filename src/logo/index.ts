import { LogoError } from './errors.js';
import { LogoRunError, run, runSession, type GameSession, type RunOptions, type RunResult, type TurtleEvent } from './interpreter.js';
import type { GameKey } from './primitives.js';
import { parse, type Program } from './parser.js';

export { LogoError } from './errors.js';
export { parse } from './parser.js';
export type { Program, Procedure, Stmt, Expr } from './parser.js';
export { run, formatValue, INITIAL_STATE, DEFAULT_BACKGROUND, DEFAULT_LIMITS } from './interpreter.js';
export type { TurtleEvent, TurtleState, RunResult, RunOptions, RunLimits, Value, GameSession } from './interpreter.js';
export { PRIMITIVES, lookupPrimitive, GAME_KEYS } from './primitives.js';
export type { PrimitiveSpec, GameKey } from './primitives.js';
export { NAMED_COLORS, PALETTE_16 } from './colors.js';
export { translate, toText } from './translate.js';
export { toBlocks, blocksToLogo, BLOCK_COLORS, BLOCK_COMMANDS_HELP } from './blocks.js';
export type { Block, BlockKind, ToBlocksResult } from './blocks.js';
export type { TargetLanguage, Translation, TranslatedLine } from './translate.js';

export interface LogoProblem {
  message: string;
  line: number;
  column: number;
}

export type CheckResult = { ok: true; program: Program } | { ok: false; problem: LogoProblem };
export type ExecuteResult = { ok: true; result: RunResult } | { ok: false; problem: LogoProblem; partial?: RunResult };

function toProblem(err: unknown): LogoProblem {
  if (err instanceof LogoError) return { message: err.message, line: err.line, column: err.column };
  throw err;
}

/** Parse only. Used by the server to confirm AI output is valid Logo. */
export function check(source: string): CheckResult {
  try {
    return { ok: true, program: parse(source) };
  } catch (err) {
    return { ok: false, problem: toProblem(err) };
  }
}

export type StartResult =
  | { ok: true; result: RunResult; session: GameSession }
  | { ok: false; problem: LogoProblem; partial?: RunResult };

/** Like execute(), but keeps the program alive so WHEN handlers can run on key presses. */
export function start(source: string, options?: RunOptions): StartResult {
  const checked = check(source);
  if (!checked.ok) return checked;
  try {
    const { result, session } = runSession(checked.program, options);
    return { ok: true, result, session };
  } catch (err) {
    if (err instanceof LogoRunError) return { ok: false, problem: toProblem(err), partial: err.partial };
    return { ok: false, problem: toProblem(err) };
  }
}

export type PressResult = { ok: true; events: TurtleEvent[] } | { ok: false; problem: LogoProblem; events: TurtleEvent[] };

export function press(session: GameSession, key: GameKey): PressResult {
  try {
    return { ok: true, events: session.press(key) };
  } catch (err) {
    if (err instanceof LogoRunError) return { ok: false, problem: toProblem(err), events: err.partial.events };
    return { ok: false, problem: toProblem(err), events: [] };
  }
}

/** Parse and run. Only LogoErrors become problems; anything else is a real bug and is rethrown. */
export function execute(source: string, options?: RunOptions): ExecuteResult {
  const checked = check(source);
  if (!checked.ok) return checked;
  try {
    return { ok: true, result: run(checked.program, options) };
  } catch (err) {
    if (err instanceof LogoRunError) return { ok: false, problem: toProblem(err), partial: err.partial };
    return { ok: false, problem: toProblem(err) };
  }
}
