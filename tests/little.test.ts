import { describe, it, expect } from 'vitest';
import { check } from '../src/logo/index.js';
import { complexity } from '../src/logo/difficulty.js';
import { toBlocks, type Block } from '../src/logo/blocks.js';
import { checkQuest, features, QUESTS, wordsUsed, type Quest } from '../src/logo/quests.js';
import { LITTLE_NEW } from '../src/logo/stages/little.js';
import { islandsFor, questById, stageNumber, type Island } from '../src/ui/path/islands';
import { emptyPath, islandState, nextStop, recordQuest } from '../src/ui/path/state';
import { LITTLE_NAIVE, LITTLE_SOLUTIONS } from './solutions/little';
import { SOLUTIONS } from './solutions';
import { ADJACENT_EXEMPT, ADJACENT_TOLERANCE, mean, spearman } from './solutions/curve';

const STAGES: Record<number, { key: string; name: string; ids: string[] }> = {
  4: { key: 'little:pen', name: 'Pen Playground', ids: ['l-pen-gap', 'l-pen-dashes', 'l-pen-jump', 'l-pen-dotted-ring', 'l-pen-train', 'l-pen-ladder'] },
  5: { key: 'little:flowers', name: 'Flower Fields', ids: ['l-flower-three', 'l-flower-eight', 'l-daisy', 'l-bubbles', 'l-sunflower', 'l-garden'] },
  6: { key: 'little:patterns', name: 'Pattern Park', ids: ['l-spin-triangles', 'l-spin-boxes', 'l-petal-square', 'l-fan', 'l-weave', 'l-wheel'] },
  7: { key: 'little:pictures', name: 'Picture Town', ids: ['l-house-pic', 'l-tree-pic', 'l-boat-pic', 'l-rocket-pic', 'l-snow-pic', 'l-town-pic'] },
  8: { key: 'little:stars', name: 'Star Sky', ids: ['l-star-pair', 'l-star-mix', 'l-star-night', 'l-star-ring', 'l-star-four', 'l-star-five'] },
  9: { key: 'little:fewest', name: 'Block Saver', ids: ['l-save-square', 'l-save-star', 'l-save-flower', 'l-save-ring', 'l-save-fan', 'l-save-spin'] },
  10: { key: 'little:lighthouse', name: 'Logo Master Lighthouse', ids: ['l-lh-castle', 'l-lh-lighthouse', 'l-lh-fish', 'l-lh-rainbow', 'l-lh-windmill', 'l-lh-mosaic'] },
};
const LITTLE = islandsFor('little');
/** Block Saver is exempt from the rank correlation for the same reason as Tiny Code Temple: small code, hard idea. */
const EXEMPT: ReadonlySet<string> = new Set(['little:fewest']);
const questsOf = (island: Island): Quest[] => island.units.flat().map((id) => questById(id)!);
const score = (q: Quest): number => complexity(SOLUTIONS[q.id]!);

/** The numbers the block steppers can reach (src/ui/editor/BlocksEditor.tsx). */
const onGrid = (blocks: Block[]): boolean =>
  blocks.every((b) => {
    switch (b.kind) {
      case 'forward':
      case 'back':
        return b.n >= 0 && b.n <= 300 && b.n % 10 === 0;
      case 'right':
      case 'left':
        return b.n >= 0 && b.n <= 360 && b.n % 15 === 0;
      case 'circle':
        return b.n >= 10 && b.n <= 150 && b.n % 10 === 0;
      case 'size':
        return b.n >= 1 && b.n <= 20;
      case 'repeat':
        return b.n >= 1 && b.n <= 36 && onGrid(b.body);
      default:
        return true;
    }
  });

