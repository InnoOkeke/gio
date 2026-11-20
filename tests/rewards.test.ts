import { describe, it, expect } from 'vitest';
import { FRIENDS, FRIEND_IDS, SHELL_SLOTS, STICKERS, STICKER_IDS } from '../src/ui/gio/catalog';
import {
  MAX_DAYS,
  applyEvent,
  backfillFromProgress,
  daysAway,
  daysThisWeek,
  emptyRewards,
  localDateKey,
  parseRewards,
  placeSticker,
  totalDays,
  weekCopy,
  weekView,
  type RewardEvent,
} from '../src/ui/gio/rewards';
import { moodFor } from '../src/ui/gio/mood';
import { LINES, friendIntro, pickLine } from '../src/ui/gio/lines';
import { QUESTS, type Feature } from '../src/logo/quests.js';

const TODAY = '2025-06-10';
const run = (features: Feature[], colours = 1, drewLines = true): RewardEvent => ({ kind: 'run-ok', features, colours, drewLines });

describe('catalog', () => {
  it('gives every friend and sticker a name, hint and modes', () => {
    expect(FRIENDS).toHaveLength(9);
    expect(STICKERS).toHaveLength(12);
    expect(SHELL_SLOTS).toBe(7);
    for (const item of [...FRIENDS, ...STICKERS]) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.hint.length).toBeGreaterThan(0);
      expect(item.modes.length).toBeGreaterThan(0);
    }
    expect(new Set(FRIEND_IDS).size).toBe(9);
    expect(new Set(STICKER_IDS).size).toBe(12);
  });

  it('keeps every friend introduction short enough for one bubble', () => {
    for (const f of FRIENDS) expect(friendIntro(f).length).toBeLessThan(140);
  });
});

describe('friends unlock on their own event only', () => {
  const cases: [string, RewardEvent, string][] = [
    ['olly', run(['REPEAT']), 'olly'],
    ['puff', run(['CIRCLE']), 'puff'],
    ['nutmeg', run(['MAKE']), 'nutmeg'],
    ['hoot', run(['IF']), 'hoot'],
    ['bree', run(['TO']), 'bree'],
    ['spindle', run(['TO', 'RECURSION']), 'spindle'],
    ['hop', run(['WHEN']), 'hop'],
    ['chip', run([], 2), 'chip'],
    ['dot', { kind: 'bug-fixed' }, 'dot'],
  ];
  for (const [name, event, expected] of cases) {
    it(`${name}`, () => {
      const r = applyEvent(emptyRewards(), event, TODAY);
      expect(r.newFriends).toContain(expected);
      expect(r.state.friends).toContain(expected);
    });
  }

  it('does not give other friends for a single feature', () => {
    expect(applyEvent(emptyRewards(), run(['REPEAT']), TODAY).newFriends).toEqual(['olly']);
    expect(applyEvent(emptyRewards(), run([], 1), TODAY).newFriends).toEqual([]);
  });

  it('unlocks nothing for a run with no feature, but still counts the day', () => {
    const r = applyEvent(emptyRewards(), run([], 1, false), TODAY);
    expect(r.newFriends).toEqual([]);
    expect(r.newStickers).toEqual([]);
    expect(r.state.days).toEqual([TODAY]);
  });

  it('treats a completed debugging quest as a fixed bug', () => {
    const r = applyEvent(emptyRewards(), { kind: 'quest-done', questId: 'c-bug-square', features: ['REPEAT'], colours: 1, newBadge: null }, TODAY);
    expect(r.newFriends).toEqual(expect.arrayContaining(['dot', 'olly']));
    expect(r.newStickers).toContain('bug-fixer');
  });

  it('gives the badge sticker for a new badge', () => {
    const r = applyEvent(emptyRewards(), { kind: 'quest-done', questId: 'c-repeat', features: ['REPEAT'], colours: 1, newBadge: 'loops' }, TODAY);
    expect(r.newStickers).toEqual(['loops']);
  });
});

