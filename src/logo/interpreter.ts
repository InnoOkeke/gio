import { NAMED_COLORS, PALETTE_16, rgbToHex } from './colors.js';
import { LogoError, suggest, type SourcePos } from './errors.js';
import type { Expr, Procedure, Program, Stmt } from './parser.js';
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
  | (EventBase & { type: 'show'; text: string })
  | (EventBase & { type: 'gameover' });

export interface RunLimits {
  /** Statements and loop rounds executed before GIO stops a runaway program. */
  maxOps: number;
  /** Drawing events recorded before GIO stops. */
  maxEvents: number;
  /** How deep procedures may call each other (recursion). */
  maxDepth: number;
}

export const DEFAULT_LIMITS: RunLimits = { maxOps: 200_000, maxEvents: 20_000, maxDepth: 200 };

export interface RunOptions {
  limits?: Partial<RunLimits>;
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
  private readonly handlers = new Map<GameKey, Stmt[]>();
  private gameOver = false;
  private readonly globals = new Map<string, Value>();
  private readonly frames: Map<string, Value>[] = [];
  private readonly repcounts: number[] = [];
  private ops = 0;
  private readonly limits: RunLimits;
  private readonly random: () => number;

  constructor(
    private readonly program: Program,
    options: RunOptions,
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.random = options.random ?? Math.random;
  }

  run(): RunResult {
    try {
      this.execBlock(this.program.main);
    } catch (err) {
      if (err instanceof LogoError) throw new LogoRunError(err, this.result());
      if (!(err instanceof StopSignal) && !(err instanceof GameOverSignal)) throw err;
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
    try {
      this.execBlock(body);
    } catch (err) {
      if (err instanceof LogoError) throw new LogoRunError(err, this.result());
      if (!(err instanceof StopSignal) && !(err instanceof GameOverSignal)) throw err;
    }
    return [...this.events];
  }

  private tick(pos: SourcePos): void {
    if (++this.ops > this.limits.maxOps) {
      throw new LogoError(
        `Your program ran ${this.limits.maxOps.toLocaleString('en-US')} steps, so I stopped it. Is a REPEAT or command repeating forever?`,
        pos,
      );
    }
  }

  private emit(event: TurtleEvent): void {
    if (this.events.length >= this.limits.maxEvents) {
      throw new LogoError(
        `That's a lot of drawing! I stopped after ${this.limits.maxEvents.toLocaleString('en-US')} moves. Try smaller numbers in your REPEAT.`,
        { line: event.line, column: 1 },
      );
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
          throw new LogoError(`REPEAT needs a whole number of times, like REPEAT 4. You gave ${formatValue(count)}.`, stmt.count.pos);
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
          throw new LogoError(`IF needs a question that is true or false, like IF :size > 50. Got ${formatValue(cond)}.`, stmt.cond.pos);
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
      throw new LogoError(
        `${name} called itself ${this.limits.maxDepth} times deep, so I stopped. Add an IF with STOP so it knows when to finish.`,
        pos,
      );
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
    throw new LogoError(
      hint
        ? `I don't know :${name.toLowerCase()}. Did you mean :${hint.toLowerCase()}?`
        : `I don't know :${name.toLowerCase()} yet. Make it first with MAKE "${name.toLowerCase()} 50.`,
      pos,
    );
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
      this.emit({ type: 'line', x1, y1, x2: this.state.x, y2: this.state.y, color: this.state.color, size: this.state.size, line, state: this.snapshot() });
    } else {
      this.emit({ type: 'move', line, state: this.snapshot() });
    }
  }

  private arc(angle: number, radius: number, line: number): void {
    if (radius <= 0) throw new LogoError('The circle needs a size bigger than 0.', { line, column: 1 });
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
      this.emit({ type: 'line', x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color: this.state.color, size: this.state.size, line, state: this.snapshot() });
      prev = p;
    }
  }

  private execCommand(name: string, argExprs: Expr[], pos: SourcePos): void {
    const line = pos.line;
    const num = (k: number) => this.toNumber(this.eval(argExprs[k]!), name, argExprs[k]!.pos);

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
        this.emit({ type: 'clear', line, state: this.snapshot() });
        return;
      case 'CLEAN':
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
          throw new LogoError(`Pen size should be between 1 and 100. You gave ${formatValue(size)}.`, argExprs[0]!.pos);
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
        this.emit({ type: 'dot', x, y, r: Math.max(3, this.state.size * 2 + 2), color: this.state.color, line, state: this.snapshot() });
        return;
      }
      case 'SHOW':
        this.emit({ type: 'show', text: formatValue(this.eval(argExprs[0]!)), line, state: this.snapshot() });
        return;
      case 'GAMEOVER':
        this.gameOver = true;
        this.emit({ type: 'gameover', line, state: this.snapshot() });
        throw new GameOverSignal();
      default:
        throw new LogoError(`I don't know how to ${name} yet.`, pos);
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
        if (b === 0) throw new LogoError("You can't divide by zero.", pos);
        return a / b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      default: throw new LogoError(`I don't understand ${op}.`, pos);
    }
  }

  private evalReporter(name: string, argExprs: Expr[], pos: SourcePos): Value {
    const num = (k: number) => this.toNumber(this.eval(argExprs[k]!), name, argExprs[k]!.pos);
    switch (name) {
      case 'RANDOM': {
        const n = num(0);
        if (!Number.isInteger(n) || n <= 0) {
          throw new LogoError(`RANDOM needs a whole number bigger than 0, like RANDOM 10. You gave ${formatValue(n)}.`, argExprs[0]!.pos);
        }
        return Math.floor(this.random() * n);
      }
      case 'REPCOUNT': {
        const current = this.repcounts[this.repcounts.length - 1];
        if (current === undefined) throw new LogoError('REPCOUNT only works inside a REPEAT.', pos);
        return current;
      }
      case 'SQRT': {
        const n = num(0);
        if (n < 0) throw new LogoError("SQRT can't take a number below zero.", argExprs[0]!.pos);
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
      default:
        throw new LogoError(`I don't know how to ${name} yet.`, pos);
    }
  }

  private toNumber(value: Value, owner: string, pos: SourcePos): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new LogoError(`That number is too big for ${owner}.`, pos);
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    throw new LogoError(`${owner} needs a number, but got "${formatValue(value)}".`, pos);
  }

  private toColor(value: Value, owner: string, pos: SourcePos): string {
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0 || value > 15) {
        throw new LogoError(`Colour numbers go from 0 to 15. You gave ${formatValue(value)}.`, pos);
      }
      return PALETTE_16[value]!;
    }
    if (typeof value === 'string') {
      const key = value.toUpperCase();
      const named = NAMED_COLORS[key];
      if (named) return named;
      const hint = suggest(key, Object.keys(NAMED_COLORS));
      throw new LogoError(
        hint ? `I don't know the colour "${value}". Did you mean "${hint.toLowerCase()}?` : `I don't know the colour "${value}". Try "red, "blue or "green.`,
        pos,
      );
    }
    if (Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number')) {
      const [r, g, b] = value as number[];
      return rgbToHex(r!, g!, b!);
    }
    throw new LogoError(`${owner} needs a colour like "red, a number from 0 to 15, or [255 0 0].`, pos);
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