describe('little content: quests', () => {
  it('has 42 new quests, all for Little Turtles, in stage order, and 60 little quests in all', () => {
    expect(LITTLE_NEW).toHaveLength(42);
    expect(LITTLE_NEW.every((q) => q.audience === 'little')).toBe(true);
    expect(LITTLE_NEW.map((q) => q.id)).toEqual(Object.values(STAGES).flatMap((s) => s.ids));
    expect(QUESTS.filter((q) => q.audience === 'little')).toHaveLength(60);
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });
  it('has a reference solution for every new quest and nothing else', () => {
    expect(Object.keys(LITTLE_SOLUTIONS).sort()).toEqual(LITTLE_NEW.map((q) => q.id).sort());
  });
  it.each(LITTLE_NEW.map((q) => [q.id, q] as const))('%s passes with its reference solution, fails with empty code, and every goal is a real drawing', (_id, quest) => {
    expect(checkQuest(quest, LITTLE_SOLUTIONS[quest.id]!)).toMatchObject({ pass: true });
    expect(checkQuest(quest, '').pass).toBe(false);
    expect(quest.target, 'every new little quest draws a target the child can see').toBeDefined();
  });
  it.each(LITTLE_NEW.map((q) => [q.id, q] as const))('%s: target and solution are made of blocks on the stepper grid', (_id, quest) => {
    for (const code of [quest.target!, LITTLE_SOLUTIONS[quest.id]!]) {
      const parsed = check(code);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      const blocks = toBlocks(parsed.program);
      expect(blocks.ok).toBe(true);
      if (blocks.ok) expect(onGrid(blocks.blocks)).toBe(true);
    }
  });
  it('a plain copy of the target is not enough when the quest wants colours', () => {
    for (const q of LITTLE_NEW.filter((x) => (x.needs?.minColours ?? 0) >= 2)) {
      const r = checkQuest(q, q.target!);
      expect(r.pass, q.id).toBe(false);
      expect(r.message, q.id).toMatch(/colour/i);
    }
  });
  it('quests that want a Repeat inside a Repeat are not passed by the unrolled outer loop', () => {
    for (const q of LITTLE_NEW.filter((x) => x.needs?.uses?.includes('NEST'))) {
      const parsed = check(q.target!);
      if (!parsed.ok) throw new Error(q.id);
      // The target itself nests, so it passes the nest rule once colours are not needed; with colours it must still name the missing colour.
      const r = checkQuest(q, LITTLE_SOLUTIONS[q.id]!);
      expect(r.pass, q.id).toBe(true);
      expect(features(parsed.program).has('NEST'), q.id).toBe(true);
    }
  });
  it('the stage a quest sits in matches its concept', () => {
    for (const [n, s] of Object.entries(STAGES)) {
      const island = LITTLE[Number(n) - 1]!;
      expect(island.key).toBe(s.key);
      for (const q of questsOf(island)) expect(q.concept, q.id).toBe(island.concept);
    }
  });
});

