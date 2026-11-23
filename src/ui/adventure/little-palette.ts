import type { AgeModeId, Level } from '../../logo/adventure/index.js';
import { AHEAD_WORDS, HERE_WORDS } from '../../logo/adventure/index.js';
import type { BlockKind } from '../../logo/index.js';
import type { PaletteConfig } from '../editor/BlocksEditor';

/** The block each allowed word turns into, in the order the palette shows them. */
const BLOCK_FOR_WORD: [word: string, kind: BlockKind][] = [
  ['FORWARD', 'forward'],
  ['RIGHT', 'right'],
  ['LEFT', 'left'],
  ['BACK', 'back'],
  ['SWIM', 'swim'],
  ['JUMP', 'jump'],
  ['FREE', 'free'],
  ['REST', 'rest'],
  ['REPEAT', 'repeat'],
  ['IF', 'if'],
];

/** What AHEAD can say about this level's maps, so the If block offers only words a child can meet. */
function aheadWords(level: Level): string[] {
  const maps = [level.map, ...(level.variants ?? [])].flat().join('');
  const there: Record<string, boolean> = {
    enemy: (level.enemies?.length ?? 0) > 0,
    fire: (level.fires?.length ?? 0) > 0,
    friend: maps.includes('F'),
    gate: maps.includes('D'),
    rock: maps.includes('#'),
    water: maps.includes('~'),
    edge: true,
    goal: maps.includes('G'),
    gem: maps.includes('g'),
    clear: true,
  };
  return AHEAD_WORDS.filter((w) => there[w]);
}

/**
 * The Little Turtles' blocks for one level: only the words the level allows. Forward and Back move
 * in steps of 50 (the number on a block is the Logo number), turns are quarter turns with no number.
 */
export function littlePalette(level: Level, mode: AgeModeId = 'little'): PaletteConfig {
  const allowed = new Set(level.allow[mode]);
  const kinds = BLOCK_FOR_WORD.filter(([word]) => allowed.has(word)).map(([, kind]) => kind);
  const ahead = aheadWords(level);
  return {
    groups: [{ id: 'adventure', title: 'Blocks', kinds }],
    wrap: true,
    runLabel: 'Go',
    ifWords: { AHEAD: ahead, HERE: HERE_WORDS },
    specs: {
      forward: { make: () => ({ kind: 'forward', n: 50 }), number: { step: 50, min: 50, max: 400 } },
      back: { make: () => ({ kind: 'back', n: 50 }), number: { step: 50, min: 50, max: 400 } },
      right: { label: 'Turn right', make: () => ({ kind: 'right', n: 90 }), number: null },
      left: { label: 'Turn left', make: () => ({ kind: 'left', n: 90 }), number: null },
      repeat: { make: () => ({ kind: 'repeat', n: 2, body: [] }), number: { step: 1, min: 2, max: 12, unit: '×' } },
      if: { make: () => ({ kind: 'if', sense: 'AHEAD', is: ahead.includes('water') ? 'water' : (ahead[0] ?? 'clear'), not: false, body: [] }) },
    },
  };
}
