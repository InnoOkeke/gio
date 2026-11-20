/**
 * The keys of the on-screen command row, in order. Command words start their own line like the
 * command shelf does; numbers and brackets are typed inline so "FD", "5", "0" reads FD 50.
 */
export interface KeyRowKey {
  id: string;
  label: string;
  /** word: LogoEditor.insert (own line); inline: typed at the caret; run: the Run key, no text. */
  kind: 'word' | 'inline' | 'run';
  /** Text inserted at the caret; absent for the Run key. */
  insert?: string;
  hint: string;
}

const word = (label: string, hint: string): KeyRowKey => ({ id: label, label, kind: 'word', insert: label, hint });
const inline = (label: string, hint: string, insert = label): KeyRowKey => ({ id: label, label, kind: 'inline', insert, hint });

export const KEY_ROW: KeyRowKey[] = [
  word('FD', 'forward'),
  word('BK', 'back'),
  word('RT', 'turn right'),
  word('LT', 'turn left'),
  word('REPEAT', 'repeat the commands inside the brackets'),
  inline('[ ]', 'brackets'),
  ...'0123456789'.split('').map((d) => inline(d, `digit ${d}`)),
  inline('45', 'a number'),
  inline('90', 'a number'),
  word('PU', 'pen up'),
  word('PD', 'pen down'),
  { id: 'run', label: 'Run', kind: 'run', hint: 'run the program' },
];

/** REPEAT as a word key types a whole REPEAT with the caret between its brackets. */
export const REPEAT_SNIPPET = 'REPEAT 4 [ ]';

/** The snippet a word key hands to LogoEditor.insert. */
export function wordSnippet(key: KeyRowKey): string {
  return key.id === 'REPEAT' ? REPEAT_SNIPPET : (key.insert ?? '');
}

/**
 * Inline typing: join digits to digits, otherwise separate from the previous word with a space.
 * `prev` is the character before the caret ('' at the start of the document).
 * `caret` is the offset inside the returned text, between the brackets for `[ ]`.
 */
export function inlineInsertion(insert: string, prev: string): { text: string; caret: number } {
  const digits = /^\d+$/.test(insert);
  const joins = prev === '' || prev === ' ' || prev === '\n' || prev === '[' || (digits && /\d/.test(prev));
  const text = `${joins ? '' : ' '}${insert}`;
  return { text, caret: insert === '[ ]' ? text.length - 2 : text.length };
}

/**
 * What LogoEditor.insert writes for a snippet at the caret: a space before it unless the caret is
 * at the start of a line or on an empty line, a new line when the caret is at the end of a line,
 * and the caret between the brackets for a snippet that ends in [ ].
 */
export function keyInsertion(insert: string, line: { text: string; atStart: boolean; atEnd: boolean }): { text: string; caret: number } {
  const empty = line.text.trim() === '';
  const before = empty || line.atStart ? '' : line.atEnd ? '\n' : ' ';
  const text = `${before}${insert}`;
  return { text, caret: insert.endsWith('[ ]') ? text.length - 2 : text.length };
}
