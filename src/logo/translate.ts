import { NAMED_COLORS, PALETTE_16 } from './colors.js';
import type { Expr, Procedure, Program, Stmt } from './parser.js';
import { TICK_MS } from './primitives.js';

export type TargetLanguage = 'python' | 'javascript';

/** One line of translated code, tagged with the Logo line it came from (for matching highlights). */
export interface TranslatedLine {
  text: string;
  /** 1-based Logo source line, when the line comes from a specific Logo statement or comment. */
  src?: number;
}

export interface Translation {
  language: TargetLanguage;
  lines: TranslatedLine[];
}

/* ------------------------------------------------------------------ names */

const PYTHON_KEYWORDS = new Set([
  'false', 'none', 'true', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
  'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield', 'print', 'range', 'int', 'str', 'len', 'list', 'sum', 'min', 'max', 'abs', 'round',
]);

/** Turtle-module and helper names the Python output calls; a kid's names must not shadow them. */
const PYTHON_RESERVED = new Set([
  'forward', 'back', 'right', 'left', 'penup', 'pendown', 'home', 'clear', 'goto', 'setx', 'sety', 'setheading', 'pencolor',
  'pensize', 'bgcolor', 'hideturtle', 'showturtle', 'heading', 'xcor', 'ycor', 'circle', 'isdown', 'mode', 'done', 'randrange',
  'sqrt', 'sin', 'cos', 'radians', 'speed', 'logo_arc', 'logo_clearscreen', 'palette', 'onkey', 'listen',
  'on_up', 'on_down', 'on_left', 'on_right', 'on_space', 'on_tick', 'show', 'dot', 'logo_dot', 'game_over', 'distance',
  'ontimer', 'position', 'turtle',
]);

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
  'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'await', 'enum', 'static', 'console', 'math',
]);

const JS_RESERVED = new Set([
  'forward', 'back', 'right', 'left', 'penup', 'pendown', 'home', 'clearscreen', 'clean', 'goto', 'setx', 'sety', 'setheading',
  'pencolor', 'pensize', 'background', 'hideturtle', 'showturtle', 'heading', 'xcor', 'ycor', 'arc', 'circle', 'onkey',
  'ontick', 'show', 'dot', 'gameover', 'distance',
]);

function identifier(name: string, language: TargetLanguage): string {
  let id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (/^[0-9]/.test(id)) id = `_${id}`;
  const keywords = language === 'python' ? PYTHON_KEYWORDS : JS_KEYWORDS;
  const reserved = language === 'python' ? PYTHON_RESERVED : JS_RESERVED;
  if (keywords.has(id) || reserved.has(id)) id = `${id}_`;
  return id;
}

/* ------------------------------------------------------------------ small helpers */

/** Colour names Python's turtle (Tk) understands with the same meaning. Others become hex codes. */
const PY_COLOR_NAMES = new Set(['black', 'white', 'gray', 'grey', 'red', 'orange', 'yellow', 'gold', 'green', 'cyan', 'blue', 'navy', 'purple', 'violet', 'magenta', 'pink', 'brown']);

