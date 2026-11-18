import { describe, expect, it } from 'vitest';
import { BLOCK_COLORS, check, start, toBlocks, type TurtleEvent } from '../src/logo/index.js';
import { NAMED_COLORS } from '../src/logo/colors.js';
import {
  FIRST_WIN_COLOURS,
  FIRST_WIN_KEY,
  firstWinProgram,
  parseFirstWin,
  shouldOfferFirstWin,
  type FirstWinFacts,
} from '../src/ui/first-win';

const NEW_CHILD: FirstWinFacts = {
  mode: 'little',
  shown: [],
  completedQuests: [],
  learnedDays: [],
  draftCode: '',
  onSharedLink: false,
};

describe('shouldOfferFirstWin', () => {
  it('offers the first drawing to a brand-new child in either mode', () => {
    expect(shouldOfferFirstWin(NEW_CHILD)).toBe(true);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, mode: 'coder' })).toBe(true);
  });

  it('shows once per age mode', () => {
    expect(shouldOfferFirstWin({ ...NEW_CHILD, shown: ['little'] })).toBe(false);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, mode: 'coder', shown: ['coder'] })).toBe(false);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, mode: 'coder', shown: ['little'] })).toBe(true);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, shown: ['little', 'coder'] })).toBe(false);
  });

  it('never offers it to a child with quest progress or learning days', () => {
    expect(shouldOfferFirstWin({ ...NEW_CHILD, completedQuests: ['l-walk'] })).toBe(false);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, learnedDays: ['2025-06-10'] })).toBe(false);
  });

  it('never offers it over a draft or on a shared link', () => {
    expect(shouldOfferFirstWin({ ...NEW_CHILD, draftCode: 'FD 100' })).toBe(false);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, draftCode: '  \n ' })).toBe(true);
    expect(shouldOfferFirstWin({ ...NEW_CHILD, onSharedLink: true })).toBe(false);
  });
});

describe('parseFirstWin', () => {
  it('reads the stored list of modes', () => {
    expect(parseFirstWin('["little"]')).toEqual(['little']);
    expect(parseFirstWin('["coder","little"]')).toEqual(['little', 'coder']);
    expect(FIRST_WIN_KEY).toBe('gio.firstWin');
  });

  it('is tolerant of missing, broken and wrongly typed values', () => {
    expect(parseFirstWin(null)).toEqual([]);
    expect(parseFirstWin('')).toEqual([]);
    expect(parseFirstWin('not json {')).toEqual([]);
    expect(parseFirstWin('{"little":true}')).toEqual([]);
    expect(parseFirstWin('"little"')).toEqual([]);
    expect(parseFirstWin('[1,null,{},["coder"]]')).toEqual([]);
    expect(parseFirstWin('["robot","coder","little","coder"]')).toEqual(['little', 'coder']);
  });
});

function lineEvents(events: readonly TurtleEvent[]) {
  return events.filter((e): e is Extract<TurtleEvent, { type: 'line' }> => e.type === 'line');
}

describe('firstWinProgram', () => {
  it('offers six swatches that are block colours, none of them black, with hex from NAMED_COLORS', () => {
    expect(FIRST_WIN_COLOURS).toHaveLength(6);
    for (const c of FIRST_WIN_COLOURS) {
      expect(BLOCK_COLORS).toContain(c.name);
      expect(c.name).not.toBe('black');
      expect(c.hex).toBe(NAMED_COLORS[c.name.toUpperCase()]);
    }
  });

  for (const swatch of FIRST_WIN_COLOURS) {
    it(`Little Turtles: a ${swatch.name} star is valid blocks and draws five lines in range`, () => {
      const code = firstWinProgram('little', swatch.name);
      expect(code).not.toContain(';');
      const parsed = check(code);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(toBlocks(parsed.program).ok).toBe(true);

      const run = start(code);
      expect(run.ok).toBe(true);
      if (!run.ok) return;
      const lines = lineEvents(run.result.events);
      expect(lines).toHaveLength(5);
      for (const l of lines) {
        expect(l.color).toBe(swatch.hex);
        for (const v of [l.x1, l.y1, l.x2, l.y2]) expect(Math.abs(v)).toBeLessThanOrEqual(260);
      }
    });
  }

  it('Turtle Coders get the same star under a title comment, with a colour line to change', () => {
    const little = firstWinProgram('little', 'red');
    const code = firstWinProgram('coder', 'red');
    expect(code.split('\n')[0]).toBe('; My first star');
    expect(code.split('\n').slice(1).join('\n')).toBe(little);
    expect(code).toContain('SETPENCOLOR "red');

    const run = start(code);
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    expect(lineEvents(run.result.events)).toHaveLength(5);
  });
});
