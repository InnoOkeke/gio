import { LogoError, logoError, suggest, type SourcePos } from './errors.js';
import { tokenize, type Token } from './lexer.js';
import { canonical } from './word-table.js';
import { allPrimitiveNames, GAME_KEYS, lookupPrimitive, type GameKey, type PrimitiveSpec } from './primitives.js';

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

/** A command word the parser read, with where it stands and the command it means. localizeSource rewrites these and nothing else. */
export interface ResolvedWord {
  line: number;
  column: number;
  /** The word exactly as typed. */
  raw: string;
  /** The canonical command: FORWARD, REPEAT, IF ... */
  canon: string;
}

/** Optional extras for one parse. Without them the parser behaves exactly as it does in Studio. */
export interface ParseOptions {
  /** Words known only to this parse (the adventure words), keyed by upper-case name. A child's own TO with the same name wins. */
  words?: ReadonlyMap<string, PrimitiveSpec>;
  /** When given, only these canonical words (FORWARD, REPEAT, IF, TO ...) may be used. Anything else is a friendly error. */
  allow?: ReadonlySet<string>;
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
  // First the English TO, then the other languages' TO (POUR, PARA ...), so a name the child
  // defined with TO is never mistaken for the local TO word itself.
  for (const english of [true, false]) {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.type !== 'word') continue;
      if (english ? t.text !== 'TO' : arities.has(t.text) || canonical(t.text, false) !== 'TO') continue;
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
  }
  return arities;
}

class Parser {
  private i = 0;
  readonly resolved: ResolvedWord[] = [];

  constructor(
    private readonly tokens: Token[],
    private readonly arities: Map<string, number>,
    private readonly options: ParseOptions = {},
  ) {}

  private lookup(name: string): PrimitiveSpec | undefined {
    return this.options.words?.get(name.toUpperCase()) ?? lookupPrimitive(name);
  }

  /** A word added after programs were saved: the program's own TO of the same name keeps its meaning. */
  private isLate(name: string): boolean {
    return LATE_WORDS.has(name) || (this.options.words?.has(name) ?? false);
  }

  /** What a word means: its canonical command, unless the program teaches its own command with that name. */
  private canon(t: Token): string {
    return canonical(t.text, this.arities.has(t.text));
  }

  private note(t: Token, canon: string): void {
    this.resolved.push({ line: t.pos.line, column: t.pos.column, raw: t.raw, canon });
  }

  private gate(word: string, pos: SourcePos): void {
    const allow = this.options.allow;
    if (!allow || allow.has(word)) return;
    throw logoError('parse.gate', { word, words: [...allow].join(', ') }, pos);
  }