function hexFromList(items: Expr[]): string | null {
  if (items.length !== 3 || !items.every((i) => i.kind === 'num')) return null;
  const rgb = items.map((i) => Math.max(0, Math.min(255, Math.round((i as { value: number }).value))));
  return `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
}

const quote = (text: string): string => JSON.stringify(text);

/** Key names Python's turtle onkey() expects. */
const PY_KEY_NAMES: Record<string, string> = { UP: 'Up', DOWN: 'Down', LEFT: 'Left', RIGHT: 'Right', SPACE: 'space' };

const handlerName = (key: string): string => `WHEN:${key}`;

function childStatements(s: Stmt): Stmt[] {
  if (s.kind === 'repeat' || s.kind === 'when') return s.body;
  if (s.kind === 'if') return [...s.then, ...(s.otherwise ?? [])];
  return [];
}

function walk(stmts: Stmt[], visit: (s: Stmt) => void): void {
  for (const s of stmts) {
    visit(s);
    walk(childStatements(s), visit);
  }
}

function exprUsesRepcount(e: Expr): boolean {
  switch (e.kind) {
    case 'reporter': return e.name === 'REPCOUNT' || e.args.some(exprUsesRepcount);
    case 'bin': return exprUsesRepcount(e.left) || exprUsesRepcount(e.right);
    case 'neg': return exprUsesRepcount(e.expr);
    case 'list': return e.items.some(exprUsesRepcount);
    default: return false;
  }
}

/** Does this loop body read its own REPCOUNT? A nested REPEAT's body has its own count, so it's skipped. */
function blockUsesRepcount(stmts: Stmt[]): boolean {
  return stmts.some((s) => {
    switch (s.kind) {
      case 'command':
      case 'call': return s.args.some(exprUsesRepcount);
      case 'make': return exprUsesRepcount(s.value);
      case 'if': return exprUsesRepcount(s.cond) || blockUsesRepcount(s.then) || (s.otherwise ? blockUsesRepcount(s.otherwise) : false);
      case 'repeat': return exprUsesRepcount(s.count);
      default: return false;
    }
  });
}

function addOne(code: string): string {
  return /^\d+$/.test(code) ? String(Number(code) + 1) : `${code} + 1`;
}

/* ------------------------------------------------------------------ translator */

class Translator {
  private readonly lines: TranslatedLine[] = [];
  private readonly py: boolean;
  private readonly procNames = new Map<string, string>();
  private readonly loopVars: string[] = [];
  private readonly usedNames = new Set<string>();
  private currentProc: Procedure | null = null;
  /** Variables each procedure assigns that are not its own inputs (globals). */
  private readonly globalsAssignedIn = new Map<string, Set<string>>();
  /** JavaScript globals already declared with `let`. */
  private readonly declared = new Set<string>();
  /** Comments grouped by the Logo line of the statement they sit above (or on). */
  private readonly commentsAt = new Map<number, { line: number; text: string }[]>();
  private readonly trailingComments: { line: number; text: string }[] = [];
  private readonly emittedCommentLines = new Set<number>();
  private pendingNote: string | null = null;
  private readonly needs = { arc: false, clearscreen: false, palette: false, random: false, math: false, keys: false, tick: false, dot: false, show: false, gameover: false };

  constructor(
    private readonly program: Program,
    source: string,
    private readonly language: TargetLanguage,
  ) {
    this.py = language === 'python';
    for (const name of program.procedures.keys()) {
      const id = identifier(name, language);
      this.procNames.set(name, id);
      this.usedNames.add(id);
    }
    for (const proc of program.procedures.values()) {
      proc.params.forEach((p) => this.usedNames.add(identifier(p, language)));
      walk(proc.body, (s) => {
        if (s.kind !== 'make') return;
        this.usedNames.add(identifier(s.name, language));
        if (!proc.params.includes(s.name)) {
          const set = this.globalsAssignedIn.get(proc.name) ?? new Set<string>();
          set.add(s.name);
          this.globalsAssignedIn.set(proc.name, set);
        }
      });
    }
    walk(program.main, (s) => {
      if (s.kind === 'make') this.usedNames.add(identifier(s.name, language));
      if (s.kind !== 'when') return;
      // A WHEN handler becomes a function, so variables it changes are globals.
      const set = this.globalsAssignedIn.get(handlerName(s.key)) ?? new Set<string>();
      walk(s.body, (inner) => inner.kind === 'make' && set.add(inner.name));
      this.globalsAssignedIn.set(handlerName(s.key), set);
    });
    this.attachComments(source);
  }

  /** Each comment is attached to the first statement on or after its line, wherever that statement is emitted. */
  private attachComments(source: string): void {
    const anchors = new Set<number>();
    for (const proc of this.program.procedures.values()) {
      anchors.add(proc.pos.line);
      walk(proc.body, (s) => anchors.add(s.pos.line));
    }
    walk(this.program.main, (s) => anchors.add(s.pos.line));
    const sorted = [...anchors].sort((a, b) => a - b);

    source.split('\n').forEach((raw, k) => {
      const at = raw.indexOf(';');
      const text = at >= 0 ? raw.slice(at + 1).trim() : '';
      if (!text) return;
      const line = k + 1;
      const owner = sorted.find((a) => a >= line);
      const comment = { line, text };
      if (owner === undefined) this.trailingComments.push(comment);
      else this.commentsAt.set(owner, [...(this.commentsAt.get(owner) ?? []), comment]);
    });
  }

  translate(): Translation {
    // Procedures first (Python needs a function defined before it runs), then the main program.
    const procs = [...this.program.procedures.values()].sort((a, b) => a.pos.line - b.pos.line);
    for (const proc of procs) {
      this.emitProcedure(proc);
      this.blank();
    }
    if (!this.py) this.declareJsGlobals();
    this.emitBlock(this.program.main, 0);
    const mark = this.py ? '#' : '//';
    for (const c of this.trailingComments) this.push(`${mark} ${c.text}`, 0, c.line);

    const body = this.lines.splice(0);
    while (body.length && body[body.length - 1]!.text === '') body.pop();
    const footer: TranslatedLine[] = this.py
      ? [
          { text: '' },
          ...(this.needs.tick ? [{ text: '_tick()  # start the game clock' }] : []),
          ...(this.needs.keys ? [{ text: 'listen()  # start listening for the keys' }] : []),
          { text: 'done()' },
        ]
      : [];
    return { language: this.language, lines: [...this.header(), ...body, ...footer] };
  }

  /* ---- structure ---- */

  private header(): TranslatedLine[] {
    if (!this.py) {
      return [{ text: '// JavaScript, the language of the web' }, { text: "// (uses GIO's turtle commands)" }, { text: '' }];
    }
    const out: TranslatedLine[] = [{ text: 'from turtle import *' }];
    if (this.needs.random) out.push({ text: 'from random import randrange' });
    if (this.needs.math) out.push({ text: 'from math import sqrt, sin, cos, radians' });
    out.push({ text: '' }, { text: 'mode("logo")  # start facing up and turn clockwise, like Logo' }, { text: '' });

    if (this.needs.palette) {
      out.push(
        { text: '# The 16 numbered Logo colours' },
        { text: `PALETTE = [${PALETTE_16.map(quote).join(', ')}]` },
        { text: '' },
        { text: 'def palette(n):' },
        { text: '    return PALETTE[int(n) % 16]' },
        { text: '' },
      );
    }
    if (this.needs.arc) {
      out.push(
        { text: '# Logo draws arcs around the turtle and leaves it where it was' },
        { text: 'def logo_arc(angle, radius):' },
        { text: '    if not isdown():' },
        { text: '        return' },
        { text: '    x, y, h = xcor(), ycor(), heading()' },
        { text: '    penup()' },
        { text: '    forward(radius)' },
        { text: '    right(90)' },
        { text: '    pendown()' },
        { text: '    circle(-radius, angle)' },
        { text: '    penup()' },
        { text: '    goto(x, y)' },
        { text: '    setheading(h)' },
        { text: '    pendown()' },
        { text: '' },
      );
    }
    if (this.needs.clearscreen) {
      out.push(
        { text: "# Logo's CLEARSCREEN: wipe the drawing and go home without drawing" },
        { text: 'def logo_clearscreen():' },
        { text: '    clear()' },
        { text: '    was_down = isdown()' },
        { text: '    penup()' },
        { text: '    home()' },
        { text: '    if was_down:' },
        { text: '        pendown()' },
        { text: '' },
      );
    }
    if (this.needs.tick || this.needs.gameover) {
      out.push({ text: '_playing = True  # becomes False after game_over()' }, { text: '' });
    }
    if (this.needs.dot) {
      out.push(
        { text: '# Draw a dot somewhere without moving the turtle' },
        { text: 'def logo_dot(x, y):' },
        { text: '    here, h, was_down = position(), heading(), isdown()' },
        { text: '    penup()' },
        { text: '    goto(x, y)' },
        { text: '    dot(max(6, pensize() * 4 + 4))' },
        { text: '    goto(here)' },
        { text: '    setheading(h)' },
        { text: '    if was_down:' },
        { text: '        pendown()' },
        { text: '' },
      );
    }
    if (this.needs.show) {
      out.push(
        { text: '# A second turtle that writes the scoreboard' },
        { text: '_board = Turtle()' },
        { text: '_board.hideturtle()' },
        { text: '_board.penup()' },
        { text: '_board.goto(-280, 250)' },
        { text: '' },
        { text: 'def show(text):' },
        { text: '    _board.clear()' },
        { text: '    _board.write(str(text), font=("Arial", 24, "bold"))' },
        { text: '' },
      );
    }
    if (this.needs.gameover) {
      out.push(
        { text: 'def game_over():' },
        { text: '    global _playing' },
        { text: '    _playing = False' },
        { text: '    for key in ["Up", "Down", "Left", "Right", "space"]:' },
        { text: '        onkey(None, key)' },
        { text: '' },
      );
    }
    if (this.needs.tick) {
      out.push(
        { text: `# The game clock: run on_tick() every ${TICK_MS} milliseconds` },
        { text: 'def _tick():' },
        { text: '    if _playing:' },
        { text: '        on_tick()' },
        { text: `        ontimer(_tick, ${TICK_MS})` },
        { text: '' },
      );
    }
    return out;
  }

  /** Variables that any function changes are declared up front, so they exist before the function runs. */
  private declareJsGlobals(): void {
    const names = new Set<string>();
    for (const set of this.globalsAssignedIn.values()) set.forEach((n) => names.add(n));
    if (!names.size) return;
    this.push(`let ${[...names].map((n) => identifier(n, 'javascript')).join(', ')};`, 0);
    names.forEach((n) => this.declared.add(n));
    this.blank();
  }

  private emitProcedure(proc: Procedure): void {
    this.emitComments(proc.pos.line, 0);
    const name = this.procNames.get(proc.name)!;
    const params = proc.params.map((p) => identifier(p, this.language)).join(', ');
    this.currentProc = proc;
    if (this.py) {
      this.push(`def ${name}(${params}):`, 0, proc.pos.line);
      const globals = [...(this.globalsAssignedIn.get(proc.name) ?? [])].map((g) => identifier(g, 'python'));
      if (globals.length) this.push(`global ${globals.join(', ')}`, 1, proc.pos.line);
      const before = this.lines.length;
      this.emitBlock(proc.body, 1);
      if (this.lines.length === before && !globals.length) this.push('pass', 1);
    } else {
      this.push(`function ${name}(${params}) {`, 0, proc.pos.line);
      this.emitBlock(proc.body, 1);
      this.push('}', 0);
    }
    this.currentProc = null;
  }

  private emitBlock(stmts: Stmt[], depth: number): void {
    for (const s of stmts) {
      this.emitComments(s.pos.line, depth);
      this.emitStmt(s, depth);
    }
  }

  private emitBody(stmts: Stmt[], depth: number): void {
    const before = this.lines.length;
    this.emitBlock(stmts, depth);
    if (this.lines.length === before) this.push('pass', depth);
  }

  private emitStmt(s: Stmt, depth: number): void {
    const end = this.py ? '' : ';';
    const line = s.pos.line;

    switch (s.kind) {
      case 'command': {
        const code = this.command(s.name, s.args);
        this.pushStatement(`${code}${end}`, depth, line);
        // GAMEOVER also ends the rest of this handler, as it does in GIO.
        if (s.name === 'GAMEOVER' && this.currentProc) this.push(this.py ? 'return' : 'return;', depth, line);
        return;
      }
      case 'call':
        this.pushStatement(`${this.procNames.get(s.name)}(${s.args.map((a) => this.expr(a)).join(', ')})${end}`, depth, line);
        return;
      case 'make': {
        const id = identifier(s.name, this.language);
        const value = this.expr(s.value);
        if (!this.py && !this.currentProc && !this.declared.has(s.name)) {
          this.declared.add(s.name);
          this.pushStatement(`let ${id} = ${value};`, depth, line);
        } else {
          this.pushStatement(`${id} = ${value}${end}`, depth, line);
        }
        return;
      }
      case 'stop':
        if (this.currentProc) this.push(this.py ? 'return' : 'return;', depth, line);
        else this.push(this.py ? 'raise SystemExit  # STOP the whole program' : 'throw "STOP"; // stop the whole program', depth, line);
        return;
      case 'if': {
        const cond = this.expr(s.cond);
        if (this.py) {
          this.push(`if ${cond}:`, depth, line);
          this.emitBody(s.then, depth + 1);
          if (s.otherwise) {
            this.push('else:', depth, line);
            this.emitBody(s.otherwise, depth + 1);
          }
        } else {
          this.push(`if (${cond}) {`, depth, line);
          this.emitBlock(s.then, depth + 1);
          if (s.otherwise) {
            this.push('} else {', depth, line);
            this.emitBlock(s.otherwise, depth + 1);
          }
          this.push('}', depth);
        }
        return;
      }
      case 'when': {
        this.needs.keys = true;
        const saved = this.currentProc;
        this.currentProc = { name: handlerName(s.key), params: [], body: s.body, pos: s.pos };
        const isTick = s.key === 'TICK';
        if (isTick) this.needs.tick = true;
        if (this.py) {
          const fn = `on_${s.key.toLowerCase()}`;
          this.push(`def ${fn}():`, depth, line);
          const globals = [...(this.globalsAssignedIn.get(handlerName(s.key)) ?? [])].map((g) => identifier(g, 'python'));
          if (globals.length) this.push(`global ${globals.join(', ')}`, depth + 1, line);
          const before = this.lines.length;
          this.emitBlock(s.body, depth + 1);
          if (this.lines.length === before && !globals.length) this.push('pass', depth + 1);
          if (!isTick) this.push(`onkey(${fn}, ${quote(PY_KEY_NAMES[s.key]!)})`, depth, line);
        } else {
          this.push(isTick ? 'onTick(() => {' : `onKey(${quote(s.key.toLowerCase())}, () => {`, depth, line);
          this.emitBlock(s.body, depth + 1);
          this.push('});', depth);
        }
        this.currentProc = saved;
        return;
      }
      case 'repeat': {
        const count = this.expr(s.count);
        const usesCount = blockUsesRepcount(s.body);
        const v = this.nextLoopVar();
        this.loopVars.push(v);
        if (this.py) {
          this.push(usesCount ? `for ${v} in range(1, ${addOne(count)}):` : `for ${v} in range(${count}):`, depth, line);
          this.emitBody(s.body, depth + 1);
        } else {
          const header = usesCount ? `for (let ${v} = 1; ${v} <= ${count}; ${v}++) {` : `for (let ${v} = 0; ${v} < ${count}; ${v}++) {`;
          this.push(header, depth, line);
          this.emitBlock(s.body, depth + 1);
          this.push('}', depth);
        }
        this.loopVars.pop();
        return;
      }
    }
  }

  private nextLoopVar(): string {
    for (const c of ['i', 'j', 'k', 'n', 'm', 'i2', 'j2', 'k2']) {
      if (!this.loopVars.includes(c) && !this.usedNames.has(c)) return c;
    }
    return `loop${this.loopVars.length}`;
  }

  /* ---- commands ---- */

  private command(name: string, args: Expr[]): string {
    const a = args.map((x) => this.expr(x));
    const py = this.py;
    switch (name) {
      case 'FORWARD': return `forward(${a[0]})`;
      case 'BACK': return `back(${a[0]})`;
      case 'RIGHT': return `right(${a[0]})`;
      case 'LEFT': return `left(${a[0]})`;
      case 'PENUP': return py ? 'penup()' : 'penUp()';
      case 'PENDOWN': return py ? 'pendown()' : 'penDown()';
      case 'HOME': return 'home()';
      case 'CLEARSCREEN':
        if (!py) return 'clearScreen()';
        this.needs.clearscreen = true;
        return 'logo_clearscreen()';
      case 'CLEAN': return py ? 'clear()' : 'clean()';
      case 'SETXY': return `goto(${a[0]}, ${a[1]})`;
      case 'SETX': return py ? `setx(${a[0]})` : `setX(${a[0]})`;
      case 'SETY': return py ? `sety(${a[0]})` : `setY(${a[0]})`;
      case 'SETHEADING': return py ? `setheading(${a[0]})` : `setHeading(${a[0]})`;
      case 'ARC':
        if (!py) return `arc(${a[0]}, ${a[1]})`;
        this.needs.arc = true;
        return `logo_arc(${a[0]}, ${a[1]})`;
      case 'CIRCLE':
        if (!py) return `circle(${a[0]})`;
        this.needs.arc = true;
        return `logo_arc(360, ${a[0]})`;
      case 'SETPENCOLOR': return `${py ? 'pencolor' : 'penColor'}(${this.color(args[0]!)})`;
      case 'SETBACKGROUND': return `${py ? 'bgcolor' : 'background'}(${this.color(args[0]!)})`;
      case 'SETPENSIZE': return py ? `pensize(${a[0]})` : `penSize(${a[0]})`;
      case 'HIDETURTLE': return py ? 'hideturtle()' : 'hideTurtle()';
      case 'SHOWTURTLE': return py ? 'showturtle()' : 'showTurtle()';
      case 'PRINT': return `${py ? 'print' : 'console.log'}(${this.printValue(args[0]!)})`;
      case 'DOT':
        if (!py) return `dot(${a[0]}, ${a[1]})`;
        this.needs.dot = true;
        return `logo_dot(${a[0]}, ${a[1]})`;
      case 'SHOW':
        if (py) this.needs.show = true;
        return `show(${this.printValue(args[0]!)})`;
      case 'GAMEOVER':
        if (!py) return 'gameOver()';
        this.needs.gameover = true;
        return 'game_over()';
      default: return `${name.toLowerCase()}(${a.join(', ')})`;
    }
  }

  private color(arg: Expr): string {
    if (arg.kind === 'word') {
      const name = arg.value.toLowerCase();
      const hex = NAMED_COLORS[arg.value.toUpperCase()];
      if (!this.py || PY_COLOR_NAMES.has(name) || !hex) return quote(name);
      this.pendingNote = name;
      return quote(hex);
    }
    if (arg.kind === 'num' && Number.isInteger(arg.value) && arg.value >= 0 && arg.value <= 15) {
      if (!this.py) return String(arg.value);
      this.pendingNote = `colour ${arg.value}`;
      return quote(PALETTE_16[arg.value]!);
    }
    if (arg.kind === 'list') {
      const hex = hexFromList(arg.items);
      if (hex) return quote(hex);
    }
    if (!this.py) return this.expr(arg);
    this.needs.palette = true;
    return `palette(${this.expr(arg)})`;
  }

  private printValue(arg: Expr): string {
    if (arg.kind === 'list') {
      const words = arg.items.map((i) => (i.kind === 'num' ? formatNumber(i.value) : i.kind === 'word' ? i.value : null));
      if (words.every((w) => w !== null)) return quote(words.join(' '));
    }
    return this.expr(arg);
  }

  /* ---- expressions ---- */

  private expr(e: Expr, parentPrec = 0): string {
    const { code, prec } = this.exprWithPrec(e);
    return prec < parentPrec ? `(${code})` : code;
  }

  private exprWithPrec(e: Expr): { code: string; prec: number } {
    switch (e.kind) {
      case 'num':
        return { code: formatNumber(e.value), prec: e.value < 0 ? 4 : 6 };
      case 'word':
        return { code: quote(e.value), prec: 6 };
      case 'var':
        return { code: identifier(e.name, this.language), prec: 6 };
      case 'list':
        return { code: `[${e.items.map((i) => this.expr(i)).join(', ')}]`, prec: 6 };
      case 'neg':
        return { code: `-${this.expr(e.expr, 5)}`, prec: 4 };
      case 'bin': {
        const prec = e.op === '+' || e.op === '-' ? 2 : e.op === '*' || e.op === '/' ? 3 : 1;
        const op = e.op === '=' ? (this.py ? '==' : '===') : e.op === '<>' ? (this.py ? '!=' : '!==') : e.op;
        const left = this.expr(e.left, prec);
        // The right side of - and / needs brackets at equal precedence: a - (b - c).
        const right = this.expr(e.right, e.op === '-' || e.op === '/' ? prec + 1 : prec);
        return { code: `${left} ${op} ${right}`, prec };
      }
      case 'reporter':
        return { code: this.reporter(e.name, e.args), prec: 6 };
    }
  }

  private reporter(name: string, args: Expr[]): string {
    const a = args.map((x) => this.expr(x));
    const py = this.py;
    switch (name) {
      case 'RANDOM':
        if (!py) return `Math.floor(Math.random() * ${this.expr(args[0]!, 3)})`;
        this.needs.random = true;
        return `randrange(${a[0]})`;
      case 'REPCOUNT':
        return this.loopVars[this.loopVars.length - 1] ?? 'repcount';
      case 'SQRT':
        if (!py) return `Math.sqrt(${a[0]})`;
        this.needs.math = true;
        return `sqrt(${a[0]})`;
      case 'SIN':
        if (!py) return `Math.sin(${this.expr(args[0]!, 3)} * Math.PI / 180)`;
        this.needs.math = true;
        return `sin(radians(${a[0]}))`;
      case 'COS':
        if (!py) return `Math.cos(${this.expr(args[0]!, 3)} * Math.PI / 180)`;
        this.needs.math = true;
        return `cos(radians(${a[0]}))`;
      case 'HEADING': return 'heading()';
      case 'XCOR': return 'xcor()';
      case 'YCOR': return 'ycor()';
      case 'DISTANCE': return `distance(${a[0]}, ${a[1]})`;
      case 'SENTENCE': return this.sentence(args);
      default: return `${name.toLowerCase()}(${a.join(', ')})`;
    }
  }

  /** SENTENCE "Score: :score becomes f"Score: {score}" in Python and `Score: ${score}` in JavaScript. */
  private sentence(args: Expr[]): string {
    const parts = args.flatMap((e) => (e.kind === 'reporter' && e.name === 'SENTENCE' ? e.args : [e]));
    const pieces = parts.map((e) => {
      if (e.kind === 'word') return e.value.replace(/[{}`$\\]/g, '');
      if (e.kind === 'num') return formatNumber(e.value);
      return this.py ? `{${this.expr(e)}}` : `\${${this.expr(e)}}`;
    });
    return this.py ? `f${quote(pieces.join(' '))}` : `\`${pieces.join(' ')}\``;
  }

  /* ---- output ---- */

  private emitComments(line: number, depth: number): void {
    if (this.emittedCommentLines.has(line)) return;
    this.emittedCommentLines.add(line);
    const mark = this.py ? '#' : '//';
    for (const c of this.commentsAt.get(line) ?? []) this.push(`${mark} ${c.text}`, depth, c.line);
  }

  /** A simple statement, with any note (like the colour name behind a hex code) as a trailing comment. */
  private pushStatement(text: string, depth: number, src: number): void {
    const note = this.pendingNote;
    this.pendingNote = null;
    this.push(note ? `${text}  ${this.py ? '#' : '//'} ${note}` : text, depth, src);
  }

  private push(text: string, depth: number, src?: number): void {
    const indent = this.py ? '    ' : '  ';
    this.lines.push({ text: indent.repeat(depth) + text, src });
  }

  private blank(): void {
    if (this.lines.length && this.lines[this.lines.length - 1]!.text !== '') this.lines.push({ text: '' });
  }
}

export function translate(program: Program, source: string, language: TargetLanguage): Translation {
  return new Translator(program, source, language).translate();
}

export function toText(t: Translation): string {
  return t.lines.map((l) => l.text).join('\n');
}
