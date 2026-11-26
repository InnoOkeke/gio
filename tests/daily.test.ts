import { describe, expect, it } from 'vitest';
import { CODER_DAILY, LITTLE_DAILY } from '../src/logo/daily-pool.js';
import { commandsUsed, DAILY_POOL, dayOf, parOf, puzzleNumber, puzzleOfTheDay, starsFor } from '../src/logo/daily.js';
import { checkQuest, QUESTS } from '../src/logo/quests.js';
import { parseDaily, serializeDaily, shareText, todaysPuzzle } from '../src/ui/daily';

const day = (year: number, month: number, d: number) => ({ year, month, day: d });

describe('puzzle of the day', () => {
  it('numbers the days, with #1 on the first day', () => {
    expect(puzzleNumber(day(2026, 10, 16))).toBe(1);
    expect(puzzleNumber(day(2026, 10, 17))).toBe(2);
    expect(puzzleNumber(day(2026, 11, 26))).toBe(42);
    expect(puzzleNumber(day(2027, 1, 1))).toBe(78);
  });

  it('never goes below #1 when a device clock is set far back', () => {
    expect(puzzleNumber(day(2020, 1, 1))).toBe(1);
  });

  it('gives the same puzzle for the same day, whatever the time of day or the previous calls', () => {
    const morning = todaysPuzzle('coder', new Date(2026, 10, 26, 0, 0, 1));
    const night = todaysPuzzle('coder', new Date(2026, 10, 26, 23, 59, 59));
    expect(night.number).toBe(morning.number);
    expect(night.puzzle.id).toBe(morning.puzzle.id);
    expect(puzzleOfTheDay('little', day(2026, 11, 26))).toEqual(puzzleOfTheDay('little', day(2026, 11, 26)));
  });

  it('picks from the date alone: the puzzle for a day is its number modulo the pool size', () => {
    for (const mode of ['little', 'coder'] as const) {
      const pool = DAILY_POOL[mode];
      for (let n = 1; n <= pool.length * 2 + 3; n++) {
        const d = new Date(Date.UTC(2026, 9, 16 + n - 1));
        const got = puzzleOfTheDay(mode, { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
        expect(got.number).toBe(n);
        expect(got.puzzle.id).toBe(pool[(n - 1) % pool.length]!.id);
      }
    }
  });

  it('uses every puzzle once before any repeats, and changes every day', () => {
    for (const mode of ['little', 'coder'] as const) {
      const pool = DAILY_POOL[mode];
      const seen = new Set<string>();
      let before = '';
      for (let n = 0; n < pool.length; n++) {
        const d = new Date(Date.UTC(2026, 11, 1 + n));
        const { puzzle } = puzzleOfTheDay(mode, { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
        expect(puzzle.id).not.toBe(before);
        before = puzzle.id;
        seen.add(puzzle.id);
      }
      expect(seen.size).toBe(pool.length);
    }
  });

  it('gives each mode a puzzle for its own age group', () => {
    const today = dayOf(new Date(2026, 10, 26));
    expect(puzzleOfTheDay('little', today).puzzle.audience).toBe('little');
    expect(puzzleOfTheDay('coder', today).puzzle.audience).toBe('coder');
    expect(puzzleOfTheDay('little', today).number).toBe(puzzleOfTheDay('coder', today).number);
  });
});

describe('the puzzle pool', () => {
  const all = [...LITTLE_DAILY, ...CODER_DAILY];

  it('has real puzzles with their own ids', () => {
    expect(LITTLE_DAILY.length).toBeGreaterThanOrEqual(10);
    expect(CODER_DAILY.length).toBeGreaterThanOrEqual(10);
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const questIds = new Set(QUESTS.map((q) => q.id));
    for (const id of ids) {
      expect(id.startsWith('daily-')).toBe(true);
      expect(id.length).toBeLessThanOrEqual(40);
      expect(questIds.has(id)).toBe(false);
    }
    for (const p of LITTLE_DAILY) expect(p.audience).toBe('little');
    for (const p of CODER_DAILY) expect(p.audience).toBe('coder');
  });

  for (const puzzle of all) {
    describe(puzzle.id, () => {
      it('has a reference solution that passes the checker', () => {
        const result = checkQuest(puzzle, puzzle.solution);
        expect(result.message).toBeTruthy();
        expect(result.pass, result.message).toBe(true);
      });

      it('has a target the checker accepts and a goal to read', () => {
        expect(puzzle.target).toBeTruthy();
        expect(checkQuest(puzzle, puzzle.target!).pass).toBe(true);
        expect(puzzle.goal.length).toBeGreaterThan(20);
        expect(puzzle.hint.length).toBeGreaterThan(10);
      });

      it('does not pass with no code, a stray line or a starter that is still broken', () => {
        expect(checkQuest(puzzle, '').pass).toBe(false);
        expect(checkQuest(puzzle, 'FD 7').pass).toBe(false);
        if (puzzle.starter) expect(checkQuest(puzzle, puzzle.starter).pass).toBe(false);
      });

      it('has a par that the reference solution meets with three stars', () => {
        const par = parOf(puzzle);
        expect(par).toBeGreaterThan(0);
        expect(commandsUsed(puzzle.solution)).toBe(par);
        expect(starsFor(par, par)).toBe(3);
      });
    });
  }
});

describe('stars', () => {
  it('gives three stars at par, two for a few more commands, and one otherwise', () => {
    expect(starsFor(3, 5)).toBe(3);
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(6, 5)).toBe(2);
    expect(starsFor(8, 5)).toBe(2);
    expect(starsFor(9, 5)).toBe(1);
    expect(starsFor(4, 1)).toBe(1);
    expect(starsFor(3, 1)).toBe(2);
  });

  it('counts commands the way the quests do: a REPEAT body once', () => {
    expect(commandsUsed('FD 100')).toBe(1);
    expect(commandsUsed('REPEAT 4 [FD 100 RT 90]')).toBe(3);
    expect(commandsUsed('FD 100 RT')).toBeNull();
  });
});

describe('the result to share', () => {
  it('uses the format of the roadmap', () => {
    expect(shareText(42, { commands: 7, stars: 3 })).toBe('GIO #42 \u{1F422} solved in 7 commands \u2B50\u2B50\u2B50');
    expect(shareText(5, { commands: 12, stars: 2 })).toBe('GIO #5 \u{1F422} solved in 12 commands \u2B50\u2B50');
    expect(shareText(105, { commands: 30, stars: 1 })).toBe('GIO #105 \u{1F422} solved in 30 commands \u2B50');
  });

  it('says "1 command" for one command', () => {
    expect(shareText(9, { commands: 1, stars: 3 })).toBe('GIO #9 \u{1F422} solved in 1 command \u2B50\u2B50\u2B50');
  });

  it('is spoiler free: no Logo words and no puzzle name', () => {
    for (const puzzle of [...LITTLE_DAILY, ...CODER_DAILY]) {
      const text = shareText(7, { commands: parOf(puzzle), stars: 3 });
      expect(text).toMatch(/^GIO #\d+ \u{1F422} solved in \d+ commands? \u2B50{1,3}$/u);
      expect(text.toLowerCase()).not.toContain(puzzle.title.toLowerCase());
      expect(text).not.toMatch(/\b(FD|RT|LT|REPEAT|CIRCLE)\b/);
    }
  });
});

describe('what stays in the browser', () => {
  it('round-trips results and keeps only the newest 60', () => {
    const results: Record<string, { commands: number; stars: 1 | 2 | 3 }> = {};
    for (let n = 1; n <= 70; n++) results[`${n}:coder`] = { commands: n, stars: 2 };
    const back = parseDaily(serializeDaily(results));
    expect(Object.keys(back)).toHaveLength(60);
    expect(back['70:coder']).toEqual({ commands: 70, stars: 2 });
    expect(back['10:coder']).toBeUndefined();
    expect(back['11:coder']).toEqual({ commands: 11, stars: 2 });
  });

  it('reads damaged data as nothing instead of failing', () => {
    expect(parseDaily(null)).toEqual({});
    expect(parseDaily('not json')).toEqual({});
    expect(parseDaily('{"solved":5}')).toEqual({});
    expect(parseDaily('{"solved":{"x":{"commands":3,"stars":3},"4:coder":{"commands":0,"stars":3},"5:coder":{"commands":3,"stars":9},"6:little":{"commands":3,"stars":1}}}')).toEqual({
      '6:little': { commands: 3, stars: 1 },
    });
  });
});
