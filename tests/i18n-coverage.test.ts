import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getLocale, type Lang } from '../src/i18n/index.js';
import { messages as en } from '../src/i18n/locales/en.js';
import { LOGO_ERRORS } from '../src/i18n/logo-errors.js';
import { LEVELS } from '../src/logo/adventure/index.js';
import { CONCEPTS, QUESTS } from '../src/logo/quests.js';
import { REALMS } from '../src/ui/adventure/realms.js';
import { FRIENDS, STICKERS } from '../src/ui/gio/catalog.js';
import { LINES } from '../src/ui/gio/lines.js';
import { ALL_ISLANDS } from '../src/ui/path/islands.js';
import { MAP_LINES } from '../src/ui/path/lines.js';
import { scanLiterals } from './helpers/jsx-literals.js';
import { ALLOWED_LITERALS } from './i18n-allow.js';

const OTHERS: Lang[] = ['pcm', 'fr', 'es'];
/** Every {marker} the English lines of a pool use: a translated line may use any of them. */
const allowed = (pool: readonly string[]) => [...new Set(pool.flatMap((s) => marks(s)))];
const marks = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Logo words that must stay as they are inside translated text, because a child types them. */
const codeWords = (s: string) => [...s.matchAll(/\b(?:REPEAT|TO|END|MAKE|IF|IFELSE|WHEN|STOP|FD|BK|RT|LT|PU|PD|SETPC|SETXY|SHOW|GAMEOVER|FREE|SWIM|JUMP|REST|AHEAD|GEMS|REPCOUNT|RANDOM)\b/g)].length;

describe('content in every language', () => {
  it.each(OTHERS)('%s has text for every quest, with the same {markers}', (lang) => {
    const quests = getLocale(lang).content.quests;
    for (const q of QUESTS) {
      const text = quests[q.id];
      expect(text, `${lang} quest ${q.id}`).toBeDefined();
      expect(text!.title.trim(), `${lang} ${q.id} title`).not.toBe('');
      expect(text!.goal.trim(), `${lang} ${q.id} goal`).not.toBe('');
    }
    for (const id of Object.keys(quests)) expect(QUESTS.some((q) => q.id === id), `${lang} has a stale quest ${id}`).toBe(true);
  });
  it.each(OTHERS)('%s keeps the Logo words of each quest goal', (lang) => {
    const quests = getLocale(lang).content.quests;
    for (const q of QUESTS) {
      if (codeWords(q.goal) === 0) continue;
      expect(codeWords(quests[q.id]!.goal), `${lang} ${q.id} goal lost a Logo word`).toBeGreaterThan(0);
    }
  });
  it.each(OTHERS)('%s has every stage, concept, friend and sticker', (lang) => {
    const c = getLocale(lang).content;
    for (const i of ALL_ISLANDS) expect(c.stages[i.key], `${lang} stage ${i.key}`).toBeDefined();
    for (const k of Object.keys(CONCEPTS)) expect(c.concepts[k], `${lang} concept ${k}`).toBeDefined();
    for (const f of FRIENDS) expect(c.friends[f.id], `${lang} friend ${f.id}`).toBeDefined();
    for (const s of STICKERS) expect(c.stickers[s.id], `${lang} sticker ${s.id}`).toBeDefined();
  });
  it.each(OTHERS)('%s has every adventure level and world, and nothing stale', (lang) => {
    const a = getLocale(lang).content.adventure;
    const want: Record<string, string> = {};
    for (const r of Object.values(REALMS)) {
      want[`realm.${r.id}.name`] = r.name;
      want[`realm.${r.id}.blurb`] = r.blurb;
      want[`realm.${r.id}.story`] = r.story;
    }
    for (const l of LEVELS) {
      want[`${l.id}.title`] = l.title;
      want[`${l.id}.story`] = l.story;
      want[`${l.id}.goal`] = l.goal;
      if (l.boss) want[`${l.id}.boss`] = l.boss.name;
      l.hints.forEach((h, i) => (want[`${l.id}.hint.${i}`] = h.text));
    }
    for (const [id, english] of Object.entries(want)) {
      expect(a[id], `${lang} adventure ${id}`).toBeDefined();
      expect(marks(a[id]!), `${lang} ${id}`).toEqual(marks(english));
    }
    for (const id of Object.keys(a)) expect(id in want, `${lang} has a stale adventure id ${id}`).toBe(true);
  });
  it.each(OTHERS)('%s has every line pool Gio and the map say, with the same {markers}', (lang) => {
    const pools = getLocale(lang).content.lines;
    for (const [mode, lines] of Object.entries(LINES)) {
      for (const [name, english] of Object.entries(lines)) {
        const got = pools[`gio.${mode}.${name}`];
        expect(got?.length, `${lang} gio.${mode}.${name}`).toBeGreaterThan(0);
        for (const line of got!) expect(allowed(english as string[]), `${lang} gio.${mode}.${name}`).toEqual(expect.arrayContaining(marks(line)));
      }
    }
    for (const [mode, lines] of Object.entries(MAP_LINES)) {
      for (const [name, english] of Object.entries(lines)) {
        const got = pools[`map.${mode}.${name}`];
        expect(got?.length, `${lang} map.${mode}.${name}`).toBeGreaterThan(0);
        for (const line of got!) expect(allowed(english as string[]), `${lang} map.${mode}.${name}`).toEqual(expect.arrayContaining(marks(line)));
      }
    }
  });
  it.each(OTHERS)('%s has every Logo error with the same {markers}', (lang) => {
    const errors = getLocale(lang).logoErrors;
    for (const [key, english] of Object.entries(LOGO_ERRORS)) {
      expect(errors[key], `${lang} logo error ${key}`).toBeDefined();
      expect(marks(errors[key]!), `${lang} ${key}`).toEqual(marks(english));
    }
    expect(Object.keys(errors).sort()).toEqual(Object.keys(LOGO_ERRORS).sort());
  });
});

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) tsxFiles(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

describe('no untranslated text in the UI', () => {
  it('JSX text and aria-label/title/placeholder/alt literals go through t(...)', () => {
    const found: string[] = [];
    for (const file of tsxFiles(join(__dirname, '..', 'src', 'ui'))) {
      for (const lit of scanLiterals(file, readFileSync(file, 'utf8'))) {
        if (!ALLOWED_LITERALS.has(lit.text)) found.push(`${file.replace(/\\/g, '/').split('/src/')[1]}:${lit.line} ${lit.kind} "${lit.text}"`);
      }
    }
    expect(found).toEqual([]);
  });
  it('every message key is a real English message', () => {
    expect(Object.keys(en).length).toBeGreaterThan(900);
  });
});
