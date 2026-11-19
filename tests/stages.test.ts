import { describe, it, expect } from 'vitest';
import { check } from '../src/logo/index.js';
import { complexity } from '../src/logo/difficulty.js';
import { checkQuest, features, QUESTS, wordsUsed, type Quest } from '../src/logo/quests.js';
import { islandsFor, questById, stageNumber, type Island } from '../src/ui/path/islands';
import { CODER_B_NAIVE } from './solutions/coder-b';
import { SOLUTIONS } from './solutions';
import { ADJACENT_EXEMPT, ADJACENT_TOLERANCE, mean, spearman } from './solutions/curve';

const CODER = islandsFor('coder');

/** Tiny Code Temple is the planned exception to the rank correlation: the smallest code with the hardest idea. Its difficulty is the NAIVE evidence below. */
const EXEMPT_FROM_METRIC: ReadonlySet<string> = new Set(['coder:tiny']);

/** The stage where each word is first taught, from the plan's skill table. Words not listed are taught at stage 1. */
const TAUGHT_AT: Record<string, number> = {
  SETPENSIZE: 3,
  SETBACKGROUND: 3,
  REPCOUNT: 3,
  MAKE: 7,
  SETHEADING: 7,
  XCOR: 8,
  YCOR: 8,
  SETXY: 8,
  SETX: 8,
  SETY: 8,
  DOT: 8,
  IF: 9,
  RANDOM: 10,
  WHEN: 11,
  SHOW: 12,
  GAMEOVER: 12,
  SQRT: 17,
  DISTANCE: 19,
};

const questsOf = (island: Island): Quest[] => island.units.flat().map((id) => questById(id)!);

const extras = (q: Quest) => ({
  ticks: (q.presses ?? []).filter((p) => p === 'TICK').length,
  hiddenCalls: q.needs?.calls?.length ?? 0,
  propChecks: q.needs?.props ? Object.values(q.needs.props).length : 0,
});

const score = (q: Quest): number => complexity(SOLUTIONS[q.id]!, extras(q));

describe('stages: Turtle Coders has 20 stages of 6 quests', () => {
  it('has exactly 120 coder quests on 20 stages, each of two units of three', () => {
    expect(CODER).toHaveLength(20);
    expect(QUESTS.filter((q) => q.audience === 'coder')).toHaveLength(120);
    for (const island of CODER) {
      expect(island.units, island.key).toHaveLength(2);
      expect(island.units.flat(), island.key).toHaveLength(6);
    }
    const ids = CODER.flatMap((i) => i.units.flat());
    expect(new Set(ids).size).toBe(120);
    expect(ids.every((id) => questById(id)?.audience === 'coder')).toBe(true);
    expect(CODER.map(stageNumber)).toEqual(Array.from({ length: 20 }, (_, k) => k + 1));
  });

  it('every coder quest has a reference solution that passes', () => {
    for (const island of CODER) for (const q of questsOf(island)) expect(checkQuest(q, SOLUTIONS[q.id]!), q.id).toMatchObject({ pass: true });
  });

  it('the whole bank of reference solutions checks in under 20 seconds', () => {
    const start = Date.now();
    for (const q of QUESTS) checkQuest(q, SOLUTIONS[q.id]!);
    expect(Date.now() - start).toBeLessThan(20_000);
  });
});

