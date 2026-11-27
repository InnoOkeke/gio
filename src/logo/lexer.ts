import { logoError, type SourcePos } from './errors.js';
import { foldWord } from './word-table.js';

export type TokenType = 'number' | 'word' | 'quoted' | 'var' | 'lbracket' | 'rbracket' | 'lparen' | 'rparen' | 'op';

export interface Token {
  type: TokenType;
  /** Upper-cased for words, quoted words and variables; the literal text otherwise. */
  text: string;
  /** The text exactly as typed (original case). */
  raw: string;
  /** Upper-case with accents removed: used only to look a word up in the language tables. */
  folded: string;
  value?: number;
  pos: SourcePos;
  /** Whitespace directly before / after this token. Used to read `10 -20` as two numbers. */
  spaceBefore: boolean;
  spaceAfter: boolean;
}

const OPERATORS = new Set(['+', '-', '*', '/', '<', '>', '=']);
/** Letters, digits and the punctuation kids put in messages (\"You win!\", \"Let's go,\"). */
const WORD_CHAR = /[\p{L}0-9_.?!,'&@#]/u;

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

  const push = (token: Omit<Token, 'spaceBefore' | 'spaceAfter' | 'folded'>): void => {
    tokens.push({ ...token, folded: foldWord(token.text), spaceBefore: sawSpace, spaceAfter: false });
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
      const two = ch + (source[i + 1] ?? '');
      if (two === '<=' || two === '>=' || two === '<>') {
        advance();
        advance();
        push({ type: 'op', text: two, raw: two, pos });
        continue;
      }
      advance();
      push({ type: 'op', text: ch, raw: ch, pos });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let text = '';
      while (i < source.length && /[0-9.]/.test(source[i]!)) text += advance();
      const value = Number(text);
      if (!Number.isFinite(value) || text.split('.').length > 2) {
        throw logoError('lex.number', { text }, pos);
      }
      push({ type: 'number', text, raw: text, value, pos });
      continue;
    }

    if (ch === '"') {
      advance();
      let text = '';
      // A quoted word runs to the next space or bracket, so "Score: works as a label.
      while (i < source.length && (WORD_CHAR.test(source[i]!) || (text && source[i] === ':'))) text += advance();
      if (!text) throw logoError('lex.quote', {}, pos);
      push({ type: 'quoted', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    if (ch === ':') {
      advance();
      let text = '';
      while (i < source.length && WORD_CHAR.test(source[i]!)) text += advance();
      if (!text) throw logoError('lex.colon', {}, pos);
      push({ type: 'var', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    if (WORD_CHAR.test(ch)) {
      let text = '';
      while (i < source.length && WORD_CHAR.test(source[i]!)) text += advance();
      push({ type: 'word', text: text.toUpperCase(), raw: text, pos });
      continue;
    }

    throw logoError('lex.char', { ch }, pos);
  }

  const last = tokens[tokens.length - 1];
  if (last) last.spaceAfter = true;
  return tokens;
}
