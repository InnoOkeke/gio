import type { Lang } from '../i18n/types.js';
import { parseWithWords } from './parser.js';
import { wordEntry, wordIn } from './word-table.js';

export { canonical, foldWord, LOCAL_WORDS, wordsFor, wordIn } from './word-table.js';

/**
 * Rewrite a program's command words into one language. Only the word positions the parser resolved
 * are touched, so lists, quoted words, comments and the child's own names stay exactly as typed.
 * A short form stays short (FD becomes AV). A program that does not parse is returned unchanged.
 */
export function localizeSource(code: string, lang: Lang): string {
  let words;
  try {
    words = parseWithWords(code).words;
  } catch {
    return code;
  }
  if (!words.length) return code;
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') starts.push(i + 1);
  let out = '';
  let at = 0;
  const sorted = [...words].sort((a, b) => a.line - b.line || a.column - b.column);
  for (const w of sorted) {
    const from = (starts[w.line - 1] ?? 0) + (w.column - 1);
    if (from < at || code.slice(from, from + w.raw.length) !== w.raw) continue;
    out += code.slice(at, from) + wordIn(lang, w.canon, (wordEntry(w.raw)?.index ?? 0) > 0);
    at = from + w.raw.length;
  }
  return out + code.slice(at);
}
