import type { Level } from '../../src/logo/adventure/level.js';
import { playLevel, type LevelOutcome } from '../../src/logo/adventure/play.js';

const ALL_WORDS = ['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'SWIM', 'JUMP', 'FREE', 'REST', 'AHEAD', 'HERE', 'GEMS', 'REPEAT', 'IF', 'IFELSE', 'MAKE', 'TO', 'STOP'];

/** A small real level for testing one rule. Everything is allowed, `S` marks the start facing north. */
export function lab(map: string[], over: Partial<Level> = {}): Level {
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

export function play(level: Level, code: string): LevelOutcome {
  return playLevel(level, 'coder', code);
}