describe('stages: no quest leans on a skill taught in a later stage', () => {
  it.each(CODER.map((i) => [`${stageNumber(i)} ${i.name}`, i] as const))('stage %s', (_name, island) => {
    const stage = stageNumber(island);
    for (const q of questsOf(island)) {
      const parsed = check(SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      for (const word of wordsUsed(parsed.program)) expect(TAUGHT_AT[word] ?? 1, `${q.id} uses ${word}`).toBeLessThanOrEqual(stage);
      const f = features(parsed.program);
      if (f.has('TO') || f.has('INPUT')) expect(stage, `${q.id} teaches TO`).toBeGreaterThanOrEqual(5);
      if (f.has('RECURSION')) expect(stage, `${q.id} recursion`).toBeGreaterThanOrEqual(13);
    }
  });
});

describe('stages: the curve rises', () => {
  const rows = CODER.map((island) => {
    const units = island.units.map((unit) => unit.map((id) => score(questById(id)!)));
    return { island, stage: stageNumber(island), units, mean: mean(units.flat()), unit1: mean(units[0]!), unit2: mean(units[1]!) };
  });
  const measured = rows.filter((r) => !EXEMPT_FROM_METRIC.has(r.island.key));

  it('the stage number and the mean complexity agree (Spearman 0.85 or more across 19 stages)', () => {
    expect(measured).toHaveLength(19);
    const rho = spearman(
      measured.map((r) => r.stage),
      measured.map((r) => r.mean),
    );
    expect(rho).toBeGreaterThanOrEqual(0.85);
  });

  it('unit 2 is at least as hard as unit 1 in every stage', () => {
    for (const r of measured) expect(r.unit2, `${r.island.key}: unit 2 ${r.unit2.toFixed(1)} vs unit 1 ${r.unit1.toFixed(1)}`).toBeGreaterThanOrEqual(r.unit1);
  });

  it('the last six stages are harder than the first six', () => {
    const first = mean(measured.slice(0, 6).map((r) => r.mean));
    const last = mean(measured.slice(-6).map((r) => r.mean));
    expect(last).toBeGreaterThan(first * 2);
  });

  it('Logo Master mixes at least three skills in every quest', () => {
    const master = CODER[CODER.length - 1]!;
    for (const q of questsOf(master)) {
      const parsed = check(SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      const skills = new Set<string>([...features(parsed.program)]);
      for (const w of wordsUsed(parsed.program)) if (['RANDOM', 'SETXY', 'SHOW', 'GAMEOVER', 'HOME', 'SETY', 'REPCOUNT'].includes(w)) skills.add(w);
      expect(skills.size, `${q.id}: ${[...skills].join(', ')}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Tiny Code Temple is exempt from the metric only because every quest has a naive answer that fails', () => {
    expect(EXEMPT_FROM_METRIC.size).toBe(1);
    const tiny = CODER.find((i) => EXEMPT_FROM_METRIC.has(i.key))!;
    for (const q of questsOf(tiny)) {
      const naive = CODER_B_NAIVE[q.id]!;
      expect(naive, q.id).toBeDefined();
      expect(checkQuest(q, naive).pass, q.id).toBe(false);
      expect(checkQuest(q, SOLUTIONS[q.id]!).pass, q.id).toBe(true);
      expect(complexity(naive), `${q.id} naive is bigger than the answer`).toBeGreaterThan(complexity(SOLUTIONS[q.id]!));
    }
  });
});

/** What each stage teaches that is new, as a test on one quest. At least 4 of the stage's 6 reference solutions must use it. */
const OWN_SKILL: Record<number, { skill: string; uses: (q: Quest, words: Set<string>, feats: Set<string>) => boolean }> = {
  1: { skill: 'FD, RT', uses: (_q, w) => w.has('FORWARD') || w.has('RIGHT') },
  2: { skill: 'REPEAT', uses: (_q, _w, f) => f.has('REPEAT') },
  3: { skill: 'colours, pen size, background', uses: (_q, w) => w.has('SETPENCOLOR') || w.has('SETPENSIZE') || w.has('SETBACKGROUND') },
  5: { skill: 'TO ... END', uses: (_q, _w, f) => f.has('TO') },
  6: { skill: 'procedure inputs', uses: (_q, _w, f) => f.has('INPUT') },
  7: { skill: 'MAKE', uses: (_q, _w, f) => f.has('MAKE') },
  8: { skill: 'SETXY, DOT, XCOR', uses: (_q, w) => ['SETXY', 'SETX', 'SETY', 'DOT', 'XCOR', 'YCOR'].some((x) => w.has(x)) },
  9: { skill: 'IF', uses: (_q, _w, f) => f.has('IF') },
  10: { skill: 'RANDOM', uses: (_q, w) => w.has('RANDOM') },
  11: { skill: 'WHEN', uses: (_q, _w, f) => f.has('WHEN') },
  12: { skill: 'ticks, SHOW, GAMEOVER', uses: (q, w) => (q.presses ?? []).includes('TICK') || w.has('SHOW') || w.has('GAMEOVER') },
  13: { skill: 'recursion', uses: (_q, _w, f) => f.has('RECURSION') },
  14: { skill: 'recursion', uses: (_q, _w, f) => f.has('RECURSION') },
  16: { skill: 'a command limit', uses: (q) => q.needs?.maxCommands !== undefined },
  17: { skill: 'procedures or nested loops', uses: (_q, _w, f) => f.has('TO') || f.has('NEST') },
  18: { skill: 'motion over ticks', uses: (q) => (q.presses ?? []).includes('TICK') },
  19: { skill: 'key handlers with decisions', uses: (_q, _w, f) => f.has('WHEN') && f.has('IF') },
};
/** Stages with no own-skill test: their quests fix a given program (starter code) instead of writing new code, and stage 20 mixes everything (tested separately). */
const NO_OWN_SKILL: ReadonlySet<number> = new Set([4, 15, 20]);

describe('stages: every stage uses its own skill', () => {
  it('names an own-skill test or a reason for every one of the 20 stages', () => {
    for (let n = 1; n <= 20; n++) expect(n in OWN_SKILL || NO_OWN_SKILL.has(n), `stage ${n}`).toBe(true);
    expect(CODER.filter((i) => !(stageNumber(i) in OWN_SKILL)).every((i) => NO_OWN_SKILL.has(stageNumber(i)))).toBe(true);
  });

  it.each(CODER.filter((i) => stageNumber(i) in OWN_SKILL).map((i) => [`${stageNumber(i)} ${i.name}`, i] as const))('stage %s uses its own skill in at least 4 of 6 solutions', (_name, island) => {
    const own = OWN_SKILL[stageNumber(island)]!;
    let uses = 0;
    for (const q of questsOf(island)) {
      const parsed = check(SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      if (own.uses(q, new Set(wordsUsed(parsed.program)), new Set<string>(features(parsed.program)))) uses++;
    }
    expect(uses, `${own.skill}: ${uses} of 6`).toBeGreaterThanOrEqual(4);
  });
});

describe('stages: no stage is much easier than the one before it', () => {
  const rows = CODER.map((island) => ({ island, stage: stageNumber(island), mean: mean(island.units.flat().map((id) => score(questById(id)!))) }));

  it('only the named stages are exempt, and each exemption has a reason', () => {
    const coderExempt = Object.keys(ADJACENT_EXEMPT).filter((k) => k.startsWith('coder:'));
    expect(coderExempt.sort()).toEqual(['coder:debugging', 'coder:tiny']);
    for (const key of coderExempt) expect(ADJACENT_EXEMPT[key]!.length, key).toBeGreaterThan(60);
  });

  it(`every other stage has at least ${ADJACENT_TOLERANCE * 100} per cent of the mean difficulty of the stage before it`, () => {
    const counted = rows.filter((r) => !(r.island.key in ADJACENT_EXEMPT));
    for (let i = 1; i < counted.length; i++) {
      const before = counted[i - 1]!;
      const here = counted[i]!;
      expect(here.mean, `stage ${here.stage} ${here.island.name} (${here.mean.toFixed(1)}) after stage ${before.stage} ${before.island.name} (${before.mean.toFixed(1)})`).toBeGreaterThanOrEqual(before.mean * ADJACENT_TOLERANCE);
    }
  });

  it('Logo Master is the hardest stage by the same measure, with no exemption, and clearly harder than Game Studio', () => {
    const last = rows[19]!;
    expect(last.island.key).toBe('coder:master');
    expect(last.island.key in ADJACENT_EXEMPT).toBe(false);
    for (const r of rows.slice(0, 19)) expect(last.mean, `${r.island.name} ${r.mean.toFixed(1)}`).toBeGreaterThan(r.mean);
    expect(last.mean).toBeGreaterThanOrEqual(rows[18]!.mean * 1.1);
  });
});
