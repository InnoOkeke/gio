import { describe, it, expect } from 'vitest';
import { check } from '../src/logo/index.js';
import { complexity } from '../src/logo/difficulty.js';
import { checkQuest, features, QUESTS, wordsUsed, type Quest } from '../src/logo/quests.js';
import { islandsFor, questById, stageNumber, type Island } from '../src/ui/path/islands';
import { CODER_B_NAIVE } from './solutions/coder-b';
import { SOLUTIONS } from './solutions';

const CODER = islandsFor('coder');

/** Tiny Code Temple is the planned exception: the smallest code with the hardest idea. Its difficulty is the NAIVE evidence below. */
const EXEMPT_FROM_METRIC: ReadonlySet<string> = new Set(['coder:tiny']);

/** The stage where each word is first taught, from the plan's skill table. Words not listed are taught at stage 1. */
const TAUGHT: Record<string, number> = {
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

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Spearman rank correlation, with tied values sharing the average of their ranks. */
function spearman(xs: number[], ys: number[]): number {
  const ranks = (values: number[]): number[] => {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const out = new Array<number>(values.length).fill(0);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[order[k]![1]] = avg;
      i = j + 1;
    }
    return out;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

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
      for (const word of wordsUsed(parsed.program)) expect(TAUGHT[word] ?? 1, `${q.id} uses ${word}`).toBeLessThanOrEqual(stage);
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
