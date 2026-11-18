import { describe, it, expect } from 'vitest';
import { QUESTS } from '../src/logo/quests.js';
import { friendById, FRIENDS } from '../src/ui/gio/catalog';
import { addDays, backfillFromProgress, dayDiff } from '../src/ui/gio/rewards';
import { createHelpTracker } from '../src/ui/path/help';
import { ALL_ISLANDS, islandByKey, islandOf, islandQuestIds, islandsFor, placeOf, unitOf } from '../src/ui/path/islands';
import { LEGACY_QUEST_IDS } from '../src/ui/path/legacy';
import {
  badgeEarned,
  emptyPath,
  finishReview,
  islandState,
  masterReady,
  migrate,
  nextStop,
  parsePath,
  questState,
  recordMaster,
  recordQuest,
  reviewDue,
  reviewPlan,
  unitState,
  type PathState,
} from '../src/ui/path/state';

const D1 = '2026-03-02';
const D2 = '2026-03-03';

interface World {
  state: PathState;
  cleared: string[];
}

const fresh = (): World => ({ state: emptyPath(), cleared: [] });

function solve(w: World, id: string, helped = false, today = D1): World {
  const r = recordQuest(w.state, w.cleared, id, helped, today);
  return { state: r.state, cleared: r.cleared };
}

function solveAll(w: World, ids: readonly string[], helped = false, today = D1): World {
  return ids.reduce((acc, id) => solve(acc, id, helped, today), w);
}

/** Master both units of an island with the first two quests of each unit. */
function sail(w: World, key: string, today = D1): World {
  const island = islandByKey(key)!;
  return solveAll(w, island.units.flatMap((u) => [u[0], u[1]]), false, today);
}

