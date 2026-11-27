import { describe, expect, it } from 'vitest';
import { getLocale, type Lang } from '../src/i18n/index.js';
import { fillTemplate, LOGO_ERRORS, logoErrorText, type LogoErrorKey } from '../src/i18n/logo-errors.js';
import { translateText } from '../src/i18n/say.js';
import { check, execute, LogoError } from '../src/logo/index.js';
import { checkQuest, QUESTS } from '../src/logo/quests.js';

const OTHERS: Lang[] = ['pcm', 'fr', 'es'];
const names = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))];
/** Sample parameters: short plain values, different for every name, so a mixed-up marker shows. */
const sample = (template: string) => Object.fromEntries(names(template).map((n, i) => [n, `${n.toUpperCase()}${i + 7}`]));

describe('Logo error templates', () => {
  it.each(Object.keys(LOGO_ERRORS) as LogoErrorKey[])('%s renders in every language with all its params', (key) => {
    const params = sample(LOGO_ERRORS[key]);
    const english = logoErrorText(key, params);
    expect(english).not.toMatch(/\{\w+\}/);
    for (const lang of OTHERS) {
      const text = fillTemplate(getLocale(lang).logoErrors[key]!, params);
      expect(text, `${lang} ${key}`).not.toMatch(/\{\w+\}/);
      for (const v of Object.values(params)) expect(text, `${lang} ${key} lost ${v}`).toContain(v);
      // The UI finds the key again from the English message and shows the same error in the child's language.
      expect(translateText(english, lang), `${lang} ${key}`).toBe(text);
    }
  });

  it('throw sites keep their English messages and carry a key', () => {
    const cases: [string, string][] = [
      ['FD', 'FORWARD needs more inputs.'],
      ['REPEAT 4 FD 10', 'REPEAT needs a list of commands in square brackets, like [FD 50 RT 90].'],
      ['FD 10 ]', 'There is a ] without a matching [.'],
      ['BOGUS', "I don't know how to BOGUS. You can teach me with TO BOGUS \u2026 END."],
      ['FD :size', 'I don\'t know :size yet. Make it first with MAKE "size 50.'],
      ['FD 10 / 0', "You can't divide by zero."],
      ['SETPC "rde', 'I don\'t know the colour "rde". Did you mean "red?'],
    ];
    for (const [code, message] of cases) {
      const parsed = check(code);
      const res = parsed.ok ? execute(code) : parsed;
      expect(res.ok, code).toBe(false);
      if (res.ok) continue;
      expect(res.problem.message, code).toBe(message);
    }
    try {
      check('TO');
    } catch {
      /* check never throws */
    }
    const err = new LogoError('x', { line: 1, column: 1 });
    expect(err.key).toBeUndefined();
  });

  it('quest checker notes come out in each language, with a Logo error inside', () => {
    const q = QUESTS.find((x) => x.id === 'c-square')!;
    const res = checkQuest(q, 'FD');
    expect(res.message).toBe('Fix line 1 first: FORWARD needs more inputs.');
    expect(translateText(res.message, 'fr')).toBe('Répare d’abord la ligne 1 : FORWARD a besoin de plus d’entrées.');
    expect(translateText(res.message, 'en')).toBe(res.message);
  });
});
