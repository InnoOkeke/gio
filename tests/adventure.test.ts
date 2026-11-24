import { describe, expect, it } from 'vitest';
import { blocksToLogo, check, execute, parse, toBlocks } from '../src/logo/index.js';
import { checkAdventure, playLevel } from '../src/logo/adventure/play.js';
import { validateLevel, type AgeModeId, type Level } from '../src/logo/adventure/level.js';
import { AdventureWorld, MAX_BEATS } from '../src/logo/adventure/world.js';
import { ADVENTURE_LOOKUP, ADVENTURE_WORDS } from '../src/logo/adventure/words.js';
import { LEVELS } from '../src/logo/adventure/levels/index.js';
import { PRIMITIVES, SPECIAL_FORMS, GAME_KEYS } from '../src/logo/primitives.js';
import { commandCount, features } from '../src/logo/quests.js';
import { mulberry32 } from '../src/logo/seeded.js';
import { ADVENTURE_NAIVE, ADVENTURE_NO_GEM, ADVENTURE_REFERENCE, ADVENTURE_WASTEFUL } from './solutions/adventure.js';
import { solve } from './helpers/adventure-solver.js';

const ALL_WORDS = ['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'SWIM', 'JUMP', 'FREE', 'REST', 'AHEAD', 'HERE', 'GEMS', 'REPEAT', 'IF', 'IFELSE', 'MAKE', 'TO', 'STOP', 'XCOR', 'YCOR', 'HEADING'];

/** A throw-away level for testing one rule. Everything is allowed. */
function lab(map: string[], over: Partial<Level> = {}): Level {
  const sRow = map.findIndex((r) => r.includes('S'));
  return {
    id: 'lab',
    realm: 'maze',
    n: 1,
    kind: 'play',
    modes: ['coder'],
    title: 'Lab',
    concept: 'sequence',
    story: '',
    goal: '',
    map,
    start: { col: map[sRow]!.indexOf('S'), row: sRow, dir: 'N' },
    allow: { little: ALL_WORDS, coder: ALL_WORDS },
    par: { coder: 99 },
    hints: [{ text: 'a' }, { text: 'b' }],
    ...over,
  };
}

const modesOf = (level: Level): AgeModeId[] => level.modes;

describe('Maze level data', () => {
  it('has the eight Maze levels, 8 for coders and 6 for little turtles', () => {
    const maze = LEVELS.filter((l) => l.realm === 'maze');
    expect(maze.map((l) => l.id)).toEqual(['maze-01', 'maze-02', 'maze-03', 'maze-04', 'maze-05', 'maze-06', 'maze-07', 'maze-08']);
    expect(maze.filter((l) => l.modes.includes('coder'))).toHaveLength(8);
    expect(maze.filter((l) => l.modes.includes('little'))).toHaveLength(6);
  });

  it('has unique, ordered ids and every level is well formed', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    LEVELS.forEach((l, k) => expect(l.n).toBe(LEVELS.filter((x) => x.realm === l.realm).indexOf(l) + 1 || k));
    for (const level of LEVELS) expect(validateLevel(level)).toEqual([]);
  });

  it('has a reference for every level and mode it lists', () => {
    for (const level of LEVELS) for (const mode of modesOf(level)) expect(ADVENTURE_REFERENCE[level.id]?.[mode], `${level.id} ${mode}`).toBeTruthy();
  });

  it('hints parse, and each reveal is the start of the reference plan', () => {
    for (const level of LEVELS) {
      for (const mode of modesOf(level)) {
        const ref = ADVENTURE_REFERENCE[level.id]![mode]!.replace(/\s+/g, ' ').trim();
        for (const hint of level.hints) {
          const reveal = hint.reveal?.[mode];
          if (!reveal) continue;
          expect(checkAdventure(level, mode, reveal).ok, `${level.id} reveal parses`).toBe(true);
          const text = reveal.replace(/\s+/g, ' ').trim();
          expect(ref.startsWith(text) && (ref.length === text.length || ref[text.length] === ' '), `${level.id} ${mode} reveal "${text}"`).toBe(true);
        }
      }
    }
  });

  it('fix levels start from a plan that does not win', () => {
    for (const level of LEVELS.filter((l) => l.kind === 'fix')) {
      for (const mode of modesOf(level)) expect(playLevel(level, mode, level.starter![mode]!).status).not.toBe('won');
    }
  });
});

