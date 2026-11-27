import { getLocale, type Lang } from '../../src/i18n/index.js';
import { messages as en } from '../../src/i18n/locales/en.js';
import { wordIn } from '../../src/logo/word-table.js';
import { QUESTS } from '../../src/logo/quests.js';
import { ALL_ISLANDS } from '../../src/ui/path/islands.js';
import { REALMS } from '../../src/ui/adventure/realms.js';

/** English short Logo words a script may name, and their canonical command. */
const SHORT: Record<string, string> = { FD: 'FORWARD', BK: 'BACK', RT: 'RIGHT', LT: 'LEFT', PU: 'PENUP', PD: 'PENDOWN' };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** English phrase -> the same phrase in a language: plain messages, quest titles, stage and world names. */
const phraseCache = new Map<Lang, [string, string][]>();
function phrases(lang: Lang): [string, string][] {
  const hit = phraseCache.get(lang);
  if (hit) return hit;
  const locale = getLocale(lang);
  const local = locale.messages as Readonly<Record<string, string>>;
  const out: [string, string][] = [];
  for (const [key, english] of Object.entries(en as Readonly<Record<string, string>>)) {
    if (!english.includes('{') && english.trim().length >= 2 && local[key]) out.push([english, local[key]!]);
  }
  for (const q of QUESTS) if (locale.content.quests[q.id]) out.push([q.title, locale.content.quests[q.id]!.title]);
  for (const r of Object.values(REALMS)) out.push([r.name, locale.content.adventure[`realm.${r.id}.name`] ?? r.name]);
  for (const i of ALL_ISLANDS) out.push([i.name, locale.content.stages[i.key]?.name ?? i.name]);
  out.sort((a, b) => b[0].length - a[0].length);
  phraseCache.set(lang, out);
  return out;
}

/** Templates with {markers}, as regular expressions over English text. */
type Template = { regex: RegExp; names: string[]; local: string; head: string; localHead: string };
const templateCache = new Map<Lang, Template[]>();
function templates(lang: Lang): Template[] {
  const hit = templateCache.get(lang);
  if (hit) return hit;
  const local = getLocale(lang).messages as Readonly<Record<string, string>>;
  const out: Template[] = [];
  for (const [key, english] of Object.entries(en as Readonly<Record<string, string>>)) {
    if (!english.includes('{') || !local[key]) continue;
    const names: string[] = [];
    const body = english.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (names.push(part), '(.+?)') : escape(part))).join('');
    out.push({ regex: new RegExp(`^${body}$`), names, local: local[key]!, head: english.split('{')[0]!, localHead: local[key]!.split('{')[0]! });
  }
  templateCache.set(lang, out);
  return out;
}

function translateWhole(text: string, lang: Lang, depth = 0): string | null {
  for (const [english, local] of phrases(lang)) if (english === text) return local;
  if (depth > 2) return null;
  for (const t of templates(lang)) {
    const m = t.regex.exec(text);
    if (!m) continue;
    let out = t.local;
    t.names.forEach((name, i) => {
      const part = m[i + 1]!;
      out = out.split(`{${name}}`).join(translateWhole(part, lang, depth + 1) ?? part);
    });
    return out;
  }
  return null;
}

/**
 * The screen scripts name buttons by their English text. With LANG=fr (or es, pcm) the same buttons carry the
 * French text, so a click looks for the English text and for the same words in the chosen language. A text that
 * is the start of a message ("Speed" in "Speed: {speed}. Tap to change") maps to the start of the translated one,
 * and Logo short words (FD, RT ...) become that language's words.
 */
export function textsFor(text: string, lang: Lang): string[] {
  if (!text || lang === 'en') return [text];
  const out = new Set<string>([text]);
  const whole = translateWhole(text, lang);
  if (whole) out.add(whole);
  for (const t of templates(lang)) {
    if (t.head.length >= 4 && text.startsWith(t.head) && t.localHead.trim()) out.add(text === t.head ? t.localHead.trimEnd() : t.localHead + text.slice(t.head.length));
  }
  for (const value of [...out]) {
    const words = value.replace(/\b(FD|BK|RT|LT|PU|PD)\b/g, (w) => wordIn(lang, SHORT[w]!, true));
    out.add(words);
  }
  return [...out];
}

/** Turns `[aria-label="X"]` and `[aria-label^="X"]` in a page script into `:is(...)` over X and its translations. */
export function rewriteScript(expr: string, lang: Lang): string {
  if (lang === 'en') return expr;
  return expr.replace(/\[aria-label(\^?)=\\?"((?:[^"\\]|\\\\.|\\')*)\\?"\]/g, (whole, op: string, raw: string) => {
    const value = raw.replace(/\\\\'/g, "'").replace(/\\'/g, "'");
    const alts = textsFor(value, lang).filter((t) => !/["'\\]/.test(t));
    if (alts.length < 2) return whole;
    const quote = whole.includes('\\"') ? '\\"' : '"';
    return `:is(${[raw, ...alts.slice(1)].map((t) => `[aria-label${op}=${quote}${t}${quote}]`).join(',')})`;
  });
}
