import { LogoError, suggest } from '../errors.js';
import type { CheckResult, LogoProblem } from '../index.js';
import type { RunLimits } from '../interpreter.js';
import { run } from '../interpreter.js';
import { parse, type Expr, type Program, type Stmt } from '../parser.js';
import { commandCount } from '../quests.js';
import { allMaps, type AgeModeId, type Level } from './level.js';
import { AdventureWorld, type AdvEvent, type LoseReason } from './world.js';
import { ADVENTURE_LOOKUP, AHEAD_WORDS, HERE_WORDS } from './words.js';

export type OutcomeStatus = 'won' | 'lost' | 'unfinished' | 'error';

export interface LevelOutcome {
  status: OutcomeStatus;
  reason: LoseReason | null;
  /** One kid-friendly sentence. */
  message: string;
  /** Where it happened, when it happened on a line. */
  line: number | null;
  beats: number;
  /** Gems and friends add up over every map the level has. */
  gems: number;
  gemsTotal: number;
  friendsFreed: number;
  /** commandCount(program) of the plan. */
  commands: number;
  stars: 0 | 1 | 2 | 3;
  /** What happened on the main map, for the renderer. */
  trace: AdvEvent[];
  /** One outcome per extra map when the level has variants. */
  variants: LevelOutcome[];
}

/** Limits for a plan: Gio gets tired long before these, they only stop a runaway program. */
export const ADVENTURE_LIMITS: Partial<RunLimits> = { maxOps: 20_000, maxEvents: 5_000 };

function allowedWords(level: Level, mode: AgeModeId): ReadonlySet<string> {
  return new Set(level.allow[mode]);
}

function problemOf(err: LogoError): LogoProblem {
  return { message: err.message, line: err.line, column: err.column };
}

const isSense = (e: Expr, name: string): boolean => e.kind === 'reporter' && e.name === name;

/** AHEAD = "rok: say what the real words are, with a "Did you mean" when it is a typo. */
function checkSensing(expr: Expr): void {
  switch (expr.kind) {
    case 'bin': {
      if (expr.op === '=' || expr.op === '<>') {
        for (const [sense, other, words] of [
          ['AHEAD', expr.right, AHEAD_WORDS],
          ['HERE', expr.right, HERE_WORDS],
          ['AHEAD', expr.left, AHEAD_WORDS],
          ['HERE', expr.left, HERE_WORDS],
        ] as const) {
          const mine = other === expr.right ? expr.left : expr.right;
          if (!isSense(mine, sense) || other.kind !== 'word') continue;
          const word = other.value.toLowerCase();
          if ((words as readonly string[]).includes(word)) continue;
          const hint = suggest(word, words);
          throw new LogoError(
            `${sense} can see ${words.join(', ')}. ${hint ? `Did you mean "${hint}?` : `"${word} isn't one of them.`}`,
            other.pos,
          );
        }
      }
      checkSensing(expr.left);
      checkSensing(expr.right);
      return;
    }
    case 'neg':
      checkSensing(expr.expr);
      return;
    case 'list':
      expr.items.forEach(checkSensing);
      return;
    case 'reporter':
      expr.args.forEach(checkSensing);
      return;
    default:
  }
}

function checkStatements(stmts: Stmt[]): void {
  for (const s of stmts) {
    switch (s.kind) {
      case 'command':
      case 'call':
        s.args.forEach(checkSensing);
        break;
      case 'repeat':
        checkSensing(s.count);
        checkStatements(s.body);
        break;
      case 'if':
        checkSensing(s.cond);
        checkStatements(s.then);
        if (s.otherwise) checkStatements(s.otherwise);
        break;
      case 'make':
        checkSensing(s.value);
        break;
      case 'when':
        checkStatements(s.body);
        break;
      default:
    }
  }
}

/** Parse only, with the adventure words and the level's allowed words. */
export function checkAdventure(level: Level, mode: AgeModeId, code: string): CheckResult {
  try {
    const program = parse(code, { words: ADVENTURE_LOOKUP, allow: allowedWords(level, mode) });
    checkStatements(program.main);
    for (const proc of program.procedures.values()) checkStatements(proc.body);
    return { ok: true, program };
  } catch (err) {
    if (err instanceof LogoError) return { ok: false, problem: problemOf(err) };
    throw err;
  }
}

function runMap(level: Level, program: Program, map: string[]): LevelOutcome {
  const world = new AdventureWorld(level, map);
  let problem: LogoProblem | null = null;
  try {
    run(program, { world, limits: ADVENTURE_LIMITS });
  } catch (err) {
    if (!(err instanceof LogoError)) throw err;
    problem = problemOf(err);
  }
  const hasGoal = map.some((row) => row.includes('G'));
  const base = { beats: world.beat, gems: world.gems, gemsTotal: world.gemsTotal, friendsFreed: world.friendsFreed, commands: 0, trace: world.trace, variants: [] };
  if (world.status === 'won') {
    return { ...base, status: 'won', reason: null, message: 'You did it!', line: null, stars: 1 };
  }
  if (world.status === 'lost') {
    return { ...base, status: 'lost', reason: world.reason, message: world.message, line: world.failLine, stars: 0 };
  }
  if (problem) return { ...base, status: 'error', reason: null, message: problem.message, line: problem.line, stars: 0 };
  return {
    ...base,
    status: 'unfinished',
    reason: null,
    message: hasGoal ? 'Gio stopped before the flag.' : 'Gio stopped before the friend was free.',
    line: null,
    stars: 0,
  };
}

/**
 * Run a plan on the level's map and on every variant. A pure function of (level, mode, code).
 * Stars: 1 for winning every map, 2 for also every gem on every map, 3 for also at most `par` commands.
 */
export function playLevel(level: Level, mode: AgeModeId, code: string): LevelOutcome {
  const checked = checkAdventure(level, mode, code);
  if (!checked.ok) {
    const { message, line } = checked.problem;
    return { status: 'error', reason: null, message, line, beats: 0, gems: 0, gemsTotal: 0, friendsFreed: 0, commands: 0, stars: 0, trace: [], variants: [] };
  }
  const program = checked.program;
  const commands = commandCount(program);
  const outcomes = allMaps(level).map((map) => runMap(level, program, map));
  const main = outcomes[0]!;
  const failed = outcomes.find((o) => o.status !== 'won');
  const everyGem = outcomes.every((o) => o.gems === o.gemsTotal);
  const par = level.par[mode];
  let stars: 0 | 1 | 2 | 3 = 0;
  if (!failed) stars = everyGem ? (par !== undefined && commands <= par ? 3 : 2) : 1;
  const where = failed && failed !== main ? 'On another map: ' : '';
  return {
    ...(failed ?? main),
    message: failed ? `${where}${failed.message}` : main.message,
    gems: outcomes.reduce((n, o) => n + o.gems, 0),
    gemsTotal: outcomes.reduce((n, o) => n + o.gemsTotal, 0),
    friendsFreed: outcomes.reduce((n, o) => n + o.friendsFreed, 0),
    beats: main.beats,
    commands,
    stars,
    trace: main.trace,
    variants: outcomes.slice(1),
  };
}
