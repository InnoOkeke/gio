import { describe, expect, it } from 'vitest';
import { ADVENTURE_WORDS } from '../src/logo/adventure/index.js';
import { check, execute, LOCAL_WORDS, localizeSource, parse, PRIMITIVES, type Program } from '../src/logo/index.js';
import { canonical, foldWord, wordsFor } from '../src/logo/words.js';
import { SPECIAL_FORMS } from '../src/logo/primitives.js';
import type { Lang } from '../src/i18n/index.js';

/** The parse tree without source positions, so programs written with different words can be compared. */
function shape(program: Program): unknown {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (v instanceof Map) return [...v.entries()].map(([k, x]) => [k, strip(x)]);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'pos').map(([k, x]) => [k, strip(x)]));
    return v;
  };
  return strip(program);
}

const events = (code: string) => {
  const r = execute(code);
  if (!r.ok) throw new Error(`${code}: ${r.problem.message}`);
  return r.result.events;
};

const ENGLISH = `TO SQUARE :SIZE
  REPEAT 4 [FD :SIZE RT 90]
END
CS
PU SETXY -50 0 PD
SETPENCOLOR "blue
SQUARE 60
MAKE "N RANDOM 3
IFELSE :N > 1 [LT 45 BK 10] [PRINT [hello there]]
IF HEADING = 0 [CIRCLE 20 ARC 90 30]
SETPENSIZE 3 HT ST`;

const LANGS: Lang[] = ['pcm', 'fr', 'es'];

describe('command words in other languages', () => {
  it('FD 100 RT 90, AVANCE 100 DROITE 90 and AVANZA 100 DERECHA 90 make the same turtle events', () => {
    const en = events('FD 100 RT 90');
    expect(events('AVANCE 100 DROITE 90')).toEqual(en);
    expect(events('AVANZA 100 DERECHA 90')).toEqual(en);
    expect(events('GO 100 RIGHT 90')).toEqual(en);
    expect(events('AV 100 TD 90')).toEqual(en);
  });

  it.each(LANGS)('a program in %s parses to the same tree as the English one', (lang) => {
    const local = localizeSource(ENGLISH, lang);
    expect(local).not.toBe(ENGLISH);
    expect(shape(parse(local))).toEqual(shape(parse(ENGLISH)));
  });

  it('English words keep working next to local ones, whatever the language', () => {
    expect(shape(parse('REPETE 4 [FD 50 DROITE 90]'))).toEqual(shape(parse('REPEAT 4 [FD 50 RT 90]')));
    expect(shape(parse('REPITE 3 [AVANZA 10 RT 120]'))).toEqual(shape(parse('REPEAT 3 [FD 10 RT 120]')));
    expect(shape(parse('POUR CARRE\nREPEAT 4 [AV 20 TD 90]\nFIN\nCARRE'))).toEqual(shape(parse('TO CARRE\nREPEAT 4 [FD 20 RT 90]\nEND\nCARRE')));
  });

  it('a program that teaches its own AVANCE keeps its own meaning', () => {
    const own = 'TO AVANCE :N\n  RT :N\nEND\nAVANCE 90';
    const noLine = (code: string) => events(code).map(({ line: _line, ...e }) => e);
    expect(noLine(own)).toEqual(noLine('RT 90'));
    expect(parse(own).main[0]).toMatchObject({ kind: 'call', name: 'AVANCE' });
    expect(localizeSource(own, 'fr')).toBe('POUR AVANCE :N\n  TD :N\nFIN\nAVANCE 90');
  });

  it('never rewrites lists, quoted words or comments', () => {
    const code = 'PRINT [AVANCE REPETE go] ; AVANCE here\nSETPENCOLOR "red\nSHOW "AVANCE';
    const fr = localizeSource(code, 'fr');
    expect(fr).toBe('ECRIS [AVANCE REPETE go] ; AVANCE here\nFIXECOULEUR "red\nAFFICHE "AVANCE');
    expect(events('ECRIS [AVANCE 10]')).toEqual(events('PRINT [AVANCE 10]'));
    expect(JSON.stringify(events('ECRIS [AVANCE 10]'))).toContain('AVANCE 10');
  });

  it('folds accents and case: REPÈTE, répète and REPETE are the same word', () => {
    expect(foldWord('répète')).toBe('REPETE');
    expect(shape(parse('REPÈTE 2 [AV 10]'))).toEqual(shape(parse('REPETE 2 [AV 10]')));
    expect(shape(parse('répète 2 [av 10]'))).toEqual(shape(parse('REPEAT 2 [FD 10]')));
    expect(check('PRINT "Ça').ok).toBe(true);
  });

  it('localizeSource round-trips through every language and keeps short forms short', () => {
    expect(localizeSource('FD 50 RT 90 PU', 'fr')).toBe('AV 50 TD 90 LC');
    expect(localizeSource('FORWARD 50', 'es')).toBe('AVANZA 50');
    expect(localizeSource('REPEAT 4 [FD 50 RT 90]', 'en')).toBe('REPEAT 4 [FD 50 RT 90]');
    for (const lang of LANGS) {
      const there = localizeSource(ENGLISH, lang);
      // Pidgin has no short form for some words (HT becomes HIDEMAN), so only its meaning round-trips.
      if (lang !== 'pcm') expect(localizeSource(there, 'en')).toBe(ENGLISH);
      expect(shape(parse(localizeSource(there, 'en')))).toEqual(shape(parse(ENGLISH)));
      for (const other of LANGS) expect(shape(parse(localizeSource(there, other)))).toEqual(shape(parse(ENGLISH)));
    }
    expect(localizeSource('FD (', 'fr')).toBe('FD (');
  });
});

describe('the word tables', () => {
  const english = new Map<string, string>();
  for (const p of PRIMITIVES) for (const w of [p.name, ...p.aliases]) english.set(w, p.name);
  for (const w of SPECIAL_FORMS) english.set(w, w);
  const canons = new Set(english.values());

  it('every local word maps to one command, and never to an English word with another meaning', () => {
    const seen = new Map<string, string>();
    for (const [lang, table] of Object.entries(LOCAL_WORDS)) {
      for (const [canon, words] of Object.entries(table)) {
        expect(canons.has(canon), `${lang} ${canon}`).toBe(true);
        for (const w of words) {
          expect(w, `${lang} ${w} is ASCII and upper case`).toMatch(/^[A-Z]+$/);
          const before = seen.get(w);
          expect(before === undefined || before === canon, `${w} means ${before} and ${canon}`).toBe(true);
          seen.set(w, canon);
          const en = english.get(w);
          expect(en === undefined || en === canon, `${lang} ${w} is the English word for ${en}`).toBe(true);
          expect(canonical(w, false)).toBe(canon);
        }
      }
    }
  });

  it('no local word is also one of the adventure words', () => {
    const adventure = new Set(ADVENTURE_WORDS.flatMap((p) => [p.name, ...p.aliases]));
    for (const table of Object.values(LOCAL_WORDS)) for (const words of Object.values(table)) for (const w of words) expect(adventure.has(w), w).toBe(false);
  });

  it('every language has a word for the commands the key row and blocks use', () => {
    for (const lang of LANGS) {
      const words = wordsFor(lang);
      for (const canon of ['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'PENUP', 'PENDOWN', 'REPEAT', 'TO', 'END']) expect(words.get(canon)?.length, `${lang} ${canon}`).toBeGreaterThan(0);
    }
  });
});
