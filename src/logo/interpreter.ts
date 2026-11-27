import { NAMED_COLORS, PALETTE_16, rgbToHex } from './colors.js';
import { LogoError, logoError, suggest, type SourcePos } from './errors.js';
import type { Expr, Procedure, Program, Stmt } from './parser.js';
import { parseTune } from './music.js';
import { computeFill, type FillRect, type Segment } from './fill.js';
import type { GameKey } from './primitives.js';

export type Value = number | string | boolean | Value[];

export interface TurtleState {
  x: number;
  y: number;
  /** Degrees, 0 = up, increasing clockwise (classic Logo). */
  heading: number;
  penDown: boolean;
  color: string;
  size: number;
  visible: boolean;
}

interface EventBase {
  /** Source line that produced this event, for highlighting while the turtle draws. */
  line: number;
  /** Turtle state after the event. */
  state: TurtleState;
}

export type TurtleEvent =
  | (EventBase & { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; size: number })
  | (EventBase & { type: 'move' })
  | (EventBase & { type: 'turn' })
  | (EventBase & { type: 'pen' })
  | (EventBase & { type: 'style' })
  | (EventBase & { type: 'visibility' })
  | (EventBase & { type: 'clear' })
  | (EventBase & { type: 'background'; color: string })
  | (EventBase & { type: 'print'; text: string })
  | (EventBase & { type: 'dot'; x: number; y: number; r: number; color: string })
  /** FILL: the rectangles together colour in one closed shape. They are painted under the lines. */
  | (EventBase & { type: 'fill'; color: string; rects: FillRect[] })
  | (EventBase & { type: 'show'; text: string })
  | (EventBase & { type: 'gameover' })
  /** Notes to play one after another. hz: null is a rest. Tempo is already worked into seconds. */
  | (EventBase & { type: 'play'; tones: { hz: number | null; seconds: number }[] })
  | (EventBase & { type: 'wait'; seconds: number })
  | (EventBase & { type: 'frame' });

export interface RunLimits {
  /** Statements and loop rounds executed before GIO stops a runaway program. */
  maxOps: number;
  /** Drawing events recorded before GIO stops. */
  maxEvents: number;
  /** How deep procedures may call each other (recursion). */
  maxDepth: number;
  /** Seconds of music and waiting one run may add up to. */
  maxSeconds: number;
}

export const DEFAULT_LIMITS: RunLimits = { maxOps: 200_000, maxEvents: 20_000, maxDepth: 200, maxSeconds: 180 };

/** A turtle pose in turtle units. Heading is degrees, 0 = up, clockwise. */
export interface WorldPose {
  x: number;
  y: number;
  heading: number;
}

/**
 * A world that decides what the turtle's moves mean (Gio's Adventure). Without one, nothing changes:
 * the interpreter draws on a free canvas exactly as before.
 */
export interface WorldHost {
  /** Where the turtle starts. */
  pose(): WorldPose;
  /** FORWARD, BACK, RIGHT, LEFT and the adventure commands. Returns the new pose. Throws a LogoError for a bad input or a lost attempt. */
  command(name: string, arg: number | null, line: number): WorldPose;
  /** An adventure reporter such as AHEAD, or undefined when the world does not know the name. */
  reporter(name: string): Value | undefined;
  /** True once the level is won. The interpreter then stops cleanly. */
  readonly finished: boolean;
}

export interface RunOptions {
  limits?: Partial<RunLimits>;
  /** Run inside a world instead of on the free canvas. */
  world?: WorldHost;
  /** Returns a number in [0, 1). Injected so tests can be deterministic. */
  random?: () => number;
}

export interface RunResult {
  events: TurtleEvent[];
  final: TurtleState;
  background: string;
}

export const INITIAL_STATE: TurtleState = {
  x: 0,
  y: 0,
  heading: 0,
  penDown: true,
  color: NAMED_COLORS['BLACK']!,
  size: 2,
  visible: true,
};

export const DEFAULT_BACKGROUND = '#ffffff';

class StopSignal {}

/** GAMEOVER ends the whole game, even from inside a procedure. */
class GameOverSignal {}