describe('applyEvent', () => {
  it('is idempotent', () => {
    const first = applyEvent(emptyRewards(), run(['REPEAT']), TODAY);
    const second = applyEvent(first.state, run(['REPEAT']), TODAY);
    expect(second.newFriends).toEqual([]);
    expect(second.newStickers).toEqual([]);
    expect(second.state).toEqual(first.state);
  });

  it('places a new sticker in the first free shell spot', () => {
    const a = applyEvent(emptyRewards(), run([]), TODAY);
    expect(a.state.shell[0]).toBe('first-drawing');
    const b = applyEvent(a.state, { kind: 'bug-fixed' }, TODAY);
    expect(b.state.shell[1]).toBe('bug-fixer');
  });

  it('never wears more than 7 stickers but still earns them all', () => {
    let state = emptyRewards();
    const concepts = ['moves', 'colours', 'loops', 'functions', 'variables', 'decisions', 'recursion', 'debugging'] as const;
    for (const c of concepts) {
      state = applyEvent(state, { kind: 'quest-done', questId: 'x', features: [], colours: 1, newBadge: c }, TODAY).state;
    }
    state = applyEvent(state, run([]), TODAY).state;
    expect(state.stickers).toHaveLength(9);
    expect(state.shell).toHaveLength(SHELL_SLOTS);
    expect(state.shell.filter((s) => s !== null)).toHaveLength(SHELL_SLOTS);
    expect(state.shell).not.toContain('first-drawing');
  });

  it('keeps days unique, sorted and capped', () => {
    let state = emptyRewards();
    state = applyEvent(state, run([]), '2025-06-10').state;
    state = applyEvent(state, run([]), '2025-06-08').state;
    state = applyEvent(state, run([]), '2025-06-10').state;
    expect(state.days).toEqual(['2025-06-08', '2025-06-10']);
    const many = { ...emptyRewards(), days: Array.from({ length: MAX_DAYS }, (_, i) => localDateKey(new Date(2020, 0, 1 + i, 12))) };
    const next = applyEvent(many, run([]), '2030-01-01');
    expect(next.state.days).toHaveLength(MAX_DAYS);
    expect(next.state.days[MAX_DAYS - 1]).toBe('2030-01-01');
  });
});

