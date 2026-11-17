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
    expect(STICKERS).toHaveLength(11);
    expect(SHELL_SLOTS).toBe(7);
    for (const item of [...FRIENDS, ...STICKERS]) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.hint.length).toBeGreaterThan(0);
      expect(item.modes.length).toBeGreaterThan(0);
    }
    expect(new Set(FRIEND_IDS).size).toBe(9);
    expect(new Set(STICKER_IDS).size).toBe(11);
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
