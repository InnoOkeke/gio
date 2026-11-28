import { getLocale, loadAllLocales, type Lang } from '../../src/i18n/index.js';
import { messages as en } from '../../src/i18n/locales/en.js';
import { wordIn } from '../../src/logo/word-table.js';
import { QUESTS } from '../../src/logo/quests.js';
import { ALL_ISLANDS } from '../../src/ui/path/islands.js';
import { REALMS } from '../../src/ui/adventure/realms.js';

await loadAllLocales();

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
type Template = { regex: RegExp; names: string[]; local: string; head: string; localHead: string; english: string };
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
    out.push({ regex: new RegExp(`^${body}$`), names, local: local[key]!, head: english.split('{')[0]!, localHead: local[key]!.split('{')[0]!, english });
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
  // A text cut short from a message with markers: "Speed" from "Speed: {speed}. Tap to change",
  // "Quest 2: The letter L" from "{label}: {title}, {state}".
  const trim = (s: string) => s.replace(/[\s:.,!?]+$/u, '');
  for (const t of templates(lang)) {
    const head = trim(t.head);
    if (head.length >= 4 && text === head && trim(t.localHead)) out.add(trim(t.localHead));
    for (let k = 1; k < t.names.length; k++) {
      const end = `{${t.names[k - 1]}}`;
      const english = t.english.slice(0, t.english.indexOf(end) + end.length);
      const localEnd = t.local.indexOf(end);
      if (localEnd < 0 || t.names.slice(0, k).some((n) => t.local.indexOf(`{${n}}`) > localEnd)) continue;
      const names: string[] = [];
      const body = english.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (names.push(part), '(.+?)') : escape(part))).join('');
      const m = new RegExp(`^${body}$`).exec(text);
      if (!m) continue;
      let local = t.local.slice(0, localEnd + end.length);
      names.forEach((name, i) => {
        const part = m[i + 1]!;
        local = local.split(`{${name}}`).join(translateWhole(part, lang, 1) ?? part);
      });
      if (!/\{\w+\}/.test(local)) out.add(local);
    }
  }
  // A text that is the start of exactly one plain message: "Play today" from "Play today's puzzle".
  if (!whole && text.length >= 6) {
    const starts = phrases(lang).filter(([english]) => english.startsWith(text) && english !== text);
    if (starts.length === 1) out.add(starts[0]![1]);
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
    // The English text itself may hold a quote (Gio's garden); only the added translations must not.
    const alts = textsFor(value, lang).slice(1).filter((t) => !/["'\\]/.test(t));
    if (alts.length === 0) return whole;
    const quote = whole.includes('\\"') ? '\\"' : '"';
    return `:is(${[raw, ...alts].map((t) => `[aria-label${op}=${quote}${t}${quote}]`).join(',')})`;
  });
}