describe('adventure-level event', () => {
  const win = (over: Partial<Extract<RewardEvent, { kind: 'adventure-level' }>> = {}): RewardEvent => ({ kind: 'adventure-level', levelId: 'woods-05', mode: 'coder', features: [], fixedBug: false, ...over });

  it('gives the Adventurer sticker and counts the day, and nothing else for a plain win', () => {
    const r = applyEvent(emptyRewards(), win(), TODAY);
    expect(r.newStickers).toEqual(['adventurer']);
    expect(r.newFriends).toEqual([]);
    expect(r.state.days).toEqual([TODAY]);
    expect(r.state.shell[0]).toBe('adventurer');
  });

  it('frees the friend for the feature the plan used', () => {
    expect(applyEvent(emptyRewards(), win({ features: ['REPEAT'] }), TODAY).newFriends).toEqual(['olly']);
    expect(applyEvent(emptyRewards(), win({ features: ['IF'] }), TODAY).newFriends).toEqual(['hoot']);
  });

  it('keeps coder-only friends away from Little Turtles', () => {
    expect(applyEvent(emptyRewards(), win({ mode: 'little', features: ['IF'] }), TODAY).newFriends).toEqual([]);
    expect(applyEvent(emptyRewards(), win({ mode: 'little', features: ['REPEAT'] }), TODAY).newFriends).toEqual(['olly']);
  });

  it('gives Dot and the bug fixer sticker for a fixed bug', () => {
    const r = applyEvent(emptyRewards(), win({ levelId: 'maze-05', fixedBug: true }), TODAY);
    expect(r.newFriends).toEqual(['dot']);
    expect(r.newStickers).toEqual(expect.arrayContaining(['adventurer', 'bug-fixer']));
  });

  it('earns nothing twice, also after the same friend came from a quest', () => {
    const fromQuest = applyEvent(emptyRewards(), run(['REPEAT']), TODAY).state;
    const first = applyEvent(fromQuest, win({ features: ['REPEAT'] }), TODAY);
    expect(first.newFriends).toEqual([]);
    const second = applyEvent(first.state, win({ features: ['REPEAT'] }), TODAY);
    expect(second.newFriends).toEqual([]);
    expect(second.newStickers).toEqual([]);
    expect(second.state).toEqual(first.state);
  });

  it('survives a round trip through parseRewards', () => {
    const state = applyEvent(emptyRewards(), win({ features: ['REPEAT'] }), TODAY).state;
    expect(parseRewards(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
describe('placeSticker', () => {
  const earned = applyEvent(applyEvent(emptyRewards(), run([]), TODAY).state, { kind: 'bug-fixed' }, TODAY).state;

  it('rejects stickers that were not earned', () => {
    expect(placeSticker(earned, 3, 'loops')).toBe(earned);
  });

  it('moves a sticker that is already worn', () => {
    const moved = placeSticker(earned, 5, 'first-drawing');
    expect(moved.shell[5]).toBe('first-drawing');
    expect(moved.shell[0]).toBeNull();
    expect(moved.shell.filter((s) => s === 'first-drawing')).toHaveLength(1);
  });

  it('clears a spot and ignores bad slots', () => {
    expect(placeSticker(earned, 0, null).shell[0]).toBeNull();
    expect(placeSticker(earned, 7, 'bug-fixer')).toBe(earned);
    expect(placeSticker(earned, -1, 'bug-fixer')).toBe(earned);
    expect(placeSticker(earned, 1.5, 'bug-fixer')).toBe(earned);
  });
});

describe('parseRewards', () => {
  it('returns empty rewards for garbage', () => {
    for (const raw of [null, undefined, 5, 'x', [], {}, { v: 2, friends: ['olly'] }]) {
      expect(parseRewards(raw)).toEqual(emptyRewards());
    }
  });

  it('drops unknown ids and bad dates', () => {
    const s = parseRewards({ v: 1, friends: ['olly', 'ghost', 4], stickers: ['loops', 'nope'], shell: [], days: ['2025-02-30', 'x', '2025-06-01', '2025-06-01'] });
    expect(s.friends).toEqual(['olly']);
    expect(s.stickers).toEqual(['loops']);
    expect(s.days).toEqual(['2025-06-01']);
  });

  it('repairs shell length, duplicates and unearned stickers', () => {
    const s = parseRewards({ v: 1, friends: [], stickers: ['loops', 'moves'], shell: ['loops', 'loops', 'colours', 'moves', null, 'x', 'moves', 'moves', 'moves'], days: [] });
    expect(s.shell).toEqual(['loops', null, null, 'moves', null, null, null]);
    expect(parseRewards({ v: 1, shell: 'bad' }).shell).toHaveLength(SHELL_SLOTS);
  });

  it('round-trips valid state', () => {
    const s = applyEvent(emptyRewards(), run(['REPEAT']), TODAY).state;
    expect(parseRewards(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('backfillFromProgress', () => {
  it('gives nothing for no history', () => {
    expect(backfillFromProgress([], TODAY)).toEqual(emptyRewards());
  });

  it('rebuilds a little history', () => {
    const ids = QUESTS.filter((q) => q.audience === 'little').map((q) => q.id);
    const s = backfillFromProgress(ids, TODAY);
    expect(s.friends).toEqual(expect.arrayContaining(['olly', 'puff', 'chip']));
    expect(s.friends).not.toContain('hoot');
    expect(s.stickers).toEqual(expect.arrayContaining(['moves', 'loops', 'colours', 'first-drawing']));
    expect(s.days).toEqual([]);
  });

  it('rebuilds a coder history, and a partial badge earns no sticker', () => {
    const all = backfillFromProgress(QUESTS.filter((q) => q.audience === 'coder').map((q) => q.id), TODAY);
    expect(all.friends).toEqual(expect.arrayContaining(['olly', 'dot', 'hoot', 'bree', 'spindle', 'hop']));
    expect(all.stickers).toEqual(expect.arrayContaining(['debugging', 'bug-fixer', 'events', 'recursion']));
    expect(all.shell.filter((s) => s !== null)).toHaveLength(SHELL_SLOTS);
    const partial = backfillFromProgress(['c-bug-square'], TODAY);
    expect(partial.stickers).not.toContain('debugging');
    expect(partial.stickers).toContain('bug-fixer');
  });
});

describe('dates', () => {
  it('formats local dates with padding', () => {
    expect(localDateKey(new Date(2025, 0, 5, 23, 59))).toBe('2025-01-05');
  });

  it('builds a 7 day week ending today', () => {
    const w = weekView(['2025-06-04', '2025-06-10', '2025-05-01'], TODAY);
    expect(w.map((d) => d.date)).toEqual(['2025-06-04', '2025-06-05', '2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09', '2025-06-10']);
    expect(w.map((d) => d.learned)).toEqual([true, false, false, false, false, false, true]);
    expect(w.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
    expect(daysThisWeek(['2025-06-04', '2025-06-10', '2025-05-01'], TODAY)).toBe(2);
  });

  it('counts days away', () => {
    expect(daysAway([], TODAY)).toBe(0);
    expect(daysAway(['2025-06-10'], TODAY)).toBe(0);
    expect(daysAway(['2025-06-05'], TODAY)).toBe(5);
    expect(daysAway(['2025-06-20'], TODAY)).toBe(0);
  });

  it('stays correct across daylight saving changes', () => {
    for (const [a, b, n] of [
      ['2025-03-29', '2025-03-31', 2],
      ['2025-03-08', '2025-03-10', 2],
      ['2025-10-25', '2025-10-27', 2],
      ['2025-11-01', '2025-11-03', 2],
      ['2025-12-31', '2026-01-02', 2],
    ] as const) {
      expect(daysAway([a], b)).toBe(n);
    }
    const w = weekView([], '2025-03-31').map((d) => d.date);
    expect(w).toEqual(['2025-03-25', '2025-03-26', '2025-03-27', '2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31']);
    expect(weekView([], '2025-11-03').map((d) => d.date)).toEqual(['2025-10-28', '2025-10-29', '2025-10-30', '2025-10-31', '2025-11-01', '2025-11-02', '2025-11-03']);
  });

  it('never lowers the total after a long gap', () => {
    const a = applyEvent(emptyRewards(), run([]), '2025-01-01').state;
    const b = applyEvent(a, run([]), '2025-09-01').state;
    expect(totalDays(a.days)).toBe(1);
    expect(totalDays(b.days)).toBe(2);
    expect(daysThisWeek(b.days, '2025-09-01')).toBe(1);
  });
});

describe('mood and lines', () => {
  it('maps kinds to default moods', () => {
    expect(moodFor({ kind: 'success' })).toBe('happy');
    expect(moodFor({ kind: 'problem' })).toBe('curious');
    expect(moodFor({ kind: 'info' })).toBe('idle');
  });

  it('lets an explicit mood win', () => {
    expect(moodFor({ kind: 'problem', mood: 'calm' })).toBe('calm');
    expect(moodFor({ kind: 'success', mood: 'cheer' })).toBe('cheer');
  });

  it('picks lines deterministically and wraps', () => {
    const pool = LINES.little.success;
    expect(pickLine(pool, 0)).toBe(pool[0]);
    expect(pickLine(pool, pool.length)).toBe(pool[0]);
    expect(pickLine(pool, -1)).toBe(pool[pool.length - 1]);
    expect(pickLine(pool, 4)).toBe(pickLine(pool, 4));
    expect(pickLine([], 3)).toBe('');
  });

  it('uses no emoji in any line', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const pools of Object.values(LINES)) for (const pool of Object.values(pools)) for (const line of pool) expect(emoji.test(line)).toBe(false);
  });
});

describe('weekCopy', () => {
  const sayings = (s: ReturnType<typeof emptyRewards>) => {
    const c = weekCopy(s, TODAY);
    return `${c.headline} ${c.footer}`;
  };

  it('welcomes a legacy child whose garden grew before days were counted', () => {
    const legacy = backfillFromProgress(['l-walk', 'l-corner', 'l-square'], TODAY);
    expect(legacy.days).toEqual([]);
    expect(legacy.friends.length + legacy.stickers.length).toBeGreaterThan(0);
    expect(weekCopy(legacy, TODAY)).toEqual({
      headline: 'Your garden is already growing!',
      footer: 'You started before we counted days. Learn something today and your first dot will light up.',
    });
    expect(sayings(legacy)).not.toMatch(/\b0 days?\b/);
  });

  it('invites a brand-new child to fill the first dot', () => {
    expect(weekCopy(emptyRewards(), TODAY)).toEqual({
      headline: 'Your first dot is waiting for you.',
      footer: 'Learn something today to fill your first dot.',
    });
  });

  it('is gentle after a quiet week, with singular and plural day counts', () => {
    const one = { ...emptyRewards(), days: ['2025-05-01'] };
    expect(weekCopy(one, TODAY)).toEqual({
      headline: 'A fresh week is starting.',
      footer: '1 day so far. Learn something today to light up a new dot.',
    });
    const three = { ...emptyRewards(), days: ['2025-05-01', '2025-05-02', '2025-05-03'] };
    expect(weekCopy(three, TODAY).footer).toBe('3 days so far. Learn something today to light up a new dot.');
    expect(sayings(three)).not.toMatch(/\b0 days?\b/);
  });

  it('keeps the existing wording when the child learned this week', () => {
    const one = { ...emptyRewards(), days: ['2025-05-01', '2025-06-10'] };
    expect(weekCopy(one, TODAY)).toEqual({
      headline: 'You learned on 1 day this week.',
      footer: '2 days in total. Every day counts, and your garden keeps what it grew.',
    });
    const two = { ...emptyRewards(), days: ['2025-06-09', '2025-06-10'] };
    expect(weekCopy(two, TODAY).headline).toBe('You learned on 2 days this week.');
  });
});
describe('golden shell', () => {
  it('starts without one and parses old stored rewards to the same data plus no golden shell', () => {
    expect(emptyRewards().goldenShell).toBe(false);
    const old = { v: 1, friends: ['puff'], stickers: ['first-drawing'], shell: ['first-drawing', null, null, null, null, null, null], days: ['2025-06-01'] };
    const parsed = parseRewards(old);
    expect({ ...parsed, goldenShell: undefined }).toEqual({ ...emptyRewards(), ...old, shell: parsed.shell, goldenShell: undefined });
    expect(parsed.friends).toEqual(['puff']);
    expect(parsed.stickers).toEqual(['first-drawing']);
    expect(parsed.days).toEqual(['2025-06-01']);
    expect(parsed.goldenShell).toBe(false);
  });

  it('is earned by the logo-master event, takes no shell spot and records the day', () => {
    const before = emptyRewards();
    const r = applyEvent(before, { kind: 'logo-master' }, TODAY);
    expect(r.state.goldenShell).toBe(true);
    expect(r.newFriends).toEqual([]);
    expect(r.newStickers).toEqual([]);
    expect(r.state.shell).toEqual(before.shell);
    expect(r.state.days).toEqual([TODAY]);
  });

  it('is kept by every later event and by a round trip through storage', () => {
    const golden = applyEvent(emptyRewards(), { kind: 'logo-master' }, TODAY).state;
    expect(applyEvent(golden, run(['REPEAT']), TODAY).state.goldenShell).toBe(true);
    expect(applyEvent(golden, { kind: 'bug-fixed' }, TODAY).state.goldenShell).toBe(true);
    expect(parseRewards(JSON.parse(JSON.stringify(golden)))).toEqual(golden);
    expect(applyEvent(golden, { kind: 'logo-master' }, TODAY).state).toEqual(golden);
  });

  it('only believes a real true, and a run or bug fix alone never grants it', () => {
    expect(parseRewards({ v: 1, goldenShell: 'yes' }).goldenShell).toBe(false);
    expect(parseRewards({ v: 1, goldenShell: true }).goldenShell).toBe(true);
    expect(applyEvent(emptyRewards(), run(['REPEAT']), TODAY).state.goldenShell).toBe(false);
    expect(backfillFromProgress(QUESTS.map((q) => q.id), TODAY).goldenShell).toBe(false);
  });
});