describe('adventure map content', () => {
  it('has 3 little islands and 8 coder islands in the planned order', () => {
    expect(islandsFor('little').map((i) => i.concept)).toEqual(['moves', 'loops', 'colours']);
    expect(islandsFor('coder').map((i) => i.concept)).toEqual([
      'moves',
      'loops',
      'colours',
      'debugging',
      'functions',
      'functions',
      'variables',
      'moves',
      'decisions',
      'decisions',
      'events',
      'events',
      'recursion',
      'recursion',
    ]);
    expect(ALL_ISLANDS.map((i) => i.key)).toEqual([...new Set(ALL_ISLANDS.map((i) => i.key))]);
  });

  it('puts every quest in exactly one unit, and every unit has 3 quests', () => {
    const seen = new Map<string, number>();
    for (const island of ALL_ISLANDS) {
      expect(island.units).toHaveLength(2);
      for (const unit of island.units) {
        expect(unit).toHaveLength(3);
        for (const id of unit) seen.set(id, (seen.get(id) ?? 0) + 1);
      }
    }
    expect([...seen.keys()].sort()).toEqual(QUESTS.map((q) => q.id).sort());
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it('keeps each quest on the island of its own mode and concept', () => {
    for (const q of QUESTS) {
      const island = islandOf(q.id)!;
      expect(island, q.id).toBeDefined();
      expect(island.audience).toBe(q.audience);
      expect(island.concept).toBe(q.concept);
    }
  });

  it('gives every island a resident friend who lives in that mode', () => {
    for (const island of ALL_ISLANDS) {
      const friend = friendById(island.resident);
      expect(friend.modes).toContain(island.audience);
      expect(FRIENDS.some((f) => f.id === island.resident)).toBe(true);
    }
  });

  it('finds where a quest lives', () => {
    expect(placeOf('c-repeat')).toMatchObject({ unitIndex: 0, index: 0 });
    expect(unitOf('c-sketch')).toMatchObject({ unitIndex: 1, ids: ['c-stamp', 'c-ticker', 'c-sketch'] });
    expect(placeOf('nope')).toBeUndefined();
  });

  it('lists the 20 original quests as legacy ids', () => {
    expect(LEGACY_QUEST_IDS).toHaveLength(20);
    for (const id of LEGACY_QUEST_IDS) expect(QUESTS.some((q) => q.id === id)).toBe(true);
  });
});

describe('mastery and sailing', () => {
  const unit1 = ['c-line', 'c-ell', 'c-square'];

  it('masters a unit with two different gold quests', () => {
    let w = solve(fresh(), 'c-line');
    expect(unitState(w.state, w.cleared, 'coder:moves', 0).mastered).toBe(false);
    const r = recordQuest(w.state, w.cleared, 'c-ell', false, D1);
    expect(r.events.unitMastered).toBe(true);
    w = { state: r.state, cleared: r.cleared };
    expect(unitState(w.state, w.cleared, 'coder:moves', 0)).toMatchObject({ mastered: true, gold: 2 });
  });

  it('does not master a unit with silver stars or with one quest repeated', () => {
    let w = solveAll(fresh(), unit1, true);
    expect(unitState(w.state, w.cleared, 'coder:moves', 0)).toMatchObject({ mastered: false, silver: 3, gold: 0 });
    w = solve(solve(solve(fresh(), 'c-line'), 'c-line'), 'c-line');
    expect(unitState(w.state, w.cleared, 'coder:moves', 0)).toMatchObject({ mastered: false, gold: 1 });
  });

  it('lets a silver quest be upgraded to gold and never downgrades gold', () => {
    let w = solve(fresh(), 'c-line', true);
    expect(questState(w.state, w.cleared, 'c-line').star).toBe('helped');
    const up = recordQuest(w.state, w.cleared, 'c-line', false, D2);
    expect(up.events).toMatchObject({ star: 'clean', upgraded: true, firstClear: false });
    w = { state: up.state, cleared: up.cleared };
    expect(questState(w.state, w.cleared, 'c-line').star).toBe('clean');
    const again = recordQuest(w.state, w.cleared, 'c-line', true, D2);
    expect(again.events).toMatchObject({ star: 'clean', upgraded: false });
    expect(questState(again.state, again.cleared, 'c-line').star).toBe('clean');
  });

  it('keeps one id once in the cleared list', () => {
    const w = solve(solve(fresh(), 'c-line'), 'c-line');
    expect(w.cleared).toEqual(['c-line']);
  });

  it('ignores a quest that does not exist', () => {
    const r = recordQuest(emptyPath(), ['c-line'], 'nope', false, D1);
    expect(r.cleared).toEqual(['c-line']);
    expect(r.state).toEqual(emptyPath());
  });

  it('sails an island once both units are mastered, stores the date and never undoes it', () => {
    let w = solveAll(fresh(), ['c-line', 'c-ell', 'c-rectangle']);
    expect(islandState(w.state, w.cleared, 'coder:moves').sailed).toBe(false);
    const r = recordQuest(w.state, w.cleared, 'c-triangle', false, D2);
    expect(r.events).toMatchObject({ unitMastered: true, islandSailed: true, opened: 'coder:loops' });
    w = { state: r.state, cleared: r.cleared };
    expect(w.state.sailed['coder:moves']).toBe(D2);
    expect(badgeEarned(w.state, 'coder:moves')).toBe(true);
    // Later play, even helped, changes nothing about sailing.
    const later = recordQuest(w.state, w.cleared, 'c-circle', true, '2026-04-01');
    expect(later.state.sailed['coder:moves']).toBe(D2);
    expect(later.events.islandSailed).toBe(false);
    expect(later.events.opened).toBeNull();
  });

  it('opens the next island only when the previous one is sailed', () => {
    const before = islandState(fresh().state, [], 'coder:loops');
    expect(before.status).toBe('locked');
    const w = sail(fresh(), 'coder:moves');
    expect(islandState(w.state, w.cleared, 'coder:loops').status).toBe('open');
  });
});

describe('unlock order', () => {
  it('opens only the first island, first unit and first quest for a new child', () => {
    const { state, cleared } = fresh();
    expect(islandState(state, cleared, 'coder:moves').status).toBe('open');
    expect(islandState(state, cleared, 'coder:loops').status).toBe('locked');
    expect(unitState(state, cleared, 'coder:moves', 0).status).toBe('open');
    expect(unitState(state, cleared, 'coder:moves', 1).status).toBe('locked');
    expect(questState(state, cleared, 'c-line').status).toBe('open');
    expect(questState(state, cleared, 'c-ell').status).toBe('locked');
    expect(questState(state, cleared, 'c-square').status).toBe('locked');
  });

  it('opens a quest when the ones before it in its unit are cleared, silver or gold', () => {
    const w = solve(fresh(), 'c-line', true);
    expect(questState(w.state, w.cleared, 'c-ell').status).toBe('open');
    expect(questState(w.state, w.cleared, 'c-square').status).toBe('locked');
  });

  it('opens unit 2 when unit 1 is mastered', () => {
    let w = solveAll(fresh(), ['c-line', 'c-ell']);
    expect(unitState(w.state, w.cleared, 'coder:moves', 1).status).toBe('open');
    w = solveAll(fresh(), ['c-line', 'c-ell', 'c-square'], true);
    expect(unitState(w.state, w.cleared, 'coder:moves', 1).status).toBe('locked');
  });

  it('never locks what a child already did', () => {
    // Quests cleared out of order, on an island that is not yet unlocked.
    const w = solveAll(fresh(), ['c-star', 'c-sketch']);
    expect(islandState(w.state, w.cleared, 'coder:loops').status).toBe('open');
    expect(unitState(w.state, w.cleared, 'coder:loops', 1).status).toBe('open');
    expect(questState(w.state, w.cleared, 'c-star').status).toBe('cleared');
    expect(islandState(w.state, w.cleared, 'coder:events').status).toBe('open');
    expect(islandState(w.state, w.cleared, 'coder:decisions').status).toBe('locked');
  });
});

describe('next stop', () => {
  it('starts a new child on the first quest', () => {
    expect(nextStop(emptyPath(), [], 'coder', D1)).toEqual({ kind: 'quest', questId: 'c-line', islandKey: 'coder:moves', unitIndex: 0 });
    expect(nextStop(emptyPath(), [], 'little', D1)).toMatchObject({ kind: 'quest', questId: 'l-walk' });
  });

  it('goes to the next quest in the unit, then the next unit once the first is mastered', () => {
    let w = solve(fresh(), 'c-line');
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toMatchObject({ kind: 'quest', questId: 'c-ell' });
    w = solve(w, 'c-ell');
    // Unit 1 is mastered, so the bonus quest c-square waits and unit 2 begins.
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toMatchObject({ kind: 'quest', questId: 'c-rectangle', unitIndex: 1 });
    w = solve(w, 'c-rectangle');
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toMatchObject({ kind: 'quest', questId: 'c-triangle', unitIndex: 1 });
  });

  it('suggests trying a silver quest again when a unit has no gold stars to master it', () => {
    const w = solveAll(fresh(), ['c-line', 'c-ell', 'c-square'], true);
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toEqual({ kind: 'retry', questId: 'c-line', islandKey: 'coder:moves', unitIndex: 0 });
    const one = solve(w, 'c-line');
    expect(nextStop(one.state, one.cleared, 'coder', D1)).toMatchObject({ kind: 'retry', questId: 'c-ell' });
  });

  it('moves to the next island after sailing', () => {
    const w = sail(fresh(), 'coder:moves');
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toMatchObject({ kind: 'quest', questId: 'c-repeat', islandKey: 'coder:loops' });
  });

  it('keeps the two modes apart', () => {
    const w = sail(fresh(), 'little:moves');
    expect(nextStop(w.state, w.cleared, 'little', D1)).toMatchObject({ islandKey: 'little:loops' });
    expect(nextStop(w.state, w.cleared, 'coder', D1)).toMatchObject({ islandKey: 'coder:moves' });
  });

  it('offers a due review, then a bonus quest, then done once every island is sailed', () => {
    let w = fresh();
    for (const island of islandsFor('little')) w = sail(w, island.key);
    // Sailed on D1, so the review is due on D1 + 2 days.
    expect(nextStop(w.state, w.cleared, 'little', D1)).toMatchObject({ kind: 'bonus', questId: 'l-zigzag' });
    const due = addDays(D1, 2);
    expect(nextStop(w.state, w.cleared, 'little', due)).toMatchObject({ kind: 'review' });
    w = solveAll(w, QUESTS.filter((q) => q.audience === 'little').map((q) => q.id));
    expect(nextStop(w.state, w.cleared, 'little', D1)).toEqual({ kind: 'done' });
  });
});

describe('spaced review', () => {
  const sailedOnD1 = (): World => sail(fresh(), 'coder:moves', D1);

  it('is due two days after sailing, not before', () => {
    const w = sailedOnD1();
    expect(w.state.reviews['coder:moves']).toEqual({ box: 0, due: addDays(D1, 2), last: [] });
    expect(reviewDue(w.state, D1)).toBeNull();
    expect(reviewDue(w.state, addDays(D1, 1))).toBeNull();
    expect(reviewDue(w.state, addDays(D1, 2))).toBe('coder:moves');
    expect(reviewDue(w.state, addDays(D1, 40))).toBe('coder:moves');
  });

  it('follows the 2, 7, 21 then 60 day ladder after reviews solved without help', () => {
    let { state } = sailedOnD1();
    let day = addDays(D1, 2);
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      state = finishReview(state, 'coder:moves', [{ questId: 'c-line', helped: false }, { questId: 'c-ell', helped: false }], day);
      gaps.push(dayDiff(day, state.reviews['coder:moves']!.due));
      day = state.reviews['coder:moves']!.due;
    }
    expect(gaps).toEqual([7, 21, 60, 60, 60, 60]);
    expect(state.reviews['coder:moves']!.box).toBe(6);
  });

  it('keeps the box and brings the review back in two days when help was used', () => {
    let { state } = sailedOnD1();
    const day = addDays(D1, 2);
    state = finishReview(state, 'coder:moves', [{ questId: 'c-line', helped: false }, { questId: 'c-ell', helped: false }], day);
    expect(state.reviews['coder:moves']!.box).toBe(1);
    const later = addDays(day, 7);
    state = finishReview(state, 'coder:moves', [{ questId: 'c-line', helped: true }, { questId: 'c-ell', helped: false }], later);
    expect(state.reviews['coder:moves']).toMatchObject({ box: 1, due: addDays(later, 2) });
  });

  it('never lowers the box, however late the review is', () => {
    let { state } = sailedOnD1();
    state = finishReview(state, 'coder:moves', [{ questId: 'c-line', helped: false }], addDays(D1, 2));
    const box = state.reviews['coder:moves']!.box;
    state = finishReview(state, 'coder:moves', [{ questId: 'c-line', helped: true }], addDays(D1, 400));
    expect(state.reviews['coder:moves']!.box).toBe(box);
  });

  it('offers at most one review a day, the most overdue one first', () => {
    let w = fresh();
    w = sail(w, 'coder:moves', '2026-03-01');
    w = sail(w, 'coder:loops', '2026-03-05');
    const today = '2026-03-20';
    expect(reviewDue(w.state, today, 'coder')).toBe('coder:moves');
    const done = finishReview(w.state, 'coder:moves', [{ questId: 'c-line', helped: false }], today);
    expect(done.reviewedOn).toBe(today);
    expect(reviewDue(done, today, 'coder')).toBeNull();
    expect(reviewDue(done, addDays(today, 1), 'coder')).toBe('coder:loops');
  });

  it('does not offer a review when the clock moves backwards', () => {
    const w = sailedOnD1();
    expect(reviewDue(w.state, '2026-01-01')).toBeNull();
  });

  it('only looks at the mode asked for', () => {
    const w = sailedOnD1();
    expect(reviewDue(w.state, addDays(D1, 5), 'little')).toBeNull();
    expect(reviewDue(w.state, addDays(D1, 5), 'coder')).toBe('coder:moves');
  });

  it('visits the two quests done longest ago, in island order on ties', () => {
    let w = fresh();
    w = solve(w, 'c-line', false, '2026-03-01');
    w = solve(w, 'c-ell', false, '2026-03-01');
    w = solve(w, 'c-rectangle', false, '2026-03-02');
    w = solve(w, 'c-triangle', false, '2026-03-02');
    expect(reviewPlan(w.state, w.cleared, 'coder:moves')).toEqual(['c-line', 'c-ell']);
    w = solve(w, 'c-line', false, '2026-03-10');
    expect(reviewPlan(w.state, w.cleared, 'coder:moves')).toEqual(['c-ell', 'c-rectangle']);
  });

  it('skips the quests used in the last review when there are enough others', () => {
    let w = sailedOnD1();
    w = solveAll(w, ['c-square', 'c-circle'], false, '2026-03-02');
    const plan = reviewPlan(w.state, w.cleared, 'coder:moves');
    const state = finishReview(w.state, 'coder:moves', plan.map((questId) => ({ questId, helped: false })), addDays(D1, 2));
    const next = reviewPlan(state, w.cleared, 'coder:moves');
    expect(next).toHaveLength(2);
    for (const id of next) expect(plan).not.toContain(id);
  });

  it('uses the last quests again when there are not enough others', () => {
    const w = solveAll(fresh(), ['c-line', 'c-ell']);
    const state: PathState = { ...w.state, sailed: { 'coder:moves': D1 }, reviews: { 'coder:moves': { box: 0, due: D1, last: ['c-line', 'c-ell'] } } };
    expect(reviewPlan(state, w.cleared, 'coder:moves').sort()).toEqual(['c-ell', 'c-line']);
  });

  it('returns nothing to review for an island that does not exist', () => {
    expect(reviewPlan(emptyPath(), [], 'coder:nope')).toEqual([]);
  });
});

describe('migration', () => {
  it('turns old progress into gold stars dated today and loses nothing', () => {
    const old = ['l-walk', 'c-line', 'c-square', 'not-a-quest'];
    const state = migrate(old, null, D1);
    expect(state.quests['c-line']).toEqual({ s: 'clean', d: D1 });
    expect(state.quests['l-walk']).toEqual({ s: 'clean', d: D1 });
    expect(Object.keys(state.quests).sort()).toEqual(['c-line', 'c-square', 'l-walk']);
    const w = { state, cleared: old };
    expect(questState(w.state, w.cleared, 'c-line').status).toBe('cleared');
    expect(islandState(w.state, w.cleared, 'coder:moves').status).toBe('open');
  });

  it('keeps stars a child already earned', () => {
    const stored = { v: 1, quests: { 'c-line': { s: 'helped', d: '2026-02-01' } }, sailed: {}, kept: [], reviews: {}, reviewedOn: null };
    const state = migrate(['c-line', 'c-square'], stored, D1);
    expect(state.quests['c-line']).toEqual({ s: 'helped', d: '2026-02-01' });
    expect(state.quests['c-square']).toEqual({ s: 'clean', d: D1 });
  });

  it('keeps a badge earned under the old rule, for each mode', () => {
    const littleMoves = ['l-walk', 'l-corner', 'l-square', 'l-circle'];
    const coderLoops = ['c-repeat', 'c-star'];
    const state = migrate([...littleMoves, ...coderLoops, 'c-line'], null, D1);
    expect(state.kept.sort()).toEqual(['coder:loops', 'little:moves']);
    expect(badgeEarned(state, 'little:moves')).toBe(true);
    expect(badgeEarned(state, 'coder:moves')).toBe(false);
  });

  it('keeps the badge even though the island is not sailed yet, and opens it', () => {
    const state = migrate(['c-repeat', 'c-star'], null, D1);
    expect(state.sailed['coder:loops']).toBeUndefined();
    expect(badgeEarned(state, 'coder:loops')).toBe(true);
    expect(islandState(state, ['c-repeat', 'c-star'], 'coder:loops').status).toBe('open');
  });

  it('does not add badges on later loads, only the first time', () => {
    const first = migrate([], null, D1);
    const later = migrate(['c-repeat', 'c-star'], first, D2);
    expect(later.kept).toEqual([]);
  });

  it('sails an island that is already mastered, with a first review two days later', () => {
    const state = migrate(['c-line', 'c-ell', 'c-rectangle', 'c-triangle'], null, D1);
    expect(state.sailed['coder:moves']).toBe(D1);
    expect(state.reviews['coder:moves']).toEqual({ box: 0, due: addDays(D1, 2), last: [] });
    expect(reviewDue(state, D1)).toBeNull();
  });

  it('does not sail again or move the review on a later load', () => {
    const ids = ['c-line', 'c-ell', 'c-rectangle', 'c-triangle'];
    const first = migrate(ids, null, D1);
    const later = migrate(ids, first, '2026-04-01');
    expect(later).toEqual(first);
  });

  it('forgets stars for quests no longer in the cleared list but never forgets an island that was sailed', () => {
    const first = migrate(['c-line', 'c-ell', 'c-rectangle', 'c-triangle'], null, D1);
    const later = migrate([], first, D2);
    expect(later.quests).toEqual({});
    expect(later.sailed['coder:moves']).toBe(D1);
  });

  it('does not change what rewards would give back for old progress', () => {
    const old = ['c-repeat', 'c-star', 'c-line'];
    const before = backfillFromProgress(old, D1);
    expect(before.stickers).toContain('loops');
    expect(before.friends).toContain('olly');
  });
});

describe('parsePath', () => {
  it('never throws and returns an empty state for junk', () => {
    for (const junk of [null, undefined, 5, 'x', [], {}, { v: 2 }, { v: 1, quests: 5, sailed: 'x', kept: {}, reviews: [], reviewedOn: 3 }]) {
      expect(() => parsePath(junk)).not.toThrow();
      expect(parsePath(junk)).toEqual(emptyPath());
    }
  });

  it('drops unknown ids, bad dates and wrong types', () => {
    const parsed = parsePath({
      v: 1,
      quests: { 'c-line': { s: 'clean', d: D1 }, nope: { s: 'clean', d: D1 }, 'c-ell': { s: 'gold', d: D1 }, 'c-square': { s: 'clean', d: '2026-13-45' }, 'c-star': 7 },
      sailed: { 'coder:moves': D1, 'coder:nope': D1, 'coder:loops': 'yesterday' },
      kept: ['coder:moves', 'coder:moves', 'coder:nope', 4],
      reviews: {
        'coder:moves': { box: 2, due: D2, last: ['c-line', 'nope', 'c-line', 9] },
        'coder:loops': { box: -1, due: D2, last: [] },
        'coder:debugging': { box: 1, due: 'soon', last: [] },
        'coder:nope': { box: 1, due: D2, last: [] },
      },
      reviewedOn: 'never',
    });
    expect(parsed.quests).toEqual({ 'c-line': { s: 'clean', d: D1 } });
    expect(parsed.sailed).toEqual({ 'coder:moves': D1 });
    expect(parsed.kept).toEqual(['coder:moves']);
    expect(parsed.reviews).toEqual({ 'coder:moves': { box: 2, due: D2, last: ['c-line'] } });
    expect(parsed.reviewedOn).toBeNull();
  });

  it('round trips a real state', () => {
    const w = sail(fresh(), 'coder:moves');
    const done = finishReview(w.state, 'coder:moves', [{ questId: 'c-line', helped: false }], addDays(D1, 3));
    expect(parsePath(JSON.parse(JSON.stringify(done)) as unknown)).toEqual(done);
  });
});

describe('help tracker', () => {
  it('starts with no help, notes any source, and resets', () => {
    const help = createHelpTracker();
    expect(help.used()).toBe(false);
    help.note('hint');
    expect(help.used()).toBe(true);
    help.reset();
    expect(help.used()).toBe(false);
    help.note('explain');
    help.note('tutor');
    expect(help.used()).toBe(true);
    help.reset();
    expect(help.used()).toBe(false);
  });

  it('turns into a silver star when passed to recordQuest, and gold when not', () => {
    const help = createHelpTracker();
    help.note('hint');
    const silver = recordQuest(emptyPath(), [], 'c-line', help.used(), D1);
    expect(silver.events.star).toBe('helped');
    help.reset();
    const gold = recordQuest(silver.state, silver.cleared, 'c-line', help.used(), D2);
    expect(gold.events).toMatchObject({ star: 'clean', upgraded: true });
  });
});

describe('island helpers', () => {
  it('lists every quest of an island in unit order', () => {
    expect(islandQuestIds(islandByKey('little:colours')!)).toEqual(['l-colours', 'l-rainbow-triangle', 'l-rainbow-box', 'l-colour-rings', 'l-sunshine', 'l-snowman']);
  });
});

describe('stages: legacy ids keep their place', () => {
  /** Every quest that existed before stages, by island key: unit by unit, in order. Saved progress is keyed by these. */
  const PINNED: Record<string, string[][]> = {
    'little:moves': [['l-walk', 'l-corner', 'l-zigzag'], ['l-square', 'l-rectangle', 'l-circle']],
    'little:loops': [['l-repeat-square', 'l-triangle', 'l-hexagon'], ['l-stairs', 'l-flower-ring', 'l-octagon']],
    'little:colours': [['l-colours', 'l-rainbow-triangle', 'l-rainbow-box'], ['l-colour-rings', 'l-sunshine', 'l-snowman']],
    'coder:moves': [['c-line', 'c-ell', 'c-square'], ['c-rectangle', 'c-triangle', 'c-circle']],
    'coder:loops': [['c-repeat', 'c-loop-triangle', 'c-loop-hexagon'], ['c-star', 'c-loop-spin', 'c-loop-sun']],
    'coder:debugging': [['c-bug-square', 'c-bug-triangle', 'c-bug-star'], ['c-bug-hexagon', 'c-bug-typo', 'c-bug-missing-end']],
    'coder:functions': [['c-box-command', 'c-triangle-command', 'c-function'], ['c-house', 'c-three-squares', 'c-square-ring']],
    'coder:variables': [['c-make-size', 'c-make-double', 'c-shape'], ['c-make-growing', 'c-make-steps', 'c-two-inputs']],
    'coder:decisions': [['c-half-and-half', 'c-gap-square', 'c-bend'], ['c-dashes', 'c-turn-choice', 'c-half-hexagon']],
    'coder:events': [['c-one-key', 'c-game', 'c-space-square'], ['c-stamp', 'c-ticker', 'c-sketch']],
    'coder:recursion': [['c-rec-stairs', 'c-rec-rays', 'c-spiral'], ['c-rec-triangle-spiral', 'c-rec-nested', 'c-rec-pentagon-spiral']],
  };

  it('pins 66 old quest ids to the same island key, unit and position', () => {
    const ids = Object.values(PINNED).flat(2);
    expect(ids).toHaveLength(66);
    for (const [key, units] of Object.entries(PINNED)) {
      units.forEach((unit, unitIndex) =>
        unit.forEach((id, index) => {
          const place = placeOf(id);
          expect([id, place?.island.key, place?.unitIndex, place?.index]).toEqual([id, key, unitIndex, index]);
        }),
      );
    }
  });

  it('gives the 11 old islands a badge equal to their concept and keeps their keys', () => {
    for (const key of Object.keys(PINNED)) {
      const island = islandByKey(key)!;
      expect(island.badge).toBe(island.concept);
      expect(island.key).toBe(key);
      expect(island.art).toBe(island.concept);
      expect(island.stamp).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('stages: stored data from before this release', () => {
  const old = {
    v: 1,
    quests: { 'c-line': { s: 'clean', d: '2026-03-02' }, 'c-ell': { s: 'helped', d: '2026-03-03' }, 'l-walk': { s: 'clean', d: '2026-03-02' } },
    sailed: { 'coder:moves': '2026-03-04', 'little:moves': '2026-03-05' },
    kept: ['coder:loops'],
    reviews: { 'coder:moves': { box: 1, due: '2026-03-11', last: ['c-line', 'c-ell'] } },
    reviewedOn: '2026-03-04',
  };

  it('parses to identical old data plus empty new fields', () => {
    const parsed = parsePath(old);
    expect({ ...parsed, tested: undefined, master: undefined }).toEqual({ ...old, tested: undefined, master: undefined });
    expect(parsed.tested).toEqual({});
    expect(parsed.master).toEqual({});
  });

  it('migrates without changing stars, sailing, badges or reviews, and does not treat it as a first load', () => {
    const cleared = ['c-line', 'c-ell', 'l-walk'];
    const state = migrate(cleared, old, '2026-04-01');
    expect(state.quests).toEqual(parsePath(old).quests);
    expect(state.sailed).toEqual(old.sailed);
    expect(state.kept).toEqual(old.kept);
    expect(state.reviews).toEqual(old.reviews);
    expect(state.reviewedOn).toBe(old.reviewedOn);
    expect(state.tested).toEqual({});
    expect(state.master).toEqual({});
  });

  it('round trips new fields and drops bad ones without throwing', () => {
    const state = { ...emptyPath(), tested: { 'coder:loops': '2026-03-02' }, master: { coder: '2026-05-01' } };
    expect(parsePath(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const junk = parsePath({ v: 1, tested: { 'coder:nope': '2026-03-02', 'coder:loops': 'yesterday', 'little:moves': '2026-02-30' }, master: { coder: 5, little: '2026-13-01' } });
    expect(junk.tested).toEqual({});
    expect(junk.master).toEqual({});
    expect(parsePath({ v: 1, tested: 'x', master: [] })).toEqual(emptyPath());
  });
});

describe('stages: tested out and Logo Master', () => {
  it('opens the next stage when the previous one is tested out, and the stage itself when it is tested', () => {
    const base = fresh();
    expect(islandState(base.state, base.cleared, 'coder:loops').status).toBe('locked');
    const prev = { ...base.state, tested: { 'coder:moves': D1 } };
    expect(islandState(prev, base.cleared, 'coder:loops').status).toBe('open');
    expect(islandState(prev, base.cleared, 'coder:loops').tested).toBe(false);
    expect(islandState(prev, base.cleared, 'coder:moves').tested).toBe(true);
    const self = { ...base.state, tested: { 'coder:functions': D1 } };
    expect(islandState(self, base.cleared, 'coder:functions').status).toBe('open');
    expect(islandState(self, base.cleared, 'coder:debugging').status).toBe('locked');
  });

  it('sends the child past tested stages and still lets a tested stage be sailed later', () => {
    const state = { ...emptyPath(), tested: { 'coder:moves': D1, 'coder:loops': D1 } };
    expect(nextStop(state, [], 'coder', D1)).toMatchObject({ kind: 'quest', islandKey: 'coder:colour-cove', questId: 'c-red-blue' });
    const w = sail({ state, cleared: [] }, 'coder:moves');
    expect(w.state.sailed['coder:moves']).toBe(D1);
    expect(w.state.tested['coder:moves']).toBe(D1);
  });

  it('is not Logo Master until the last stage is sailed and every other stage is sailed or tested', () => {
    const keys = islandsFor('coder').map((i) => i.key);
    const last = keys[keys.length - 1]!;
    let w: World = fresh();
    expect(masterReady(w.state, 'coder')).toBe(false);
    for (const key of keys.slice(0, -1)) w = sail(w, key);
    expect(masterReady(w.state, 'coder')).toBe(false);
    w = sail(w, last);
    expect(masterReady(w.state, 'coder')).toBe(true);
    expect(masterReady(w.state, 'little')).toBe(false);
  });

  it('counts tested stages but never a tested last stage, and the first solve that completes it reports masterEarned once', () => {
    const keys = islandsFor('coder').map((i) => i.key);
    const last = islandByKey(keys[keys.length - 1]!)!;
    const tested = Object.fromEntries(keys.slice(0, -1).map((k) => [k, D1]));
    const state: PathState = { ...emptyPath(), tested };
    expect(masterReady({ ...state, tested: { ...tested, [last.key]: D1 } }, 'coder')).toBe(false);

    const [a, b] = [last.units[0]![0], last.units[0]![1]];
    const [c, d] = [last.units[1]![0], last.units[1]![1]];
    let w: World = { state, cleared: [] };
    for (const id of [a, b, c]) {
      const r = recordQuest(w.state, w.cleared, id, false, D2);
      expect(r.events.masterEarned).toBe(false);
      w = { state: r.state, cleared: r.cleared };
    }
    const finishing = recordQuest(w.state, w.cleared, d, false, D2);
    expect(finishing.events.islandSailed).toBe(true);
    expect(finishing.events.masterEarned).toBe(true);
    expect(finishing.state.master.coder).toBe(D2);
    const again = recordQuest(finishing.state, finishing.cleared, last.units[1]![2], false, '2026-04-01');
    expect(again.events.masterEarned).toBe(false);
    expect(again.state.master.coder).toBe(D2);
  });

  it('records the master date once and never clears it', () => {
    const once = recordMaster(emptyPath(), 'little', D1);
    expect(once.master).toEqual({ little: D1 });
    expect(recordMaster(once, 'little', D2).master.little).toBe(D1);
    expect(recordMaster(once, 'coder', D2).master).toEqual({ little: D1, coder: D2 });
  });

  it('lists a sticker only for stages that have one', () => {
    expect(ALL_ISLANDS.every((i) => i.badge === null || i.badge === i.concept)).toBe(true);
  });
});