describe('Maze references, naive plans and stars', () => {
  it('every reference wins with 3 stars, every gem and exactly par commands', () => {
    for (const level of LEVELS) {
      for (const mode of modesOf(level)) {
        const out = playLevel(level, mode, ADVENTURE_REFERENCE[level.id]![mode]!);
        expect(out.status, `${level.id} ${mode}: ${out.message}`).toBe('won');
        expect(out.stars).toBe(3);
        expect(out.gems).toBe(out.gemsTotal);
        expect(out.commands).toBe(level.par[mode]);
        expect(out.commands).toBe(commandCount(parse(ADVENTURE_REFERENCE[level.id]![mode]!, { words: ADVENTURE_LOOKUP })));
      }
    }
  });

  it('every naive plan fails for the stated reason', () => {
    for (const level of LEVELS) {
      const naive = ADVENTURE_NAIVE[level.id]!;
      for (const mode of modesOf(level)) {
        const out = playLevel(level, mode, naive.code);
        expect(out.status, `${level.id} ${mode}`).toBe(naive.status);
        expect(out.reason).toBe(naive.reason);
        expect(out.stars).toBe(0);
      }
    }
  });

  it('wasteful plans win with exactly 2 stars, and plans that skip a gem get 1', () => {
    for (const level of LEVELS) {
      for (const mode of modesOf(level)) {
        const wasteful = playLevel(level, mode, ADVENTURE_WASTEFUL[level.id]!);
        expect(wasteful.status, `${level.id} wasteful: ${wasteful.message}`).toBe('won');
        expect(wasteful.stars).toBe(2);
        expect(wasteful.commands).toBeGreaterThan(level.par[mode]!);
        const skip = ADVENTURE_NO_GEM[level.id];
        if (skip) {
          const out = playLevel(level, mode, skip);
          expect(out.status, `${level.id} no gem: ${out.message}`).toBe('won');
          expect(out.stars).toBe(1);
          expect(out.gems).toBeLessThan(out.gemsTotal);
        }
      }
    }
  });

  it('reports the line where a plan went wrong, and keeps the gems picked up before it', () => {
    const level = LEVELS.find((l) => l.id === 'maze-03')!;
    const out = playLevel(level, 'coder', ADVENTURE_NAIVE['maze-03']!.code);
    expect(out.reason).toBe('rock');
    expect(out.line).toBe(3);
    expect(out.gems).toBe(1);
    expect(out.message).toBe('Oof, a rock!');
  });

  it('little turtle references are plain block commands that play the same way', () => {
    for (const level of LEVELS.filter((l) => l.modes.includes('little'))) {
      const ref = ADVENTURE_REFERENCE[level.id]!.little!;
      const blocks = toBlocks(parse(ref, { words: ADVENTURE_LOOKUP }));
      expect(blocks.ok, level.id).toBe(true);
      if (!blocks.ok) continue;
      const again = blocksToLogo(blocks.blocks);
      // Blocks put each command on its own line, so compare what Gio does, not the line numbers.
      const moves = (code: string) => JSON.stringify(playLevel(level, 'little', code).trace.map(({ line: _line, ...ev }) => ev));
      expect(moves(again), level.id).toBe(moves(ref));
    }
  });

  it('little turtles are not offered words their level does not allow', () => {
    const level = LEVELS.find((l) => l.id === 'maze-01')!;
    const out = playLevel(level, 'little', 'RT 90');
    expect(out.status).toBe('error');
    expect(out.message).toMatch(/RIGHT isn't part of this level/);
  });

  it('REPEAT is not offered in the Maze', () => {
    const out = playLevel(LEVELS[0]!, 'coder', 'REPEAT 4 [FD 50]');
    expect(out.status).toBe('error');
    expect(out.message).toMatch(/REPEAT isn't part of this level/);
  });
});

describe('Whispering Woods and Rolling River', () => {
  const realm = (r: string, mode: AgeModeId) => LEVELS.filter((l) => l.realm === r && l.modes.includes(mode)).map((l) => l.id);
  const uses = (id: string, mode: AgeModeId) => {
    const level = LEVELS.find((l) => l.id === id)!;
    const res = checkAdventure(level, mode, ADVENTURE_REFERENCE[id]![mode]!);
    if (!res.ok) throw new Error(res.problem.message);
    return res.program;
  };

  it('gives each mode six levels per world, ending in the boss', () => {
    expect(realm('woods', 'coder')).toEqual(['woods-01', 'woods-02', 'woods-03', 'woods-04', 'woods-06', 'woods-07']);
    expect(realm('woods', 'little')).toEqual(['woods-01', 'woods-02', 'woods-03', 'woods-05', 'woods-06', 'woods-07']);
    expect(realm('river', 'coder')).toEqual(['river-01', 'river-02', 'river-03', 'river-04', 'river-05', 'river-07']);
    expect(realm('river', 'little')).toEqual(['river-01', 'river-02', 'river-03', 'river-04', 'river-06', 'river-07']);
    for (const id of ['woods-07', 'river-07']) expect(LEVELS.find((l) => l.id === id)!.kind).toBe('boss');
  });

  it('every Woods reference uses REPEAT, and the Snake uses a REPEAT inside a REPEAT', () => {
    for (const level of LEVELS.filter((l) => l.realm === 'woods')) {
      for (const mode of level.modes) expect(features(uses(level.id, mode)).has('REPEAT'), `${level.id} ${mode}`).toBe(true);
    }
    expect(features(uses('woods-04', 'coder')).has('NEST')).toBe(true);
  });

  it('from level 2 every River reference decides with IF, and Little Turtles never need IFELSE', () => {
    for (const level of LEVELS.filter((l) => l.realm === 'river' && l.n > 1)) {
      for (const mode of level.modes) expect(features(uses(level.id, mode)).has('IF'), `${level.id} ${mode}`).toBe(true);
      expect(level.allow.little.includes('IFELSE')).toBe(false);
    }
  });

  it('river levels with variants beat a plan that remembers one river', () => {
    const withVariants = LEVELS.filter((l) => l.realm === 'river' && (l.variants?.length ?? 0) > 0);
    expect(withVariants.map((l) => l.id)).toEqual(['river-02', 'river-03', 'river-05', 'river-06', 'river-07']);
    for (const level of withVariants) {
      const naive = ADVENTURE_NAIVE[level.id]!.code;
      for (const mode of level.modes) {
        const out = playLevel(level, mode, naive);
        // The hard-coded plan wins the first river and fails on another map.
        expect(playLevel({ ...level, variants: [] }, mode, naive).status, level.id).toBe('won');
        expect(out.status).toBe('lost');
        expect(out.message.startsWith('On another map: ')).toBe(true);
        expect(out.variants).toHaveLength(2);
      }
    }
  });

  it('the Big Stump Grumble catches a plan that leaves the stairs early, and the reference slips past it', () => {
    const boss = LEVELS.find((l) => l.id === 'woods-07')!;
    expect(playLevel(boss, 'coder', ADVENTURE_NAIVE['woods-07']!.code).reason).toBe('enemy');
    const out = playLevel(boss, 'coder', ADVENTURE_REFERENCE['woods-07']!.coder!);
    expect(out.trace.some((e) => e.type === 'hit')).toBe(false);
    expect(out).toMatchObject({ status: 'won', gems: 3 });
  });
});

describe('Maze maps can be solved by search', () => {
  it('finds a winning route that collects every gem on every map', () => {
    for (const level of LEVELS) {
      for (const map of [level.map, ...(level.variants ?? [])]) {
        const route = solve(level, map, { allGems: true });
        expect(route, `${level.id} has no solution`).not.toBeNull();
      }
    }
  });

  it('the search is no longer than the reference plan can be, so par is reachable', () => {
    for (const level of LEVELS) {
      const route = solve(level, level.map, { allGems: true })!;
      const ref = ADVENTURE_REFERENCE[level.id]![level.modes[0]!]!;
      const refSteps = playLevel(level, level.modes[0]!, ref).beats;
      // The shortest route in single steps and turns can't be longer than the reference's moves.
      expect(route.filter((s) => /^(FORWARD|BACK|SWIM|JUMP)/.test(s)).length).toBeLessThanOrEqual(refSteps);
    }
  });
});

describe('Determinism', () => {
  it('runs the same plan twice to the same trace', () => {
    for (const level of LEVELS) {
      for (const mode of modesOf(level)) {
        const code = ADVENTURE_REFERENCE[level.id]![mode]!;
        expect(JSON.stringify(playLevel(level, mode, code))).toBe(JSON.stringify(playLevel(level, mode, code)));
      }
    }
  });

  it('gives equal outcomes for 300 random plans per level', () => {
    const rand = mulberry32(2026);
    const ACTIONS = new Set(['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'SWIM', 'JUMP', 'FREE', 'REST']);
    for (const level of LEVELS) {
      const mode = level.modes.includes('coder') ? 'coder' : 'little';
      const words = level.allow[mode].filter((w) => ACTIONS.has(w));
      for (let k = 0; k < 300; k++) {
        const lines: string[] = [];
        const count = 1 + Math.floor(rand() * 8);
        for (let j = 0; j < count; j++) {
          const w = words[Math.floor(rand() * words.length)]!;
          if (w === 'FORWARD') lines.push(`FD ${50 * (1 + Math.floor(rand() * 8))}`);
          else if (w === 'BACK') lines.push(`BK ${50 * (1 + Math.floor(rand() * 4))}`);
          else if (w === 'RIGHT') lines.push(`RT ${90 * (1 + Math.floor(rand() * 3))}`);
          else if (w === 'LEFT') lines.push(`LT ${90 * (1 + Math.floor(rand() * 3))}`);
          else lines.push(w);
        }
        const code = lines.join('\n');
        const a = playLevel(level, mode, code);
        expect(JSON.stringify(a), code).toBe(JSON.stringify(playLevel(level, mode, code)));
        expect(['won', 'lost', 'unfinished']).toContain(a.status);
      }
    }
  });

  it('rejects RANDOM in a plan', () => {
    const out = playLevel(lab(['S.G']), 'coder', 'FD RANDOM 2');
    expect(out.status).toBe('error');
    const strict = playLevel(LEVELS[0]!, 'coder', 'FD RANDOM 2');
    expect(strict.status).toBe('error');
    expect(strict.message).toMatch(/RANDOM isn't part of this level/);
  });
});

describe('Isolation from Studio', () => {
  it('registers none of the seven words globally', () => {
    const names = ADVENTURE_WORDS.map((w) => w.name);
    expect(names).toEqual(['SWIM', 'JUMP', 'FREE', 'REST', 'AHEAD', 'HERE', 'GEMS']);
    for (const name of names) {
      expect(PRIMITIVES.some((p) => p.name === name || p.aliases.includes(name))).toBe(false);
      expect((SPECIAL_FORMS as readonly string[]).includes(name)).toBe(false);
      expect((GAME_KEYS as readonly string[]).includes(name)).toBe(false);
    }
  });

  it('Studio does not know SWIM, and parse is unchanged without the words argument', () => {
    const res = check('SWIM');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problem.message).toMatch(/I don't know how to SWIM/);
    expect(() => parse('FD 50 RT 90 REPEAT 4 [FD 10]')).not.toThrow();
  });

  it('the adventure parser accepts the seven words', () => {
    for (const w of ['SWIM', 'JUMP', 'FREE', 'REST']) expect(() => parse(w, { words: ADVENTURE_LOOKUP })).not.toThrow();
    expect(() => parse('IF GEMS = 2 [FD 50]', { words: ADVENTURE_LOOKUP })).not.toThrow();
    expect(() => parse('IF AHEAD = "water [FD 50]', { words: ADVENTURE_LOOKUP })).not.toThrow();
    expect(() => parse('IF HERE = "goal [FD 50]', { words: ADVENTURE_LOOKUP })).not.toThrow();
  });

  it('a saved program with its own TO named like an adventure word keeps working in Studio', () => {
    for (const w of ADVENTURE_WORDS.map((x) => x.name)) {
      const out = execute(`TO ${w}\n  FD 10\nEND\n${w}\n${w}`);
      expect(out.ok, w).toBe(true);
      if (out.ok) expect(out.result.final.y).toBe(20);
    }
    const jump = execute('TO JUMP :n\n  FD :n\nEND\nJUMP 30');
    expect(jump.ok).toBe(true);
    if (jump.ok) expect(jump.result.final.y).toBe(30);
  });

  it("inside the adventure, a child's own procedure wins over Gio's word", () => {
    const level = lab(['S.G'], { start: { col: 0, row: 0, dir: 'E' } });
    // Gio's JUMP would need boots. The child's JUMP is a plain 1-step walk.
    const out = playLevel(level, 'coder', 'TO JUMP\n  FD 50\nEND\nJUMP\nJUMP');
    expect(out.status).toBe('won');
    expect(playLevel(level, 'coder', 'JUMP').reason).toBe('no-boots');
    const reporter = playLevel(level, 'coder', 'TO GEMS\n  FD 50\nEND\nGEMS\nGEMS');
    expect(reporter.status).toBe('won');
  });
});

describe('World rules', () => {
  const east = { start: { col: 0, row: 0, dir: 'E' as const } };

  it('reads steps of 50 and quarter turns only', () => {
    const level = lab(['S..G'], east);
    const step = playLevel(level, 'coder', 'FD 30');
    expect(step.reason).toBe('bad-step');
    expect(step.message).toBe('Gio walks in steps of 50. Try FD 50.');
    const turn = playLevel(level, 'coder', 'RT 45');
    expect(turn.reason).toBe('bad-turn');
    expect(turn.message).toBe('Gio turns in quarter turns. Try RT 90.');
  });

  it('places the map around the turtle origin so FD 100 is two steps', () => {
    const level = lab(['.....', '.....', '..S..', '.....', '.....']);
    const w = new AdventureWorld(level, level.map);
    expect(w.pose()).toEqual({ x: 0, y: 0, heading: 0 });
    expect(w.command('FORWARD', 100, 1)).toEqual({ x: 0, y: 100, heading: 0 });
    expect(w.command('RIGHT', 90, 2)).toEqual({ x: 0, y: 100, heading: 90 });
    expect(w.command('BACK', 50, 3)).toEqual({ x: -50, y: 100, heading: 90 });
    const even = lab(['S...', '....'], { start: { col: 0, row: 0, dir: 'E' } });
    expect(new AdventureWorld(even, even.map).pose()).toEqual({ x: -75, y: 25, heading: 90 });
  });

  it('turtle words such as XCOR and HEADING follow the grid', () => {
    const level = lab(['S..G'], east);
    expect(playLevel(level, 'coder', 'FD 100\nIF XCOR = 25 [FD 50]').status).toBe('won');
    expect(playLevel(level, 'coder', 'IF HEADING = 90 [FD 150]').status).toBe('won');
  });

  it('water needs SWIM, and SWIM on dry land is lost', () => {
    const level = lab(['.G.', '.g.', '.~.', '...', '.S.']);
    expect(playLevel(level, 'coder', 'FD 100').reason).toBe('water');
    expect(playLevel(level, 'coder', 'FD 50\nSWIM\nFD 100')).toMatchObject({ status: 'won', gems: 1 });
    expect(playLevel(level, 'coder', 'SWIM').reason).toBe('dry');
    expect(playLevel(level, 'coder', 'FD 50\nSWIM\nIF HERE = "water [FD 100]')).toMatchObject({ status: 'won' });
  });

  it('a bridge is walkable and senses as clear', () => {
    const level = lab(['G', '=', 'S'], { start: { col: 0, row: 2, dir: 'N' } });
    expect(playLevel(level, 'coder', 'FD 100').status).toBe('won');
    expect(new AdventureWorld(level, level.map).reporter('AHEAD')).toBe('clear');
  });

  it('boots allow JUMP, which clears whatever is in the middle', () => {
    const level = lab(['.G.', '.#.', '.j.', '.S.']);
    expect(playLevel(level, 'coder', 'FD 50\nJUMP').status).toBe('won');
    expect(playLevel(level, 'coder', 'JUMP').reason).toBe('no-boots');
    const blocked = lab(['.#.', '.#.', '.j.', '.S.']);
    expect(playLevel(blocked, 'coder', 'FD 50\nJUMP').reason).toBe('bad-landing');
  });

  it('FREE opens only a cage in front, and freeing the last friend wins when there is no flag', () => {
    const level = lab(['SF.', '...', 'g..'], east);
    expect(playLevel(level, 'coder', 'FD 50').reason).toBe('cage');
    expect(playLevel(level, 'coder', 'REST\nFREE')).toMatchObject({ status: 'won', friendsFreed: 1 });
    expect(playLevel(level, 'coder', 'RT 90\nFREE').reason).toBe('nothing-to-free');
    const withFlag = lab(['SFG'], east);
    expect(playLevel(withFlag, 'coder', 'FREE').status).toBe('unfinished');
    expect(playLevel(withFlag, 'coder', 'FREE\nFD 100').status).toBe('won');
    expect(playLevel(withFlag, 'coder', 'FD 50').reason).toBe('cage');
  });

  it('the gate opens at the last gem and a boss needs every gem at the flag', () => {
    const level = lab(['G..', 'D..', 'g.g', 'S..'], { kind: 'boss', boss: { name: 'B', art: 'b' } });
    expect(playLevel(level, 'coder', 'FD 150').reason).toBe('gate');
    const open = playLevel(level, 'coder', 'FD 50\nRT 90\nFD 100\nBK 100\nLT 90\nFD 100');
    expect(open.status).toBe('won');
    const noGate = lab(['G..', '...', 'g.g', 'S..'], { kind: 'boss', boss: { name: 'B', art: 'b' } });
    expect(playLevel(noGate, 'coder', 'FD 150').status).toBe('unfinished');
    const plain = lab(['G..', '...', 'g.g', 'S..']);
    expect(playLevel(plain, 'coder', 'FD 150').status).toBe('won');
  });

  it('enemies hit by sharing a cell or swapping places, and a shield absorbs one hit', () => {
    const still = lab(['S...G'], { ...east, enemies: [{ id: 'e', route: [[2, 0]] }] });
    expect(playLevel(still, 'coder', 'FD 100').reason).toBe('enemy');
    const swap = lab(['S...G'], { ...east, enemies: [{ id: 'e', route: [[1, 0], [0, 0]] }] });
    expect(playLevel(swap, 'coder', 'FD 50').reason).toBe('enemy');
    const shielded = lab(['So.G'], { ...east, enemies: [{ id: 'e', route: [[2, 0]] }] });
    expect(playLevel(shielded, 'coder', 'FD 150').status).toBe('won');
    const spent = lab(['So.G'], { ...east, enemies: [{ id: 'e', route: [[2, 0]] }, { id: 'f', route: [[3, 0]] }] });
    expect(playLevel(spent, 'coder', 'FD 150').status).toBe('won'); // the pop keeps Gio safe for the next beat
    const twice = lab(['So..G'], { ...east, enemies: [{ id: 'e', route: [[2, 0]] }, { id: 'f', route: [[4, 0]] }] });
    expect(playLevel(twice, 'coder', 'FD 200').reason).toBe('enemy');
  });

  it('fire hurts only on a lit beat, and AHEAD tells when it will be lit on arrival', () => {
    const level = lab(['S.G'], { ...east, fires: [{ id: 'f', cells: [[1, 0]], period: 4, on: [1] }] });
    expect(playLevel(level, 'coder', 'FD 50').reason).toBe('fire');
    expect(playLevel(level, 'coder', 'REST\nFD 100').status).toBe('won');
    expect(playLevel(level, 'coder', 'REPEAT 3 [IFELSE AHEAD = "fire [REST] [FD 50]]').status).toBe('won');
    expect(new AdventureWorld(level, level.map).reporter('AHEAD')).toBe('fire');
  });

  it('AHEAD answers with the right word in priority order', () => {
    const ahead = (map: string[], over: Partial<Level> = {}) => {
      const l = lab(map, { start: { col: 0, row: 0, dir: 'E' }, ...over });
      return new AdventureWorld(l, l.map).reporter('AHEAD');
    };
    expect(ahead(['S.'])).toBe('clear');
    expect(ahead(['S#'])).toBe('rock');
    expect(ahead(['S~'])).toBe('water');
    expect(ahead(['SG'])).toBe('goal');
    expect(ahead(['Sg'])).toBe('gem');
    expect(ahead(['SF'])).toBe('friend');
    expect(ahead(['SD', 'g.'])).toBe('gate');
    expect(ahead(['SD'])).toBe('clear'); // no gems to collect, so the gate is open
    const w = lab(['S'], { start: { col: 0, row: 0, dir: 'W' } });
    expect(new AdventureWorld(w, w.map).reporter('AHEAD')).toBe('edge');
    expect(ahead(['S~'], { enemies: [{ id: 'e', route: [[1, 0]] }], fires: [{ id: 'f', cells: [[1, 0]], period: 1, on: [0] }] })).toBe('enemy');
    expect(ahead(['S#'], { fires: [{ id: 'f', cells: [[1, 0]], period: 1, on: [0] }] })).toBe('fire');
  });

  it('HERE and GEMS report the cell and the count', () => {
    const level = lab(['S~g'], { start: { col: 0, row: 0, dir: 'E' } });
    const w = new AdventureWorld(level, level.map);
    expect(w.reporter('HERE')).toBe('clear');
    w.command('SWIM', null, 1);
    expect(w.reporter('HERE')).toBe('water');
    w.command('FORWARD', 50, 2);
    expect(w.reporter('GEMS')).toBe(1);
    expect(w.reporter('NOPE')).toBeUndefined();
  });

  it('tells a typo in a sensing word what Gio can see', () => {
    const res = checkAdventure(lab(['S.G']), 'coder', 'IF AHEAD = "rok [FD 50]');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problem.message).toBe('AHEAD can see enemy, fire, friend, gate, rock, water, edge, goal, gem, clear. Did you mean "rock?');
    const here = checkAdventure(lab(['S.G']), 'coder', 'IF HERE <> "wat [FD 50]');
    expect(here.ok).toBe(false);
    expect(checkAdventure(lab(['S.G']), 'coder', 'IF AHEAD <> "rock [FD 50]').ok).toBe(true);
  });

  it('stops a plan that never ends, as tired, within the beat limit', () => {
    const level = lab(['S.G']);
    const out = playLevel(level, 'coder', 'REPEAT 1000 [REST]');
    expect(out.status).toBe('lost');
    expect(out.reason).toBe('tired');
    expect(out.beats).toBeLessThanOrEqual(MAX_BEATS + 1);
    const forever = playLevel(level, 'coder', 'TO LOOP\n  LOOP\nEND\nLOOP');
    expect(forever.status).toBe('error');
  });

  it('stops at once on a win, even inside a procedure and a loop', () => {
    const level = lab(['SG.'], { start: { col: 0, row: 0, dir: 'E' } });
    const out = playLevel(level, 'coder', 'TO GO\n  REPEAT 5 [FD 50]\nEND\nGO\nFD 50');
    expect(out.status).toBe('won');
    expect(out.beats).toBe(1);
  });

  it('plays every map of a level with variants, and one map failing fails the plan', () => {
    const level = lab(['.G.', '.g.', '...', '.~.', '...', '...', '.S.'], {
      variants: [['.G.', '.g.', '.~.', '...', '...', '...', '.S.'], ['.G.', '.g.', '...', '...', '.~.', '.~.', '.S.']],
      par: { coder: 4 },
    });
    const reference = playLevel(level, 'coder', 'REPEAT 6 [IFELSE AHEAD = "water [SWIM] [FD 50]]');
    expect(reference).toMatchObject({ status: 'won', stars: 3, commands: 4 });
    expect(reference.variants).toHaveLength(2);
    const hardCoded = playLevel(level, 'coder', 'FD 100\nSWIM\nFD 150');
    expect(hardCoded.status).toBe('lost');
    expect(hardCoded.reason).toBe('dry');
    expect(hardCoded.message).toBe('On another map: SWIM only works when the next step is water.');
    expect(hardCoded.stars).toBe(0);
  });
});