/** The world says the level is won, so the plan stops at once, even from inside a procedure. */
class LevelEndSignal {}

/** A LogoError raised while running, carrying everything drawn before the problem. */
export class LogoRunError extends LogoError {
  readonly partial: RunResult;

  constructor(cause: LogoError, partial: RunResult) {
    super(cause.message, { line: cause.line, column: cause.column });
    this.partial = partial;
  }
}

const round = (n: number): number => {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
};

const normalizeHeading = (h: number): number => round(((h % 360) + 360) % 360);

export function formatValue(value: Value): string {
  if (typeof value === 'number') return String(round(value));
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return value.map((v) => (Array.isArray(v) ? `[${formatValue(v)}]` : formatValue(v))).join(' ');
  return value;
}

class Interpreter {
  private state: TurtleState = { ...INITIAL_STATE };
  private background = DEFAULT_BACKGROUND;
  private events: TurtleEvent[] = [];
  /** What the pen has drawn since the last clear, for FILL to find the closed shape. */
  private segments: Segment[] = [];
  private readonly handlers = new Map<GameKey, Stmt[]>();
  private gameOver = false;
  private readonly globals = new Map<string, Value>();
  private readonly frames: Map<string, Value>[] = [];
  private readonly repcounts: number[] = [];
  private ops = 0;
  private seconds = 0;
  private tempo = 120;
  private readonly limits: RunLimits;
  private readonly random: () => number;
  private readonly world: WorldHost | undefined;

  constructor(
    private readonly program: Program,
    options: RunOptions,
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.random = options.random ?? Math.random;
    this.world = options.world;
    if (this.world) this.state = { ...this.state, ...this.world.pose() };
  }

  run(): RunResult {
    try {
      this.execBlock(this.program.main);
    } catch (err) {
      if (err instanceof LogoError) throw new LogoRunError(err, this.result());
      if (!(err instanceof StopSignal) && !(err instanceof GameOverSignal) && !(err instanceof LevelEndSignal)) throw err;
    }
    return this.result();
  }

  private result(): RunResult {
    return { events: [...this.events], final: { ...this.state }, background: this.background };
  }

  /** Keys the program reacts to (registered with WHEN while the main program ran). */
  keys(): GameKey[] {
    return [...this.handlers.keys()].filter((k) => k !== 'TICK');
  }

  hasTick(): boolean {
    return this.handlers.has('TICK');
  }

  isOver(): boolean {
    return this.gameOver;
  }

  /** Run the WHEN handler for a key, continuing from where the turtle is. Returns only the new events. */
  press(key: GameKey): TurtleEvent[] {
    const body = this.handlers.get(key);
    if (!body || this.gameOver) return [];
    this.events = [];
    this.ops = 0;
    this.seconds = 0;
    try {
      this.execBlock(body);
    } catch (err) {
      if (err instanceof LogoError) throw new LogoRunError(err, this.result());
      if (!(err instanceof StopSignal) && !(err instanceof GameOverSignal) && !(err instanceof LevelEndSignal)) throw err;
    }
    return [...this.events];
  }

  private tick(pos: SourcePos): void {
    if (++this.ops > this.limits.maxOps) {
      throw logoError('run.ops', { n: this.limits.maxOps.toLocaleString('en-US') }, pos);
    }
  }

  /** Add music and waiting time to the running total, and stop a show that goes on too long. */
  private addSeconds(seconds: number, pos: SourcePos): void {
    this.seconds += seconds;
    if (this.seconds > this.limits.maxSeconds + 1e-9) {
      const max = this.limits.maxSeconds;
      const key = max % 60 !== 0 ? 'run.showSeconds' : max === 60 ? 'run.showMinute' : 'run.showMinutes';
      throw logoError(key, { n: max % 60 === 0 ? max / 60 : max }, pos);
    }
  }

  private emit(event: TurtleEvent): void {
    if (this.events.length >= this.limits.maxEvents) {
      throw logoError('run.events', { n: this.limits.maxEvents.toLocaleString('en-US') }, { line: event.line, column: 1 });
    }
    this.events.push(event);
  }