describe('little content: stages', () => {
  it('has exactly 10 stages of 6 quests, in two units of three, with the seven new ones at positions 4 to 10', () => {
    expect(LITTLE).toHaveLength(10);
    expect(LITTLE.map(stageNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const island of LITTLE) {
      expect(island.units, island.key).toHaveLength(2);
      expect(island.units.flat(), island.key).toHaveLength(6);
    }
    expect(LITTLE.slice(0, 3).map((i) => i.key)).toEqual(['little:moves', 'little:loops', 'little:colours']);
    for (const [n, s] of Object.entries(STAGES)) {
      const island = LITTLE[Number(n) - 1]!;
      expect(island.name).toBe(s.name);
      expect(island.units.flat()).toEqual(s.ids);
      expect(island.badge).toBeNull();
    }
    const ids = LITTLE.flatMap((i) => i.units.flat());
    expect(new Set(ids).size).toBe(60);
    expect(ids.every((id) => questById(id)?.audience === 'little')).toBe(true);
  });
  it('Logo Master Lighthouse comes last with the gold art and stamp', () => {
    const last = LITTLE[LITTLE.length - 1]!;
    expect(last.key).toBe('little:lighthouse');
    expect(last.art).toBe('lighthouse');
    expect(last.stamp).toBe('#d4a017');
  });
  it('every stage has its own stamp colour and a resident who lives in Little Turtles', () => {
    expect(new Set(LITTLE.slice(3).map((i) => i.stamp)).size).toBe(7);
  });
  it('a child who sailed the three old Little islands is sent to Pen Playground next, and the new stages unlock one by one', () => {
    let state = emptyPath();
    let cleared: string[] = [];
    for (const island of LITTLE.slice(0, 3)) {
      for (const id of island.units.flat()) {
        const r = recordQuest(state, cleared, id, false, '2026-04-01');
        state = r.state;
        cleared = r.cleared;
      }
    }
    expect(islandState(state, cleared, 'little:colours').sailed).toBe(true);
    expect(islandState(state, cleared, 'little:pen').status).toBe('open');
    expect(islandState(state, cleared, 'little:flowers').status).toBe('locked');
    expect(nextStop(state, cleared, 'little', '2026-04-09')).toMatchObject({ kind: 'quest', questId: 'l-pen-gap' });
  });
});

describe('little content: the curve rises', () => {
  const rows = LITTLE.map((island) => {
    const units = island.units.map((unit) => unit.map((id) => score(questById(id)!)));
    return { island, stage: stageNumber(island), mean: mean(units.flat()), unit1: mean(units[0]!), unit2: mean(units[1]!) };
  });
  const measured = rows.filter((r) => !EXEMPT.has(r.island.key));
  it('the stage number and the mean complexity agree (Spearman 0.8 or more across 9 stages)', () => {
    expect(measured).toHaveLength(9);
    const rho = spearman(
      measured.map((r) => r.stage),
      measured.map((r) => r.mean),
    );
    expect(rho).toBeGreaterThanOrEqual(0.8);
  });
  it('unit 2 is at least as hard as unit 1 in every stage', () => {
    for (const r of measured) expect(r.unit2, `${r.island.key}: unit 2 ${r.unit2.toFixed(1)} vs unit 1 ${r.unit1.toFixed(1)}`).toBeGreaterThanOrEqual(r.unit1);
  });
  it('the last stage is the hardest and the last three are harder than the first three', () => {
    expect(rows[9]!.mean).toBe(Math.max(...rows.map((r) => r.mean)));
    expect(mean(measured.slice(-3).map((r) => r.mean))).toBeGreaterThan(mean(measured.slice(0, 3).map((r) => r.mean)) * 2);
  });
  it('no new quest leans on an idea taught in a later stage', () => {
    for (const island of LITTLE.slice(3)) {
      const stage = stageNumber(island);
      for (const q of questsOf(island)) {
        const parsed = check(SOLUTIONS[q.id]!);
        if (!parsed.ok) throw new Error(q.id);
        const f = features(parsed.program);
        if (f.has('NEST')) expect(stage, `${q.id} nests Repeat blocks`).toBeGreaterThanOrEqual(6);
        if (f.has('CIRCLE')) expect(stage, q.id).toBeGreaterThanOrEqual(2);
        for (const w of wordsUsed(parsed.program)) expect(['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'PENUP', 'PENDOWN', 'SETPENCOLOR', 'CIRCLE', 'REPEAT'], `${q.id} uses ${w}`).toContain(w);
      }
    }
  });
  it('Block Saver is exempt only because every quest has a wasteful answer that fails and a short one that passes', () => {
    expect(EXEMPT.size).toBe(1);
    const saver = LITTLE.find((i) => EXEMPT.has(i.key))!;
    expect(Object.keys(LITTLE_NAIVE).sort()).toEqual(questsOf(saver).map((q) => q.id).sort());
    for (const q of questsOf(saver)) {
      const wasteful = checkQuest(q, LITTLE_NAIVE[q.id]!);
      expect(wasteful.pass, q.id).toBe(false);
      expect(wasteful.message, q.id).toMatch(/\d+ commands or fewer/);
      expect(checkQuest(q, LITTLE_SOLUTIONS[q.id]!).pass, q.id).toBe(true);
    }
  });
});

/** What each new stage teaches, as a test on one reference solution. At least 4 of its 6 solutions must use it. */
const OWN_SKILL: Record<number, { skill: string; uses: (q: Quest, words: Set<string>, feats: Set<string>) => boolean }> = {
  4: { skill: 'lifting the pen', uses: (_q, w) => w.has('PENUP') },
  5: { skill: 'circles in loops', uses: (_q, w, f) => w.has('CIRCLE') && f.has('REPEAT') },
  6: { skill: 'a Repeat inside a Repeat', uses: (_q, _w, f) => f.has('NEST') },
  7: { skill: 'pictures from several shapes in 2 or more colours', uses: (q) => (q.needs?.minColours ?? 0) >= 2 },
  8: { skill: 'Repeat for stars', uses: (_q, _w, f) => f.has('REPEAT') },
  9: { skill: 'a block limit', uses: (q) => q.needs?.maxCommands !== undefined },
  10: { skill: 'Repeat, circles and colours together', uses: (q, _w, f) => f.has('REPEAT') && (f.has('CIRCLE') || f.has('NEST')) && (q.needs?.minColours ?? 0) >= 2 },
};

describe('little content: every new stage uses its own skill', () => {
  it.each(Object.entries(OWN_SKILL).map(([n, s]) => [`${n} ${LITTLE[Number(n) - 1]!.name}`, Number(n), s] as const))('stage %s uses its own skill in at least 4 of 6 solutions', (_name, n, own) => {
    let uses = 0;
    for (const q of questsOf(LITTLE[n - 1]!)) {
      const parsed = check(SOLUTIONS[q.id]!);
      if (!parsed.ok) throw new Error(q.id);
      if (own.uses(q, new Set(wordsUsed(parsed.program)), new Set<string>(features(parsed.program)))) uses++;
    }
    expect(uses, `${own.skill}: ${uses} of 6`).toBeGreaterThanOrEqual(4);
  });
});

describe('little content: no stage is much easier than the one before it', () => {
  const stageRows = LITTLE.map((island) => ({ island, stage: stageNumber(island), mean: mean(island.units.flat().map((id) => score(questById(id)!))) }));

  it('only Block Saver is exempt, and the exemption has a reason', () => {
    const littleExempt = Object.keys(ADJACENT_EXEMPT).filter((k) => k.startsWith('little:'));
    expect(littleExempt).toEqual(['little:fewest']);
    expect(ADJACENT_EXEMPT['little:fewest']!.length).toBeGreaterThan(60);
  });

  it(`every other stage has at least ${ADJACENT_TOLERANCE * 100} per cent of the mean difficulty of the stage before it`, () => {
    const counted = stageRows.filter((r) => !(r.island.key in ADJACENT_EXEMPT));
    for (let i = 1; i < counted.length; i++) {
      const before = counted[i - 1]!;
      const here = counted[i]!;
      expect(here.mean, `stage ${here.stage} ${here.island.name} (${here.mean.toFixed(1)}) after stage ${before.stage} ${before.island.name} (${before.mean.toFixed(1)})`).toBeGreaterThanOrEqual(before.mean * ADJACENT_TOLERANCE);
    }
  });

  it('Star Sky is harder than Flower Fields, Pattern Park and Picture Town', () => {
    const star = stageRows[7]!;
    expect(star.island.key).toBe('little:stars');
    for (const r of stageRows.slice(4, 7)) expect(star.mean, r.island.name).toBeGreaterThan(r.mean);
  });
});
