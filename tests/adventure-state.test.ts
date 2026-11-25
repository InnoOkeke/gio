import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { LEVELS, playLevel, type AgeModeId, type Level, type RealmId } from '../src/logo/adventure/index.js';
import {
  MAX_CODES,
  MAX_CODE_CHARS,
  REALM_ORDER,
  emptyAdventure,
  followingLevel,
  gateLevel,
  levelKey,
  levelStatus,
  levelsFor,
  markIntro,
  nextLevel,
  parseAdventure,
  parsePlans,
  realmStatus,
  realmsFor,
  recordLevel,
  rewardFor,
  savePlan,
  totalStars,
  type AdventureState,
} from '../src/ui/adventure/state';
import { ADVENTURE_KEY, PLANS_KEY, readAdventure, readPlans, writeAdventure, writePlans, type KeyStore } from '../src/ui/adventure/useAdventure';
import { applyEvent, emptyRewards, parseRewards } from '../src/ui/gio/rewards';
import { ADVENTURE_REFERENCE, ADVENTURE_WASTEFUL } from './solutions/adventure';

const TODAY = '2025-06-10';
const read = (...p: string[]) => readFileSync(new URL(`../${p.join('/')}`, import.meta.url), 'utf8');

/** A small well-formed level for rules that do not depend on the Maze data. */
function mk(id: string, realm: RealmId, n: number, over: Partial<Level> = {}): Level {
  return {
    id,
    realm,
    n,
    kind: 'play',
    modes: ['little', 'coder'],
    title: id,
    concept: 'sequence',
    story: 's',
    goal: 'g',
    map: ['S.G'],
    start: { col: 0, row: 0, dir: 'E' },
    allow: { little: ['FORWARD'], coder: ['FORWARD', 'REPEAT', 'FREE'] },
    par: { little: 1, coder: 1 },
    hints: [{ text: 'a' }, { text: 'b' }],
    ...over,
  };
}

const won = (stars: 1 | 2 | 3, commands = 3) => ({ status: 'won' as const, stars, commands });

