import { getLocale } from './index.js';
import { messages as english } from './locales/en.js';
import { fillTemplate, LOGO_ERRORS } from './logo-errors.js';
import type { Lang } from './types.js';

/**
 * Sentences that GIO's engine writes in English (Logo errors, quest checker notes, adventure narration and results)
 * shown in the child's language. The engine keeps writing English, so tests, the AI retry loop and saved data never
 * change; the UI turns the English back into its key and parameters by matching the English templates, then renders
 * the same key in the child's language. Text that matches nothing is shown as it is.
 */

interface Pattern {
  key: string;
  source: 'logo' | 'message';
  regex: RegExp;
  names: string[];
  /** Literal characters, so the most specific template wins. */
  weight: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(key: string, template: string, source: Pattern['source']): Pattern {
  const names: string[] = [];
  let body = '';
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    body += escape(template.slice(last, m.index));
    const name = m[1]!;
    body += names.includes(name) ? `\\k<${name}>` : `(?<${name}>[\\s\\S]+?)`;
    if (!names.includes(name)) names.push(name);
    last = m.index! + m[0].length;
  }
  body += escape(template.slice(last));
  return { key, source, regex: new RegExp(`^${body}$`), names, weight: template.replace(/\{\w+\}/g, '').length };
}

let patterns: Pattern[] | null = null;
function allPatterns(): Pattern[] {
  if (patterns) return patterns;
  const list: Pattern[] = Object.entries(LOGO_ERRORS).map(([k, v]) => compile(k, v, 'logo'));
  for (const [k, v] of Object.entries(english)) {
    if (k.startsWith('say.') || k.startsWith('check.')) list.push(compile(k, v, 'message'));
  }
  patterns = list.sort((a, b) => b.weight - a.weight);
  return patterns;
}

function matchWhole(text: string, lang: Lang, depth: number): string | null {
  const locale = getLocale(lang);
  for (const p of allPatterns()) {
    const m = p.regex.exec(text);
    if (!m) continue;
    const template = p.source === 'logo' ? locale.logoErrors[p.key] : (locale.messages as Readonly<Record<string, string>>)[p.key];
    if (!template) return null;
    const params: Record<string, string> = {};
    for (const name of p.names) params[name] = depth < 3 ? translateText(m.groups![name]!, lang, depth + 1) : m.groups![name]!;
    return fillTemplate(template, params);
  }
  return null;
}

/** An engine sentence (or several) in the child's language. English, and text no template knows, come back unchanged. */
export function translateText(text: string, lang: Lang, depth = 0): string {
  if (lang === 'en' || !text) return text;
  const whole = matchWhole(text, lang, depth);
  if (whole !== null) return whole;
  if (depth >= 3) return text;
  // Several sentences: narration joins short ones with ". ", results and notes join full ones with a space.
  // Split after each . ! or ?, keep the separators, and translate the longest run of pieces a template knows.
  const bits = text.split(/([.!?]\s+)/);
  const pieces: { body: string; sep: string }[] = [];
  for (let i = 0; i < bits.length; i += 2) pieces.push({ body: bits[i]!, sep: bits[i + 1] ?? '' });
  let out = '';
  let i = 0;
  while (i < pieces.length) {
    let done = false;
    for (let j = pieces.length - 1; j >= i && !done; j--) {
      const span = pieces.slice(i, j + 1);
      const inner = span.map((p, k) => p.body + (k < span.length - 1 ? p.sep : '')).join('');
      const end = span[span.length - 1]!.sep;
      const punct = end.trim();
      const space = end.slice(punct.length);
      const withPunct = punct ? matchWhole(inner + punct, lang, depth + 1) : null;
      if (withPunct !== null) {
        out += withPunct + space;
        done = true;
      } else if (j > i || pieces.length > 1) {
        const bare = matchWhole(inner, lang, depth + 1);
        if (bare !== null) {
          out += bare + end;
          done = true;
        }
      }
      if (done) i = j + 1;
    }
    if (!done) {
      out += pieces[i]!.body + pieces[i]!.sep;
      i++;
    }
  }
  if (out === text) {
    // One sentence whose template has no final mark ("Gio walks 2 steps.").
    const bare = /^([\s\S]*?)([.!])$/.exec(text);
    const inner = bare ? matchWhole(bare[1]!, lang, depth + 1) : null;
    if (inner !== null) return inner + bare![2];
  }
  return out;
}
