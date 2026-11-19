import { describe, expect, it } from 'vitest';
import { QUESTS } from '../src/logo/quests';
import { hiddenTestLine } from '../src/ui/path/hidden';
import { ALL_ISLANDS, ISLANDS, stageNumber } from '../src/ui/path/islands';
import { CODER_WORLDS, worldStartingAt } from '../src/ui/path/worlds';
import { STAGE_PROPS } from '../src/ui/components/StageArt';

describe('worlds on the coder map', () => {
  it('cover stages 1 to 20 in five groups of four, without gaps', () => {
    expect(ISLANDS.coder).toHaveLength(20);
    expect(CODER_WORLDS).toHaveLength(5);
    let next = 1;
    for (const w of CODER_WORLDS) {
      expect(w.from).toBe(next);
      expect(w.to).toBe(next + 3);
      next = w.to + 1;
    }
    expect(next).toBe(21);
  });
  it('mark exactly five world starts on the coder map and none on the little map', () => {
    const coder = ISLANDS.coder.filter((i) => worldStartingAt('coder', stageNumber(i)));
    expect(coder.map(stageNumber)).toEqual([1, 5, 9, 13, 17]);
    expect(ISLANDS.little.some((i) => worldStartingAt('little', stageNumber(i)))).toBe(false);
  });
});

describe('island art', () => {
  it('has a scene for every island, and the first eleven keep their concept scene', () => {
    expect(ALL_ISLANDS).toHaveLength(30);
    const stageScenes = Object.keys(STAGE_PROPS);
    expect(stageScenes).toHaveLength(19);
    for (const i of ALL_ISLANDS) {
      if (i.badge) expect(i.art).toBe(i.concept);
      else expect(stageScenes).toContain(i.art);
    }
  });
  it('gives every stage after the first eleven its own scene', () => {
    const added = ALL_ISLANDS.filter((i) => !i.badge).map((i) => i.art);
    expect(new Set(added).size).toBe(19);
  });
});

describe('hidden test line', () => {
  it('shows for quests that check hidden calls or random runs, and for no other quest', () => {
    const withLine = QUESTS.filter((q) => hiddenTestLine(q));
    expect(withLine.length).toBeGreaterThan(0);
    for (const q of QUESTS) {
      const hidden = Boolean(q.needs?.calls?.length || q.needs?.props);
      expect(hiddenTestLine(q) !== null).toBe(hidden);
    }
    expect(hiddenTestLine(QUESTS.find((q) => q.id === 'c-ing-square')!)).toBe('I will also test it with other numbers.');
  });
});