  private snapshot(): TurtleState {
    return { ...this.state };
  }

  private execBlock(stmts: Stmt[]): void {
    for (const stmt of stmts) this.exec(stmt);
  }

  private exec(stmt: Stmt): void {
    this.tick(stmt.pos);
    switch (stmt.kind) {
      case 'command':
        this.execCommand(stmt.name, stmt.args, stmt.pos);
        return;
      case 'call':
        this.callProcedure(stmt.name, stmt.args, stmt.pos);
        return;
      case 'repeat': {
        const count = this.toNumber(this.eval(stmt.count), 'REPEAT', stmt.count.pos);
        if (!Number.isInteger(count) || count < 0) {
          throw logoError('run.repeatCount', { value: formatValue(count) }, stmt.count.pos);
        }
        for (let k = 1; k <= count; k++) {
          this.tick(stmt.pos);
          this.repcounts.push(k);
          try {
            this.execBlock(stmt.body);
          } finally {
            this.repcounts.pop();
          }
        }
        return;
      }
      case 'if': {
        const cond = this.eval(stmt.cond);
        if (typeof cond !== 'boolean') {
          throw logoError('run.ifCond', { value: formatValue(cond) }, stmt.cond.pos);
        }
        if (cond) this.execBlock(stmt.then);
        else if (stmt.otherwise) this.execBlock(stmt.otherwise);
        return;
      }
      case 'make':
        this.setVariable(stmt.name, this.eval(stmt.value));
        return;
      case 'when':
        this.handlers.set(stmt.key, stmt.body);
        return;
      case 'stop':
        throw new StopSignal();
    }
  }

  private callProcedure(name: string, argExprs: Expr[], pos: SourcePos): void {
    const proc: Procedure = this.program.procedures.get(name)!;
    if (this.frames.length >= this.limits.maxDepth) {
      throw logoError('run.depth', { name, n: this.limits.maxDepth }, pos);
    }
    const frame = new Map<string, Value>();
    proc.params.forEach((param, k) => frame.set(param, this.eval(argExprs[k]!)));
    this.frames.push(frame);
    try {
      this.execBlock(proc.body);
    } catch (err) {
      if (!(err instanceof StopSignal)) throw err;
    } finally {
      this.frames.pop();
    }
  }

  private setVariable(name: string, value: Value): void {
    for (let k = this.frames.length - 1; k >= 0; k--) {
      if (this.frames[k]!.has(name)) {
        this.frames[k]!.set(name, value);
        return;
      }
    }
    this.globals.set(name, value);
  }

  private getVariable(name: string, pos: SourcePos): Value {
    for (let k = this.frames.length - 1; k >= 0; k--) {
      const frame = this.frames[k]!;
      if (frame.has(name)) return frame.get(name)!;
    }
    if (this.globals.has(name)) return this.globals.get(name)!;
    const known = [...this.globals.keys(), ...this.frames.flatMap((f) => [...f.keys()])];
    const hint = suggest(name, known);
    throw (hint ? logoError('run.varHint', { name: name.toLowerCase(), hint: hint.toLowerCase() }, pos) : logoError('run.var', { name: name.toLowerCase() }, pos));
  }

  private move(distance: number, line: number): void {
    const rad = (this.state.heading * Math.PI) / 180;
    const x2 = round(this.state.x + distance * Math.sin(rad));
    const y2 = round(this.state.y + distance * Math.cos(rad));
    this.moveTo(x2, y2, line);
  }

  private moveTo(x2: number, y2: number, line: number): void {
    const { x: x1, y: y1 } = this.state;
    this.state.x = round(x2);
    this.state.y = round(y2);
    if (this.state.penDown) {
      this.segments.push({ x1, y1, x2: this.state.x, y2: this.state.y, size: this.state.size });
      this.emit({ type: 'line', x1, y1, x2: this.state.x, y2: this.state.y, color: this.state.color, size: this.state.size, line, state: this.snapshot() });
    } else {
      this.emit({ type: 'move', line, state: this.snapshot() });
    }
  }

