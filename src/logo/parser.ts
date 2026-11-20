import { LogoError, suggest, type SourcePos } from './errors.js';
import { tokenize, type Token } from './lexer.js';
import { allPrimitiveNames, GAME_KEYS, lookupPrimitive, type GameKey } from './primitives.js';

export type Expr =
  | { kind: 'num'; value: number; pos: SourcePos }
  | { kind: 'word'; value: string; pos: SourcePos }
  | { kind: 'var'; name: string; pos: SourcePos }
  | { kind: 'list'; items: Expr[]; pos: SourcePos }
  | { kind: 'neg'; expr: Expr; pos: SourcePos }
  | { kind: 'bin'; op: string; left: Expr; right: Expr; pos: SourcePos }
  | { kind: 'reporter'; name: string; args: Expr[]; pos: SourcePos };

export type Stmt =
  | { kind: 'command'; name: string; args: Expr[]; pos: SourcePos }
  | { kind: 'call'; name: string; args: Expr[]; pos: SourcePos }
  | { kind: 'repeat'; count: Expr; body: Stmt[]; pos: SourcePos }
  | { kind: 'if'; cond: Expr; then: Stmt[]; otherwise: Stmt[] | null; pos: SourcePos }
  | { kind: 'make'; name: string; value: Expr; pos: SourcePos }
  | { kind: 'when'; key: GameKey; body: Stmt[]; pos: SourcePos }
  | { kind: 'stop'; pos: SourcePos };

export interface Procedure {
  name: string;
  params: string[];
  body: Stmt[];
  pos: SourcePos;
}

export interface Program {
  procedures: Map<string, Procedure>;
  main: Stmt[];
}

const RESERVED = new Set(['TO', 'END', 'REPEAT', 'IF', 'IFELSE', 'MAKE', 'STOP', 'WHEN']);

/** Words added after programs were already being saved. A program that teaches its own TO FRAME keeps meaning its own FRAME. */
const LATE_WORDS = new Set(['PLAY', 'SETTEMPO', 'WAIT', 'FRAME']);

/**
 * Logo procedure calls take a fixed number of inputs, so the parser needs every
 * procedure's arity before it can read a call. A first pass collects `TO name :a :b` headers.
 */
function collectSignatures(tokens: Token[]): Map<string, number> {
  const arities = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== 'word' || t.text !== 'TO') continue;
    const nameTok = tokens[i + 1];
    if (!nameTok || nameTok.type !== 'word') continue;
    let count = 0;
    let j = i + 2;
    while (tokens[j]?.type === 'var') {
      count++;
      j++;
    }
    arities.set(nameTok.text, count);
  }
  return arities;
}