function fakeStore(initial: Record<string, string> = {}): KeyStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k]! : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe('parseAdventure', () => {
  it('starts empty for anything that is not a stored state', () => {
    for (const raw of [null, undefined, 5, 'x', [], {}, { v: 2 }]) expect(parseAdventure(raw)).toEqual(emptyAdventure());
  });

  it('drops unknown levels, wrong modes, bad dates, bad stars and bad bests, and never throws', () => {
    const raw = {
      v: 1,
      levels: {
        'coder:maze-01': { stars: 3, best: 1, d: TODAY },
        'coder:nope-01': { stars: 3, best: 1, d: TODAY },
        'little:maze-07': { stars: 2, best: 4, d: TODAY },
        'coder:maze-02': { stars: 3, best: 3, d: '2025-02-31' },
        'coder:maze-03': { stars: 4, best: 7, d: TODAY },
        'coder:maze-04': { stars: 2, best: 0, d: TODAY },
        'coder:maze-05': { stars: 2, best: 1.5, d: TODAY },
        'coder:maze-06': 'x',
      },
      intros: ['maze', 'moon', 7],
      bosses: ['coder:maze-08', 'coder:ghost', 4],
      critters: -3,
    };
    const out = parseAdventure(raw);
    expect(Object.keys(out.levels)).toEqual(['coder:maze-01']);
    expect(out.intros).toEqual(['maze']);
    expect(out.bosses).toEqual(['coder:maze-08']);
    expect(out.critters).toBe(0);
    expect(() => parseAdventure({ v: 1, levels: 5, intros: 'x', bosses: {}, critters: 'many' })).not.toThrow();
  });

  it('round-trips what recordLevel makes', () => {
    const level = LEVELS[0]!;
    const { state } = recordLevel(emptyAdventure(), 'coder', level, won(3, 1), TODAY);
    expect(parseAdventure(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});

describe('recordLevel', () => {
  const l1 = LEVELS[0]!;
  const l2 = LEVELS[1]!;

  it('ignores runs that did not win', () => {
    const s = emptyAdventure();
    for (const status of ['lost', 'unfinished', 'error'] as const) {
      const r = recordLevel(s, 'coder', l1, { status, stars: 0, commands: 2 }, TODAY);
      expect(r.state).toBe(s);
      expect(r.firstWin).toBe(false);
    }
  });

  it('ignores a level the mode does not play', () => {
    const coderOnly = mk('x-01', 'maze', 9, { modes: ['coder'] });
    const s = emptyAdventure();
    expect(recordLevel(s, 'little', coderOnly, won(3), TODAY, [coderOnly]).state).toBe(s);
  });

  it('keeps stars from falling and best from rising', () => {
    let s = recordLevel(emptyAdventure(), 'coder', l1, won(3, 5), TODAY).state;
    s = recordLevel(s, 'coder', l1, won(1, 9), '2025-06-11').state;
    expect(s.levels['coder:maze-01']).toEqual({ stars: 3, best: 5, d: TODAY });
    s = recordLevel(s, 'coder', l1, won(3, 2), '2025-06-12').state;
    expect(s.levels['coder:maze-01']).toEqual({ stars: 3, best: 2, d: TODAY });
  });

  it('raises stars and moves the date only when stars go up', () => {
    let s = recordLevel(emptyAdventure(), 'coder', l1, won(1, 7), TODAY).state;
    const r = recordLevel(s, 'coder', l1, won(2, 7), '2025-06-11');
    expect(r.gained).toBe(1);
    expect(r.firstWin).toBe(false);
    s = r.state;
    expect(s.levels['coder:maze-01']).toEqual({ stars: 2, best: 7, d: '2025-06-11' });
  });

  it('is safe to apply twice: the second time changes nothing', () => {
    const once = recordLevel(emptyAdventure(), 'coder', l2, won(2, 4), TODAY);
    const twice = recordLevel(once.state, 'coder', l2, won(2, 4), TODAY);
    expect(twice.state).toEqual(once.state);
    expect(twice.gained).toBe(0);
    expect(twice.firstWin).toBe(false);
  });

  it('keeps modes apart', () => {
    const s = recordLevel(emptyAdventure(), 'little', l1, won(3, 1), TODAY).state;
    expect(Object.keys(s.levels)).toEqual(['little:maze-01']);
    expect(levelStatus(s, 'coder', l1).won).toBe(false);
  });

  it('counts a freed critter once per level and mode', () => {
    const crit = mk('woods-05', 'woods', 5, { friend: { art: 'critter' } });
    const all = [crit];
    let s = recordLevel(emptyAdventure(), 'little', crit, won(1), TODAY, all).state;
    s = recordLevel(s, 'little', crit, won(2), TODAY, all).state;
    expect(s.critters).toBe(1);
    s = recordLevel(s, 'coder', crit, won(1), TODAY, all).state;
    expect(s.critters).toBe(2);
    const garden = mk('woods-06', 'woods', 6, { friend: { art: 'olly', feature: 'REPEAT' } });
    expect(recordLevel(s, 'coder', garden, won(1), TODAY, [crit, garden]).state.critters).toBe(2);
  });
});

describe('unlocking on the real Maze levels', () => {
  const maze = LEVELS.filter((l) => l.realm === 'maze');

  it('opens only maze-01 on a fresh start', () => {
    const s = emptyAdventure();
    const open = maze.filter((l) => levelStatus(s, 'coder', l).open).map((l) => l.id);
    expect(open).toEqual(['maze-01']);
    expect(nextLevel(s, 'coder')?.id).toBe('maze-01');
  });

  it('opens each level after the one before it is won, with any stars', () => {
    let s = emptyAdventure();
    for (let i = 0; i < maze.length - 1; i++) {
      s = recordLevel(s, 'coder', maze[i]!, won(1), TODAY).state;
      expect(levelStatus(s, 'coder', maze[i + 1]!).open).toBe(true);
      if (i + 2 < maze.length) expect(levelStatus(s, 'coder', maze[i + 2]!).open).toBe(false);
    }
  });

  it('gives Little Turtles six levels and makes maze-06 their gate', () => {
    expect(levelsFor('little').filter((l) => l.realm === 'maze').map((l) => l.id)).toEqual(['maze-01', 'maze-02', 'maze-03', 'maze-04', 'maze-05', 'maze-06']);
    expect(gateLevel('maze', 'little')?.id).toBe('maze-06');
    expect(gateLevel('maze', 'coder')?.id).toBe('maze-08');
    expect(levelStatus(emptyAdventure(), 'little', LEVELS.find((l) => l.id === 'maze-07')!).open).toBe(false);
  });

  it('wins every level with the references and reports totals', () => {
    let s = emptyAdventure();
    for (const level of levelsFor('coder')) {
      expect(levelStatus(s, 'coder', level).open).toBe(true);
      const out = playLevel(level, 'coder', ADVENTURE_REFERENCE[level.id]!.coder!);
      expect(out.stars).toBe(3);
      s = recordLevel(s, 'coder', level, out, TODAY).state;
    }
    expect(nextLevel(s, 'coder')).toBeNull();
    expect(totalStars(s, 'coder')).toEqual({ stars: 132, max: 132 });
    expect(realmStatus(s, 'coder', 'maze')).toMatchObject({ open: true, won: 8, total: 8, stars: 24, maxStars: 24, cleared: true });
    expect(followingLevel('coder', LEVELS[0]!)?.id).toBe('maze-02');
    expect(followingLevel('coder', LEVELS[LEVELS.length - 1]!)).toBeNull();
  });

  it('shows a locked level as locked until its turn', () => {
    const s = emptyAdventure();
    expect(levelStatus(s, 'coder', maze[3]!)).toEqual({ open: false, stars: 0, best: null, won: false });
  });
});

describe('unlocking across realms (synthetic levels)', () => {
  const set = [
    mk('maze-01', 'maze', 1),
    mk('maze-02', 'maze', 2, { kind: 'boss', boss: { name: 'B', art: 'b' } }),
    mk('woods-01', 'woods', 1),
    mk('woods-02', 'woods', 2),
    mk('woods-03', 'woods', 3, { modes: ['coder'] }),
    mk('hills-01', 'hills', 1, { modes: ['coder'] }),
    mk('castle-01', 'castle', 1),
  ];
  const by = (id: string) => set.find((l) => l.id === id)!;

  it('opens the next realm only when the boss is won', () => {
    let s = emptyAdventure();
    expect(realmStatus(s, 'coder', 'woods', set).open).toBe(false);
    s = recordLevel(s, 'coder', by('maze-01'), won(3), TODAY, set).state;
    expect(levelStatus(s, 'coder', by('woods-01'), set).open).toBe(false);
    const boss = recordLevel(s, 'coder', by('maze-02'), won(1), TODAY, set);
    expect(boss.opensRealm).toBe('woods');
    s = boss.state;
    expect(levelStatus(s, 'coder', by('woods-01'), set).open).toBe(true);
    expect(levelStatus(s, 'coder', by('woods-02'), set).open).toBe(false);
  });

  it('skips a coder-only realm for Little Turtles, using each mode\'s last level as its gate', () => {
    expect(realmsFor('little', set)).toEqual(['maze', 'woods', 'castle']);
    expect(realmsFor('coder', set)).toEqual(['maze', 'woods', 'hills', 'castle']);
    expect(gateLevel('woods', 'little', set)?.id).toBe('woods-02');
    expect(gateLevel('woods', 'coder', set)?.id).toBe('woods-03');
    let s = emptyAdventure();
    for (const id of ['maze-01', 'maze-02', 'woods-01']) s = recordLevel(s, 'little', by(id), won(1), TODAY, set).state;
    expect(realmStatus(s, 'little', 'castle', set).open).toBe(false);
    const last = recordLevel(s, 'little', by('woods-02'), won(1), TODAY, set);
    expect(last.opensRealm).toBe('castle');
    expect(realmStatus(last.state, 'little', 'castle', set).open).toBe(true);
  });

  it('reports the opening of a realm once, not on every replay', () => {
    let s = emptyAdventure();
    s = recordLevel(s, 'coder', by('maze-01'), won(1), TODAY, set).state;
    const first = recordLevel(s, 'coder', by('maze-02'), won(1), TODAY, set);
    expect(first.opensRealm).toBe('woods');
    expect(recordLevel(first.state, 'coder', by('maze-02'), won(3), TODAY, set).opensRealm).toBeNull();
  });

  it('never closes a realm once a boss is beaten', () => {
    const s: AdventureState = { ...emptyAdventure(), bosses: [levelKey('coder', 'maze-02')] };
    expect(realmStatus(s, 'coder', 'woods', set).open).toBe(true);
  });

  it('keeps REALM_ORDER in the design order and marks a story card once', () => {
    expect(REALM_ORDER).toEqual(['maze', 'woods', 'river', 'swamp', 'cave', 'hills', 'castle']);
    const s = markIntro(markIntro(emptyAdventure(), 'woods'), 'maze');
    expect(s.intros).toEqual(['maze', 'woods']);
    expect(markIntro(s, 'maze')).toBe(s);
  });
});

describe('saved plans', () => {
  it('keeps a plan per mode and level, and the newest at the end', () => {
    let p = savePlan({}, 'coder', 'maze-01', 'FD 200');
    p = savePlan(p, 'little', 'maze-01', 'FD 100');
    p = savePlan(p, 'coder', 'maze-01', 'FD 250');
    expect(p).toEqual({ 'little:maze-01': 'FD 100', 'coder:maze-01': 'FD 250' });
    expect(Object.keys(p)).toEqual(['little:maze-01', 'coder:maze-01']);
  });

  it('does not keep a plan over the size limit', () => {
    const p = savePlan({}, 'coder', 'maze-01', 'x'.repeat(MAX_CODE_CHARS + 1));
    expect(p).toEqual({});
    expect(savePlan({}, 'coder', 'maze-01', 'x'.repeat(MAX_CODE_CHARS))['coder:maze-01']).toHaveLength(MAX_CODE_CHARS);
  });

  it('removes the oldest plans past the cap', () => {
    const many = Array.from({ length: MAX_CODES + 20 }, (_, i) => mk(`maze-${100 + i}`, 'maze', 100 + i));
    let p = {};
    for (const l of many) p = savePlan(p, 'coder', l.id, `FD ${l.n}`);
    expect(Object.keys(p)).toHaveLength(MAX_CODES);
    expect(p).not.toHaveProperty(['coder:maze-100']);
    expect(p).toHaveProperty(['coder:maze-219']);
    const parsed = parsePlans(p, many);
    expect(Object.keys(parsed)).toHaveLength(MAX_CODES);
  });

  it('drops unknown levels, non-strings and over-long plans when reading', () => {
    const out = parsePlans({ 'coder:maze-01': 'FD 50', 'coder:zzz': 'FD 50', 'coder:maze-02': 5, 'little:maze-03': 'y'.repeat(MAX_CODE_CHARS + 1), 'little:maze-07': 'FD 5' });
    expect(out).toEqual({ 'coder:maze-01': 'FD 50' });
    expect(parsePlans('x')).toEqual({});
  });
});

describe('rewardFor', () => {
  const east = { col: 0, row: 0, dir: 'E' as const };
  const cage = (feature: 'REPEAT' | 'bug-fixed', over: Partial<Level> = {}) =>
    mk('woods-05', 'woods', 5, { map: ['SgF'], start: east, friend: { art: feature === 'REPEAT' ? 'olly' : 'dot', feature }, ...over });

  it('is null unless the level was won', () => {
    expect(rewardFor(cage('REPEAT'), 'coder', 'FD 50', { status: 'lost', friendsFreed: 0 })).toBeNull();
    expect(rewardFor(cage('REPEAT'), 'coder', 'FD 50', { status: 'unfinished', friendsFreed: 0 })).toBeNull();
  });

  it('grants the caged friend only when the winning plan used the feature', () => {
    const level = cage('REPEAT');
    const looped = 'REPEAT 1 [FD 50]\nFREE';
    const plain = 'FD 50\nFREE';
    const a = playLevel(level, 'coder', looped);
    const b = playLevel(level, 'coder', plain);
    expect(a.status).toBe('won');
    expect(b.status).toBe('won');
    expect(rewardFor(level, 'coder', looped, a)).toEqual({ kind: 'adventure-level', levelId: 'woods-05', mode: 'coder', features: ['REPEAT'], fixedBug: false });
    expect(rewardFor(level, 'coder', plain, b)).toEqual({ kind: 'adventure-level', levelId: 'woods-05', mode: 'coder', features: [], fixedBug: false });
  });

  it('flags a fixed bug only when the code changed from the starter', () => {
    const level = cage('bug-fixed', { id: 'maze-05', realm: 'maze', n: 5, kind: 'fix', starter: { coder: 'FD 50\nFREE' } });
    const out = playLevel(level, 'coder', 'FD 50\nFREE');
    expect(out.status).toBe('won');
    expect(rewardFor(level, 'coder', 'FD 50\nFREE', out)?.fixedBug).toBe(false);
    expect(rewardFor(level, 'coder', '  fd 50\n\n FREE ', out)?.fixedBug).toBe(false);
    expect(rewardFor(level, 'coder', 'FD 50\nREST\nFREE', out)?.fixedBug).toBe(true);
  });

  it('frees Olly in the real Woods only for a plan with REPEAT, in both modes', () => {
    const level = LEVELS.find((l) => l.id === 'woods-06')!;
    const plain = 'FD 150\nRT 90\nFD 150\nRT 90\nFD 150\nRT 90\nFREE';
    for (const mode of ['coder', 'little'] as AgeModeId[]) {
      const looped = ADVENTURE_REFERENCE['woods-06']![mode]!;
      const withLoop = applyEvent(emptyRewards(), rewardFor(level, mode, looped, playLevel(level, mode, looped))!, TODAY);
      expect(withLoop.newFriends).toEqual(['olly']);
      const out = playLevel(level, mode, plain);
      expect(out).toMatchObject({ status: 'won', friendsFreed: 1 });
      expect(applyEvent(emptyRewards(), rewardFor(level, mode, plain, out)!, TODAY).newFriends).toEqual([]);
    }
  });

  it('frees Hoot in the real River only for a Turtle Coder plan with IF; the Little tree frees a critter', () => {
    const hoot = LEVELS.find((l) => l.id === 'river-05')!;
    expect(hoot.modes).toEqual(['coder']);
    const code = ADVENTURE_REFERENCE['river-05']!.coder!;
    const event = rewardFor(hoot, 'coder', code, playLevel(hoot, 'coder', code))!;
    expect(event.features).toEqual(['IF']);
    expect(applyEvent(emptyRewards(), event, TODAY).newFriends).toEqual(['hoot']);
    // The same IF plan from a Little Turtle would never add the coder-only Hoot.
    expect(applyEvent(emptyRewards(), { ...event, mode: 'little' }, TODAY).newFriends).toEqual([]);
    const tree = LEVELS.find((l) => l.id === 'river-06')!;
    const little = ADVENTURE_REFERENCE['river-06']!.little!;
    const out = playLevel(tree, 'little', little);
    expect(applyEvent(emptyRewards(), rewardFor(tree, 'little', little, out)!, TODAY).newFriends).toEqual([]);
    expect(recordLevel(emptyAdventure(), 'little', tree, out, TODAY).state.critters).toBe(1);
  });

  it('frees Bree only with TO, Nutmeg only with MAKE and Spindle only with a command that calls itself', () => {
    const cases: [string, string, string][] = [
      ['cave-07', 'bree', 'FD 50\nJUMP\nFD 50\nJUMP\nRT 90\nFD 50\nJUMP\nFD 50\nJUMP\nRT 90\nFD 50\nJUMP\nFD 50\nJUMP\nFREE'],
      ['hills-05', 'nutmeg', ADVENTURE_WASTEFUL['hills-05']!],
      ['castle-06', 'spindle', ADVENTURE_WASTEFUL['castle-06']!],
    ];
    for (const [id, friend, without] of cases) {
      const level = LEVELS.find((l) => l.id === id)!;
      const code = ADVENTURE_REFERENCE[id]!.coder!;
      expect(applyEvent(emptyRewards(), rewardFor(level, 'coder', code, playLevel(level, 'coder', code))!, TODAY).newFriends, id).toEqual([friend]);
      // A plan without the feature still opens the cage, with no friend coming home.
      const out = playLevel(level, 'coder', without);
      expect(out).toMatchObject({ status: 'won', friendsFreed: 1 });
      expect(applyEvent(emptyRewards(), rewardFor(level, 'coder', without, out)!, TODAY).newFriends, `${id} without`).toEqual([]);
    }
  });

  it('flags the real maze-05 fix once it is solved', () => {
    const level = LEVELS.find((l) => l.id === 'maze-05')!;
    const code = ADVENTURE_REFERENCE['maze-05']!.coder!;
    const out = playLevel(level, 'coder', code);
    expect(rewardFor(level, 'coder', code, out)).toEqual({ kind: 'adventure-level', levelId: 'maze-05', mode: 'coder', features: [], fixedBug: true });
  });

  it('turns into friends and stickers through applyEvent, once', () => {
    const level = cage('REPEAT');
    const code = 'REPEAT 1 [FD 50]\nFREE';
    const event = rewardFor(level, 'coder', code, playLevel(level, 'coder', code))!;
    const first = applyEvent(emptyRewards(), event, TODAY);
    expect(first.newFriends).toEqual(['olly']);
    expect(first.newStickers).toEqual(['adventurer']);
    const second = applyEvent(first.state, event, TODAY);
    expect(second.newFriends).toEqual([]);
    expect(second.newStickers).toEqual([]);
    expect(second.state).toEqual(first.state);
  });
});

describe('a full playthrough leaves quest progress alone', () => {
  const PROGRESS = JSON.stringify(['draw-square', 'draw-circle']);
  const PATH = JSON.stringify({ v: 1, quests: { 'draw-square': { s: 'clean', d: '2025-06-01' } }, sailed: {}, kept: [], reviews: {}, reviewedOn: null, tested: {}, master: {} });
  const REWARDS = JSON.stringify(parseRewards(null));

  it('leaves gio.progress and gio.path byte-identical, and writes only its own keys', () => {
    const store = fakeStore({ 'gio.progress': PROGRESS, 'gio.path': PATH, 'gio.rewards': REWARDS });
    const before = { ...store.data };
    for (const mode of ['coder', 'little'] as AgeModeId[]) {
      let state = readAdventure(store);
      let plans = readPlans(store);
      let rewards = parseRewards(JSON.parse(store.data['gio.rewards']!));
      for (const level of levelsFor(mode)) {
        const code = ADVENTURE_REFERENCE[level.id]![mode]!;
        const out = playLevel(level, mode, code);
        expect(out.stars).toBe(3);
        state = recordLevel(state, mode, level, out, TODAY).state;
        plans = savePlan(plans, mode, level.id, code);
        const event = rewardFor(level, mode, code, out);
        if (event) rewards = applyEvent(rewards, event, TODAY).state;
        writeAdventure(store, state);
        writePlans(store, plans);
        store.setItem('gio.rewards', JSON.stringify(rewards));
      }
    }
    expect(store.data['gio.progress']).toBe(before['gio.progress']);
    expect(store.data['gio.path']).toBe(before['gio.path']);
    expect(Object.keys(store.data).sort()).toEqual(['gio.adventure', 'gio.adventure.code', 'gio.path', 'gio.progress', 'gio.rewards']);
    const state = readAdventure(store);
    expect(totalStars(state, 'coder')).toEqual({ stars: 132, max: 132 });
    expect(totalStars(state, 'little')).toEqual({ stars: 108, max: 108 });
    expect(Object.keys(readPlans(store))).toHaveLength(80);
    const rewards = parseRewards(JSON.parse(store.data['gio.rewards']!));
    expect(rewards.stickers).toEqual(expect.arrayContaining(['adventurer', 'bug-fixer']));
    // Coders free Dot, Olly (REPEAT), Hoot (IF), Bree (TO), Nutmeg (MAKE) and Spindle (a command that calls itself).
    // Little Turtles meet Dot and Olly too, and free critters where coders meet the coder-only friends.
    expect(rewards.friends).toEqual(['dot', 'olly', 'hoot', 'bree', 'nutmeg', 'spindle']);
    // river-06, cave-08 and castle-07 for Little Turtles. Coders free no critter (design 5.6).
    expect(state.critters).toBe(3);
  });

  it('survives storage that throws or holds garbage', () => {
    const broken: KeyStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readAdventure(broken)).toEqual(emptyAdventure());
    expect(readPlans(broken)).toEqual({});
    expect(() => writeAdventure(broken, emptyAdventure())).not.toThrow();
    expect(() => writePlans(broken, {})).not.toThrow();
    expect(readAdventure(fakeStore({ [ADVENTURE_KEY]: '{oops' }))).toEqual(emptyAdventure());
    expect(readPlans(fakeStore({ [PLANS_KEY]: '[1,2' }))).toEqual({});
  });

  it('does not import the quest path, progress or the stage records', () => {
    for (const file of ['state.ts', 'useAdventure.ts']) {
      const src = read('src', 'ui', 'adventure', file).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(src).not.toMatch(/from '\.\.\/(path|progress)/);
      expect(src).not.toMatch(/from '\.\.\/\.\.\/logo\/quests\.js'[^;]*QUESTS/);
      expect(src).not.toMatch(/gio\.(progress|path)/);
    }
  });
});

describe('privacy page', () => {
  it('lists both adventure keys', () => {
    const privacy = read('src', 'ui', 'pages', 'Privacy.tsx');
    expect(privacy).toContain(`<code>${ADVENTURE_KEY}</code>`);
    expect(privacy).toContain(`<code>${PLANS_KEY}</code>`);
    expect(privacy).toMatch(/neither (key )?(is sent|changes)/i);
  });
});