  private arc(angle: number, radius: number, line: number): void {
    if (radius <= 0) throw logoError('run.circle', {}, { line, column: 1 });
    if (!this.state.penDown || angle === 0) return;
    const sweep = Math.max(-360, Math.min(360, angle));
    const segments = Math.max(4, Math.ceil(Math.abs(sweep) / 5));
    const { x: cx, y: cy, heading } = this.state;
    const pointAt = (deg: number) => {
      const rad = (deg * Math.PI) / 180;
      return { x: round(cx + radius * Math.sin(rad)), y: round(cy + radius * Math.cos(rad)) };
    };
    let prev = pointAt(heading);
    for (let s = 1; s <= segments; s++) {
      const p = pointAt(heading + (sweep * s) / segments);
      this.segments.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, size: this.state.size });
      this.emit({ type: 'line', x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color: this.state.color, size: this.state.size, line, state: this.snapshot() });
      prev = p;
    }
  }

  /** Ask the world to carry out a command, then show the pose it answers with. */
  private worldCommand(world: WorldHost, name: string, arg: number | null, line: number): void {
    const pose = world.command(name, arg, line);
    this.state.x = round(pose.x);
    this.state.y = round(pose.y);
    this.state.heading = normalizeHeading(pose.heading);
    this.emit({ type: name === 'RIGHT' || name === 'LEFT' ? 'turn' : 'move', line, state: this.snapshot() });
    if (world.finished) throw new LevelEndSignal();
  }

  private execCommand(name: string, argExprs: Expr[], pos: SourcePos): void {
    const line = pos.line;
    const num = (k: number) => this.toNumber(this.eval(argExprs[k]!), name, argExprs[k]!.pos);

    if (this.world && (name === 'FORWARD' || name === 'BACK' || name === 'RIGHT' || name === 'LEFT')) {
      this.worldCommand(this.world, name, num(0), line);
      return;
    }

    switch (name) {
      case 'FORWARD':
        this.move(num(0), line);
        return;
      case 'BACK':
        this.move(-num(0), line);
        return;
      case 'RIGHT':
        this.state.heading = normalizeHeading(this.state.heading + num(0));
        this.emit({ type: 'turn', line, state: this.snapshot() });
        return;
      case 'LEFT':
        this.state.heading = normalizeHeading(this.state.heading - num(0));
        this.emit({ type: 'turn', line, state: this.snapshot() });
        return;
      case 'SETHEADING':
        this.state.heading = normalizeHeading(num(0));
        this.emit({ type: 'turn', line, state: this.snapshot() });
        return;
      case 'PENUP':
      case 'PENDOWN':
        this.state.penDown = name === 'PENDOWN';
        this.emit({ type: 'pen', line, state: this.snapshot() });
        return;
      case 'HOME':
        this.moveTo(0, 0, line);
        this.state.heading = 0;
        this.emit({ type: 'turn', line, state: this.snapshot() });
        return;
      case 'CLEARSCREEN':
        this.state.x = 0;
        this.state.y = 0;
        this.state.heading = 0;
        this.segments = [];
        this.emit({ type: 'clear', line, state: this.snapshot() });
        return;
      case 'CLEAN':
        this.segments = [];
        this.emit({ type: 'clear', line, state: this.snapshot() });
        return;
      case 'SETXY': {
        const x = num(0);
        const y = num(1);
        this.moveTo(x, y, line);
        return;
      }
      case 'SETX':
        this.moveTo(num(0), this.state.y, line);
        return;
      case 'SETY':
        this.moveTo(this.state.x, num(0), line);
        return;
      case 'ARC':
        this.arc(num(0), num(1), line);
        return;
      case 'CIRCLE':
        this.arc(360, num(0), line);
        return;
      case 'SETPENCOLOR':
        this.state.color = this.toColor(this.eval(argExprs[0]!), name, argExprs[0]!.pos);
        this.emit({ type: 'style', line, state: this.snapshot() });
        return;
      case 'SETBACKGROUND':
        this.background = this.toColor(this.eval(argExprs[0]!), name, argExprs[0]!.pos);
        this.emit({ type: 'background', color: this.background, line, state: this.snapshot() });
        return;
      case 'SETPENSIZE': {
        const size = num(0);
        if (size <= 0 || size > 100) {
          throw logoError('run.penSize', { value: formatValue(size) }, argExprs[0]!.pos);
        }
        this.state.size = size;
        this.emit({ type: 'style', line, state: this.snapshot() });
        return;
      }
      case 'HIDETURTLE':
      case 'SHOWTURTLE':
        this.state.visible = name === 'SHOWTURTLE';
        this.emit({ type: 'visibility', line, state: this.snapshot() });
        return;
      case 'PRINT':
        this.emit({ type: 'print', text: formatValue(this.eval(argExprs[0]!)), line, state: this.snapshot() });
        return;
      case 'DOT': {
        const x = round(num(0));
        const y = round(num(1));
        const r = Math.max(3, this.state.size * 2 + 2);
        this.segments.push({ x1: x, y1: y, x2: x, y2: y, size: r * 2 });
        this.emit({ type: 'dot', x, y, r, color: this.state.color, line, state: this.snapshot() });
        return;
      }
      case 'FILL': {
        const rects = computeFill(this.segments, this.state.x, this.state.y);
        if (!rects) {
          throw new LogoError(
            'FILL needs the turtle inside a closed shape. Draw the shape first and check it has no gap, then FILL while the turtle is inside it.',
            pos,
          );
        }
        this.emit({ type: 'fill', color: this.state.color, rects, line, state: this.snapshot() });
        return;
      }
      case 'SHOW':
        this.emit({ type: 'show', text: formatValue(this.eval(argExprs[0]!)), line, state: this.snapshot() });
        return;
      case 'PLAY': {
        const tune = parseTune(this.eval(argExprs[0]!), argExprs[0]!.pos);
        const tones = tune.items.map((item) => ({ hz: item.hz, seconds: (item.beats * 60) / this.tempo }));
        this.addSeconds(tones.reduce((sum, t) => sum + t.seconds, 0), pos);
        this.emit({ type: 'play', tones, line, state: this.snapshot() });
        return;
      }
      case 'SETTEMPO': {
        const bpm = num(0);
        if (bpm < 20 || bpm > 300) {
          throw logoError('run.tempo', { value: formatValue(bpm) }, argExprs[0]!.pos);
        }
        this.tempo = bpm;
        return;
      }
      case 'WAIT': {
        const n = num(0);
        if (n < 0 || n > 600) {
          throw logoError('run.wait', { value: formatValue(n) }, argExprs[0]!.pos);
        }
        this.addSeconds(n / 60, pos);
        this.emit({ type: 'wait', seconds: n / 60, line, state: this.snapshot() });
        return;
      }
      case 'FRAME':
        this.addSeconds(0.25, pos);
        this.emit({ type: 'frame', line, state: this.snapshot() });
        this.emit({ type: 'wait', seconds: 0.25, line, state: this.snapshot() });
        return;
      case 'GAMEOVER':
        this.gameOver = true;
        this.emit({ type: 'gameover', line, state: this.snapshot() });
        throw new GameOverSignal();
      default:
        if (this.world) {
          this.worldCommand(this.world, name, argExprs.length ? num(0) : null, line);
          return;
        }
        throw logoError('run.unknown', { name }, pos);
    }
  }

  private eval(expr: Expr): Value {
    switch (expr.kind) {
      case 'num':
        return expr.value;
      case 'word':
        return expr.value;
      case 'list':
        return expr.items.map((item) => this.eval(item));
      case 'var':
        return this.getVariable(expr.name, expr.pos);
      case 'neg':
        return -this.toNumber(this.eval(expr.expr), '-', expr.pos);
      case 'bin':
        return this.evalBinary(expr.op, expr.left, expr.right, expr.pos);
      case 'reporter':
        return this.evalReporter(expr.name, expr.args, expr.pos);
    }
  }

  private evalBinary(op: string, leftExpr: Expr, rightExpr: Expr, pos: SourcePos): Value {
    const left = this.eval(leftExpr);
    const right = this.eval(rightExpr);
    if (op === '=' || op === '<>') {
      const same =
        typeof left === 'number' && typeof right === 'number' ? round(left) === round(right) : formatValue(left).toUpperCase() === formatValue(right).toUpperCase();
      return op === '=' ? same : !same;
    }
    const a = this.toNumber(left, op, leftExpr.pos);
    const b = this.toNumber(right, op, rightExpr.pos);
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) throw logoError('run.divZero', {}, pos);
        return a / b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      default: throw logoError('run.op', { op }, pos);
    }
  }

  private evalReporter(name: string, argExprs: Expr[], pos: SourcePos): Value {
    const num = (k: number) => this.toNumber(this.eval(argExprs[k]!), name, argExprs[k]!.pos);
    switch (name) {
      case 'RANDOM': {
        const n = num(0);
        if (!Number.isInteger(n) || n <= 0) {
          throw logoError('run.random', { value: formatValue(n) }, argExprs[0]!.pos);
        }
        return Math.floor(this.random() * n);
      }
      case 'REPCOUNT': {
        const current = this.repcounts[this.repcounts.length - 1];
        if (current === undefined) throw logoError('run.repcount', {}, pos);
        return current;
      }
      case 'SQRT': {
        const n = num(0);
        if (n < 0) throw logoError('run.sqrt', {}, argExprs[0]!.pos);
        return Math.sqrt(n);
      }
      case 'SIN':
        return round(Math.sin((num(0) * Math.PI) / 180));
      case 'COS':
        return round(Math.cos((num(0) * Math.PI) / 180));
      case 'HEADING':
        return this.state.heading;
      case 'XCOR':
        return this.state.x;
      case 'YCOR':
        return this.state.y;
      case 'DISTANCE':
        return round(Math.hypot(num(0) - this.state.x, num(1) - this.state.y));
      case 'SENTENCE': {
        const a = this.eval(argExprs[0]!);
        const b = this.eval(argExprs[1]!);
        return [...(Array.isArray(a) ? a : [a]), ...(Array.isArray(b) ? b : [b])];
      }
      default: {
        const sensed = this.world?.reporter(name);
        if (sensed !== undefined) return sensed;
        throw logoError('run.unknown', { name }, pos);
      }
    }
  }

  private toNumber(value: Value, owner: string, pos: SourcePos): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw logoError('run.tooBig', { owner }, pos);
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    throw logoError('run.needsNumber', { owner, value: formatValue(value) }, pos);
  }

  private toColor(value: Value, owner: string, pos: SourcePos): string {
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0 || value > 15) {
        throw logoError('run.colourNumber', { value: formatValue(value) }, pos);
      }
      return PALETTE_16[value]!;
    }
    if (typeof value === 'string') {
      const key = value.toUpperCase();
      const named = NAMED_COLORS[key];
      if (named) return named;
      const hint = suggest(key, Object.keys(NAMED_COLORS));
      throw (hint ? logoError('run.colourHint', { value, hint: hint.toLowerCase() }, pos) : logoError('run.colour', { value }, pos));
    }
    if (Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number')) {
      const [r, g, b] = value as number[];
      return rgbToHex(r!, g!, b!);
    }
    throw logoError('run.colourNeeds', { owner }, pos);
  }
}

export function run(program: Program, options: RunOptions = {}): RunResult {
  return new Interpreter(program, options).run();
}

export interface GameSession {
  /** Keys with a WHEN handler (not counting TICK). */
  keys: GameKey[];
  /** True when the program has a WHEN "tick handler. */
  ticks: boolean;
  /** True after GAMEOVER. */
  isOver(): boolean;
  /** Run one key press. Throws LogoRunError (with the partial events) if the handler has a problem. */
  press(key: GameKey): TurtleEvent[];
}

/** Run the main program and keep the interpreter alive so key presses can continue the game. */
export function runSession(program: Program, options: RunOptions = {}): { result: RunResult; session: GameSession } {
  const interpreter = new Interpreter(program, options);
  const result = interpreter.run();
  return { result, session: { keys: interpreter.keys(), ticks: interpreter.hasTick(), isOver: () => interpreter.isOver(), press: (key) => interpreter.press(key) } };
}