class Parser {
  private i = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly arities: Map<string, number>,
  ) {}

  parseProgram(): Program {
    const procedures = new Map<string, Procedure>();
    const main: Stmt[] = [];
    while (!this.atEnd()) {
      const t = this.peek()!;
      if (t.type === 'word' && t.text === 'TO') {
        const proc = this.parseProcedure();
        if (procedures.has(proc.name)) {
          throw new LogoError(`You taught me ${proc.name} twice. Give the second one a different name.`, proc.pos);
        }
        procedures.set(proc.name, proc);
      } else {
        main.push(this.parseStatement());
      }
    }
    return { procedures, main };
  }

  private parseProcedure(): Procedure {
    const toTok = this.next()!;
    const nameTok = this.peek();
    if (!nameTok || nameTok.type !== 'word') {
      throw new LogoError('TO needs a name for your new command, like TO SQUARE.', toTok.pos);
    }
    this.next();
    const name = nameTok.text;
    this.rejectDashedName(nameTok);
    if (RESERVED.has(name) || (lookupPrimitive(name) && !LATE_WORDS.has(name))) {
      throw new LogoError(`${name} is already a Logo word. Pick a different name for your command.`, nameTok.pos);
    }
    const params: string[] = [];
    while (this.peek()?.type === 'var') params.push(this.next()!.text);

    const body: Stmt[] = [];
    for (;;) {
      const t = this.peek();
      if (!t) throw new LogoError(`TO ${name} needs an END to finish it.`, toTok.pos);
      if (t.type === 'word' && t.text === 'END') {
        this.next();
        break;
      }
      if (t.type === 'word' && t.text === 'TO') {
        throw new LogoError(`TO ${name} needs an END before you start teaching another command.`, t.pos);
      }
      body.push(this.parseStatement());
    }
    return { name, params, body, pos: toTok.pos };
  }

  private parseBlock(owner: string, ownerPos: SourcePos): Stmt[] {
    const open = this.peek();
    if (!open || open.type !== 'lbracket') {
      throw new LogoError(`${owner} needs a list of commands in square brackets, like [FD 50 RT 90].`, open?.pos ?? ownerPos);
    }
    this.next();
    const body: Stmt[] = [];
    for (;;) {
      const t = this.peek();
      if (!t) throw new LogoError(`The [ after ${owner} needs a matching ] to close it.`, open.pos);
      if (t.type === 'rbracket') {
        this.next();
        return body;
      }
      body.push(this.parseStatement());
    }
  }

  private parseStatement(): Stmt {
    const t = this.next()!;

    if (t.type === 'rbracket') throw new LogoError('There is a ] without a matching [.', t.pos);
    const strayNumber = t.type === 'number' || (t.type === 'op' && t.text === '-' && this.peek()?.type === 'number');
    if (strayNumber) {
      const shown = t.type === 'number' ? t.raw : `-${this.peek()!.raw}`;
      throw new LogoError(
        `There's an extra number here (${shown}) with no command to use it. Check that the command before it has the right number of inputs.`,
        t.pos,
      );
    }
    if (t.type !== 'word') {
      throw new LogoError(`I wasn't expecting "${t.text}" here. Lines should start with a command, like FD or REPEAT.`, t.pos);
    }

    switch (t.text) {
      case 'TO':
        throw new LogoError('TO can only be used at the top level, not inside another command.', t.pos);
      case 'END':
        throw new LogoError('There is an END without a TO before it.', t.pos);
      case 'REPEAT': {
        const count = this.parseExpression('REPEAT', t.pos);
        return { kind: 'repeat', count, body: this.parseBlock('REPEAT', t.pos), pos: t.pos };
      }
      case 'IF': {
        const cond = this.parseExpression('IF', t.pos);
        return { kind: 'if', cond, then: this.parseBlock('IF', t.pos), otherwise: null, pos: t.pos };
      }
      case 'IFELSE': {
        const cond = this.parseExpression('IFELSE', t.pos);
        const then = this.parseBlock('IFELSE', t.pos);
        return { kind: 'if', cond, then, otherwise: this.parseBlock('IFELSE', t.pos), pos: t.pos };
      }
      case 'MAKE': {
        const nameTok = this.peek();
        if (!nameTok || nameTok.type !== 'quoted') {
          throw new LogoError('MAKE needs a name with a quote mark, like MAKE "size 50.', nameTok?.pos ?? t.pos);
        }
        this.next();
        return { kind: 'make', name: nameTok.text, value: this.parseExpression('MAKE', t.pos), pos: t.pos };
      }
      case 'WHEN': {
        const keyTok = this.peek();
        const key = keyTok?.type === 'quoted' ? keyTok.text : '';
        if (!(GAME_KEYS as readonly string[]).includes(key)) {
          throw new LogoError('WHEN needs a key: "up, "down, "left, "right or "space, like WHEN "up [FD 10]. Or use WHEN "tick to do something 10 times a second.', keyTok?.pos ?? t.pos);
        }
        this.next();
        return { kind: 'when', key: key as GameKey, body: this.parseBlock('WHEN', t.pos), pos: t.pos };
      }
      case 'STOP':
        return { kind: 'stop', pos: t.pos };
    }

    const prim = LATE_WORDS.has(t.text) && this.arities.has(t.text) ? undefined : lookupPrimitive(t.text);
    if (prim) {
      if (prim.kind === 'reporter') {
        throw new LogoError(`${prim.name} gives back a value. Use it inside a command, like FD ${prim.name}${prim.arity ? ' 100' : ''}.`, t.pos);
      }
      return { kind: 'command', name: prim.name, args: this.parseArgs(prim.name, prim.arity, t.pos), pos: t.pos };
    }

    const arity = this.arities.get(t.text);
    if (arity !== undefined) {
      return { kind: 'call', name: t.text, args: this.parseArgs(t.text, arity, t.pos), pos: t.pos };
    }

    throw this.unknownWord(t);
  }

  /** `DRAW-CIRCLE` reads as DRAW minus CIRCLE, so explain that names can't contain a dash. */
  private rejectDashedName(t: Token): void {
    const dash = this.peek();
    const rest = this.tokens[this.i + 1];
    if (dash?.type === 'op' && dash.text === '-' && !dash.spaceBefore && !dash.spaceAfter && rest?.type === 'word') {
      throw new LogoError(`Names can't have a dash (-) in them, because - means minus. Try ${t.text}_${rest.text} instead.`, t.pos);
    }
  }

  private unknownWord(t: Token): LogoError {
    const dash = this.peek();
    const rest = this.tokens[this.i + 1];
    if (dash?.type === 'op' && dash.text === '-' && !dash.spaceBefore && !dash.spaceAfter && rest?.type === 'word') {
      return new LogoError(`Names can't have a dash (-) in them, because - means minus. Try ${t.text}_${rest.text} instead.`, t.pos);
    }
    const glued = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(t.text);
    if (glued && (lookupPrimitive(glued[1]!) || this.arities.has(glued[1]!))) {
      return new LogoError(`Put a space between ${glued[1]} and ${glued[2]}, like ${glued[1]} ${glued[2]}.`, t.pos);
    }
    const hint = suggest(t.text, [...allPrimitiveNames(), ...this.arities.keys()]);
    return new LogoError(
      hint ? `I don't know how to ${t.text}. Did you mean ${hint}?` : `I don't know how to ${t.text}. You can teach me with TO ${t.text} … END.`,
      t.pos,
    );
  }

  private parseArgs(owner: string, arity: number, ownerPos: SourcePos): Expr[] {
    const args: Expr[] = [];
    for (let k = 0; k < arity; k++) args.push(this.parseExpression(owner, ownerPos));
    return args;
  }

  parseExpression(owner: string, ownerPos: SourcePos): Expr {
    return this.parseComparison(owner, ownerPos);
  }

  private parseComparison(owner: string, ownerPos: SourcePos): Expr {
    let left = this.parseAdditive(owner, ownerPos);
    for (;;) {
      const t = this.peek();
      if (t?.type !== 'op' || !['<', '>', '=', '<=', '>=', '<>'].includes(t.text)) return left;
      this.next();
      const right = this.parseAdditive(owner, ownerPos);
      left = { kind: 'bin', op: t.text, left, right, pos: t.pos };
    }
  }

  private parseAdditive(owner: string, ownerPos: SourcePos): Expr {
    let left = this.parseMultiplicative(owner, ownerPos);
    for (;;) {
      const t = this.peek();
      if (t?.type !== 'op' || (t.text !== '+' && t.text !== '-')) return left;
      // `SETXY 10 -20`: a minus with a space before it and none after starts a new number.
      if (t.text === '-' && t.spaceBefore && !t.spaceAfter) return left;
      this.next();
      const right = this.parseMultiplicative(owner, ownerPos);
      left = { kind: 'bin', op: t.text, left, right, pos: t.pos };
    }
  }

  private parseMultiplicative(owner: string, ownerPos: SourcePos): Expr {
    let left = this.parseUnary(owner, ownerPos);
    for (;;) {
      const t = this.peek();
      if (t?.type !== 'op' || (t.text !== '*' && t.text !== '/')) return left;
      this.next();
      const right = this.parseUnary(owner, ownerPos);
      left = { kind: 'bin', op: t.text, left, right, pos: t.pos };
    }
  }

  private parseUnary(owner: string, ownerPos: SourcePos): Expr {
    const t = this.peek();
    if (t?.type === 'op' && t.text === '-') {
      this.next();
      return { kind: 'neg', expr: this.parseUnary(owner, ownerPos), pos: t.pos };
    }
    return this.parsePrimary(owner, ownerPos);
  }

  private parsePrimary(owner: string, ownerPos: SourcePos): Expr {
    const t = this.peek();
    if (!t) throw new LogoError(`${owner} needs more inputs.`, ownerPos);

    switch (t.type) {
      case 'number':
        this.next();
        return { kind: 'num', value: t.value!, pos: t.pos };
      case 'quoted':
        this.next();
        return { kind: 'word', value: t.raw, pos: t.pos };
      case 'var':
        this.next();
        return { kind: 'var', name: t.text, pos: t.pos };
      case 'lparen': {
        this.next();
        const inner = this.parseExpression(owner, ownerPos);
        const close = this.next();
        if (!close || close.type !== 'rparen') throw new LogoError('The ( needs a matching ) to close it.', t.pos);
        return inner;
      }
      case 'lbracket':
        return this.parseLiteralList();
      case 'word': {
        const prim = lookupPrimitive(t.text);
        if (prim?.kind === 'reporter') {
          this.next();
          // A reporter's inputs stop before a comparison, so DISTANCE :x :y < 15 compares the distance.
          const args: Expr[] = [];
          for (let k = 0; k < prim.arity; k++) args.push(this.parseAdditive(prim.name, t.pos));
          return { kind: 'reporter', name: prim.name, args, pos: t.pos };
        }
        if (prim || RESERVED.has(t.text) || this.arities.has(t.text)) {
          throw new LogoError(`${owner} needs an input before ${t.text}. Try something like ${owner} 50.`, t.pos);
        }
        throw this.unknownWord(t);
      }
      case 'rbracket':
        throw new LogoError(`${owner} needs an input before the ].`, t.pos);
      default:
        throw new LogoError(`${owner} needs an input, but found "${t.text}".`, t.pos);
    }
  }

  /**
   * In Logo, [ ] in an input is a literal list: its contents are data, not commands.
   * `PRINT [Hello there]` prints the words; `SETPENCOLOR [255 0 0]` gets three numbers.
   */
  private parseLiteralList(): Expr {
    const open = this.next()!;
    const items: Expr[] = [];
    for (;;) {
      const n = this.peek();
      if (!n) throw new LogoError('The [ needs a matching ] to close it.', open.pos);
      if (n.type === 'rbracket') {
        this.next();
        return { kind: 'list', items, pos: open.pos };
      }
      if (n.type === 'lbracket') {
        items.push(this.parseLiteralList());
        continue;
      }
      this.next();
      if (n.type === 'number') {
        items.push({ kind: 'num', value: n.value!, pos: n.pos });
      } else if (n.type === 'op' && n.text === '-' && this.peek()?.type === 'number' && !n.spaceAfter) {
        const num = this.next()!;
        items.push({ kind: 'num', value: -num.value!, pos: n.pos });
      } else {
        items.push({ kind: 'word', value: n.type === 'quoted' ? `"${n.raw}` : n.type === 'var' ? `:${n.raw}` : n.raw, pos: n.pos });
      }
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private next(): Token | undefined {
    return this.tokens[this.i++];
  }

  private atEnd(): boolean {
    return this.i >= this.tokens.length;
  }
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  return new Parser(tokens, collectSignatures(tokens)).parseProgram();
}