  parseProgram(): Program {
    const procedures = new Map<string, Procedure>();
    const main: Stmt[] = [];
    while (!this.atEnd()) {
      const t = this.peek()!;
      if (t.type === 'word' && this.canon(t) === 'TO') {
        this.note(t, 'TO');
        this.gate('TO', t.pos);
        const proc = this.parseProcedure();
        if (procedures.has(proc.name)) {
          throw logoError('parse.twice', { name: proc.name }, proc.pos);
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
      throw logoError('parse.toName', {}, toTok.pos);
    }
    this.next();
    const name = nameTok.text;
    this.rejectDashedName(nameTok);
    if (RESERVED.has(name) || (this.lookup(name) && !this.isLate(name))) {
      throw logoError('parse.isWord', { name }, nameTok.pos);
    }
    const params: string[] = [];
    while (this.peek()?.type === 'var') params.push(this.next()!.text);

    const body: Stmt[] = [];
    for (;;) {
      const t = this.peek();
      if (!t) throw logoError('parse.noEnd', { name }, toTok.pos);
      if (t.type === 'word' && this.canon(t) === 'END') {
        this.note(t, 'END');
        this.next();
        break;
      }
      if (t.type === 'word' && this.canon(t) === 'TO') {
        throw logoError('parse.endBefore', { name }, t.pos);
      }
      body.push(this.parseStatement());
    }
    return { name, params, body, pos: toTok.pos };
  }

  private parseBlock(owner: string, ownerPos: SourcePos): Stmt[] {
    const open = this.peek();
    if (!open || open.type !== 'lbracket') {
      throw logoError('parse.list', { owner }, open?.pos ?? ownerPos);
    }
    this.next();
    const body: Stmt[] = [];
    for (;;) {
      const t = this.peek();
      if (!t) throw logoError('parse.listClose', { owner }, open.pos);
      if (t.type === 'rbracket') {
        this.next();
        return body;
      }
      body.push(this.parseStatement());
    }
  }

  private parseStatement(): Stmt {
    const t = this.next()!;

    if (t.type === 'rbracket') throw logoError('parse.strayClose', {}, t.pos);
    const strayNumber = t.type === 'number' || (t.type === 'op' && t.text === '-' && this.peek()?.type === 'number');
    if (strayNumber) {
      const shown = t.type === 'number' ? t.raw : `-${this.peek()!.raw}`;
      throw logoError('parse.extraNumber', { shown }, t.pos);
    }
    if (t.type !== 'word') {
      throw logoError('parse.unexpected', { text: t.text }, t.pos);
    }

    const c = this.canon(t);
    if (RESERVED.has(c)) this.note(t, c);
    switch (c) {
      case 'TO':
        throw logoError('parse.toNested', {}, t.pos);
      case 'END':
        throw logoError('parse.endAlone', {}, t.pos);
      case 'REPEAT': {
        this.gate('REPEAT', t.pos);
        const count = this.parseExpression('REPEAT', t.pos);
        return { kind: 'repeat', count, body: this.parseBlock('REPEAT', t.pos), pos: t.pos };
      }
      case 'IF': {
        this.gate('IF', t.pos);
        const cond = this.parseExpression('IF', t.pos);
        return { kind: 'if', cond, then: this.parseBlock('IF', t.pos), otherwise: null, pos: t.pos };
      }
      case 'IFELSE': {
        this.gate('IFELSE', t.pos);
        const cond = this.parseExpression('IFELSE', t.pos);
        const then = this.parseBlock('IFELSE', t.pos);
        return { kind: 'if', cond, then, otherwise: this.parseBlock('IFELSE', t.pos), pos: t.pos };
      }
      case 'MAKE': {
        this.gate('MAKE', t.pos);
        const nameTok = this.peek();
        if (!nameTok || nameTok.type !== 'quoted') {
          throw logoError('parse.make', {}, nameTok?.pos ?? t.pos);
        }
        this.next();
        return { kind: 'make', name: nameTok.text, value: this.parseExpression('MAKE', t.pos), pos: t.pos };
      }
      case 'WHEN': {
        this.gate('WHEN', t.pos);
        const keyTok = this.peek();
        const key = keyTok?.type === 'quoted' ? keyTok.text : '';
        if (!(GAME_KEYS as readonly string[]).includes(key)) {
          throw logoError('parse.when', {}, keyTok?.pos ?? t.pos);
        }
        this.next();
        return { kind: 'when', key: key as GameKey, body: this.parseBlock('WHEN', t.pos), pos: t.pos };
      }
      case 'STOP':
        this.gate('STOP', t.pos);
        return { kind: 'stop', pos: t.pos };
    }

    const prim = this.isLate(c) && this.arities.has(t.text) ? undefined : this.lookup(c);
    if (prim) {
      this.note(t, prim.name);
      this.gate(prim.name, t.pos);
      if (prim.kind === 'reporter') {
        throw logoError('parse.reporter', { name: prim.name, example: prim.arity ? ' 100' : '' }, t.pos);
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
      throw logoError('parse.dash', { first: t.text, second: rest.text }, t.pos);
    }
  }

  private unknownWord(t: Token): LogoError {
    const dash = this.peek();
    const rest = this.tokens[this.i + 1];
    if (dash?.type === 'op' && dash.text === '-' && !dash.spaceBefore && !dash.spaceAfter && rest?.type === 'word') {
      return logoError('parse.dash', { first: t.text, second: rest.text }, t.pos);
    }
    const glued = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(t.text);
    if (glued && (this.lookup(canonical(glued[1]!, this.arities.has(glued[1]!))) || this.arities.has(glued[1]!))) {
      return logoError('parse.glued', { word: glued[1]!, n: glued[2]! }, t.pos);
    }
    const hint = suggest(t.text, [...allPrimitiveNames(), ...(this.options.words?.keys() ?? []), ...this.arities.keys()]);
    return (hint ? logoError('parse.unknownHint', { word: t.text, hint }, t.pos) : logoError('parse.unknown', { word: t.text }, t.pos));
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
    if (!t) throw logoError('parse.moreInputs', { owner }, ownerPos);

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
        if (!close || close.type !== 'rparen') throw logoError('parse.paren', {}, t.pos);
        return inner;
      }
      case 'lbracket':
        return this.parseLiteralList();
      case 'word': {
        const c = this.canon(t);
        const prim = this.isLate(c) && this.arities.has(t.text) ? undefined : this.lookup(c);
        if (prim?.kind === 'reporter') {
          this.note(t, prim.name);
          this.gate(prim.name, t.pos);
          this.next();
          // A reporter's inputs stop before a comparison, so DISTANCE :x :y < 15 compares the distance.
          const args: Expr[] = [];
          for (let k = 0; k < prim.arity; k++) args.push(this.parseAdditive(prim.name, t.pos));
          return { kind: 'reporter', name: prim.name, args, pos: t.pos };
        }
        if (prim || RESERVED.has(c) || this.arities.has(t.text)) {
          throw logoError('parse.inputBefore', { owner, word: t.text }, t.pos);
        }
        throw this.unknownWord(t);
      }
      case 'rbracket':
        throw logoError('parse.inputBeforeClose', { owner }, t.pos);
      default:
        throw logoError('parse.inputFound', { owner, text: t.text }, t.pos);
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
      if (!n) throw logoError('parse.listOpen', {}, open.pos);
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

/** Parse, and also return the command words the parser resolved, with their positions. */
export function parseWithWords(source: string, options: ParseOptions = {}): { program: Program; words: ResolvedWord[] } {
  const tokens = tokenize(source);
  const parser = new Parser(tokens, collectSignatures(tokens), options);
  const program = parser.parseProgram();
  return { program, words: parser.resolved };
}

export function parse(source: string, options: ParseOptions = {}): Program {
  return parseWithWords(source, options).program;
}
