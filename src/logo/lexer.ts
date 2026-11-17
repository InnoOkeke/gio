import { LogoError, type SourcePos } from './errors.js';

export type TokenType = 'number' | 'word' | 'quoted' | 'var' | 'lbracket' | 'rbracket' | 'lparen' | 'rparen' | 'op';

export interface Token {
  type: TokenType;
  /** Upper-cased for words, quoted words and variables; the literal text otherwise. */
  text: string;
  /** The text exactly as typed (original case). */
  raw: string;
  value?: number;
  pos: SourcePos;
  /** Whitespace directly before / after this token. Used to read `10 -20` as two numbers. */
  spaceBefore: boolean;
  spaceAfter: boolean;
}

const OPERATORS = new Set(['+', '-', '*', '/', '<', '>', '=']);
const WORD_CHAR = /[A-Za-z0-9_.?]/;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  let sawSpace = true;

  const advance = (): string => {
    const ch = source[i++]!;
    if (ch === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return ch;
  };

  const push = (token: Omit<Token, 'spaceBefore' | 'spaceAfter'>): void => {
    tokens.push({ ...token, spaceBefore: sawSpace, spaceAfter: false });
    sawSpace = false;
  };

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      sawSpace = true;
      const last = tokens[tokens.length - 1];
      if (last) last.spaceAfter = true;
      continue;
    }

    if (ch === ';') {
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }

    const pos: SourcePos = { line, column };

    if (ch === '[') { advance(); push({ type: 'lbracket', text: '[', raw: '[', pos }); continue; }
    if (ch === ']') { advance(); push({ type: 'rbracket', text: ']', raw: ']', pos }); continue; }
    if (ch === '(') { advance(); push({ type: 'lparen', text: '(', raw: '(', pos }); continue; }
    if (ch === ')') { advance(); push({ type: 'rparen', text: ')', raw: ')', pos }); continue; }

    if (OPERATORS.has(ch)) {
      advance();
      push({ type: 'op', text: ch, raw: ch, pos });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let text = '';
      while (i < source.length && /[0-9.]/.test(source[i]!)) text += advance();
      const value = Number(text);
      if (!Number.isFinite(value) || text.split('.').length > 2) {
        throw new LogoError(`"${text}" doesn't look like a number.`, pos);
      }
      push({ type: 'number', text, raw: text, value, pos });
      continue;
    }

    if (ch === '"') {
      advance();
      let text = '';
      while (i < source.length && WORD_CHAR.test(source[i]!)) text += advance();
      if (!text) throw new LogoError('A quote mark (") needs a word right after it, like "red.', pos);
      push({ type: 'quoted', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    if (ch === ':') {
      advance();
      let text = '';
      while (i < source.length && WORD_CHAR.test(source[i]!)) text += advance();
      if (!text) throw new LogoError('A colon (:) needs a name right after it, like :size.', pos);
      push({ type: 'var', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    if (WORD_CHAR.test(ch)) {
      let text = '';
      while (i < source.length && WORD_CHAR.test(source[i]!)) text += advance();
      push({ type: 'word', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    throw new LogoError(`I don't understand the character "${ch}".`, pos);
  }

  const last = tokens[tokens.length - 1];
  if (last) last.spaceAfter = true;
  return tokens;
}
