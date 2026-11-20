import { describe, expect, it } from 'vitest';
import { inlineInsertion, KEY_ROW, keyInsertion, wordSnippet } from '../src/ui/editor/key-row';

describe('KEY_ROW', () => {
  it('has the agreed keys in order', () => {
    expect(KEY_ROW.map((k) => k.label)).toEqual(['FD', 'BK', 'RT', 'LT', 'REPEAT', '[ ]', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '45', '90', 'PU', 'PD', 'Run']);
    expect(KEY_ROW.at(-1)?.kind).toBe('run');
  });
});

describe('inserting from keys', () => {
  it('REPEAT leaves the caret inside the brackets', () => {
    const repeat = KEY_ROW.find((k) => k.id === 'REPEAT')!;
    const snippet = wordSnippet(repeat);
    expect(snippet).toBe('REPEAT 4 [ ]');
    const r = keyInsertion(snippet, { text: '', atStart: true, atEnd: true });
    expect(r.text).toBe('REPEAT 4 [ ]');
    expect(r.text.slice(0, r.caret)).toBe('REPEAT 4 [');
    expect(r.text.slice(r.caret)).toBe(' ]');
  });

  it('[ ] ends with the caret between the brackets', () => {
    const r = inlineInsertion('[ ]', ' ');
    expect(r.text).toBe('[ ]');
    expect(r.text.slice(0, r.caret)).toBe('[');
    expect(r.text.slice(r.caret)).toBe(' ]');
    expect(inlineInsertion('[ ]', '4').text).toBe(' [ ]');
  });

  it('digits join digits but separate from words', () => {
    expect(inlineInsertion('5', 'D').text).toBe(' 5');
    expect(inlineInsertion('0', '5').text).toBe('0');
    expect(inlineInsertion('90', ' ').text).toBe('90');
    expect(inlineInsertion('9', '').text).toBe('9');
  });

  it('a word key starts a new line after existing text, like the shelf', () => {
    expect(keyInsertion('FD', { text: 'FD 50', atStart: false, atEnd: true }).text).toBe('\nFD');
    expect(keyInsertion('FD', { text: 'FD 50', atStart: false, atEnd: false }).text).toBe(' FD');
  });
});
