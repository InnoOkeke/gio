import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE_LOOKUP, LEVELS, playLevel, type Level } from '../src/logo/adventure/index.js';
import { blocksToLogo, hasBody, parse, toBlocks, type Block } from '../src/logo/index.js';
import { AdventureBlocks, planBlocks } from '../src/ui/adventure/AdventureBlocks';
import { littlePalette } from '../src/ui/adventure/little-palette';
import { BlocksEditor, STUDIO_PALETTE } from '../src/ui/editor/BlocksEditor';
import { getAt, insertBlock, lineMap, moveBlock } from '../src/ui/editor/block-tree';
import { lab } from './helpers/adventure-lab';
import { ADVENTURE_REFERENCE } from './solutions/adventure.js';

const words = { words: ADVENTURE_LOOKUP };
const blocksOf = (code: string): Block[] => {
  const r = toBlocks(parse(code, words));
  if (!r.ok) throw new Error(r.reason);
  return r.blocks;
};
const kindsIn = (blocks: Block[]): string[] => blocks.flatMap((b) => [b.kind, ...(hasBody(b) ? kindsIn(b.body) : [])]);

describe('adventure blocks and Logo', () => {
  it('turns Swim, Jump, Free and Rest into blocks and back', () => {
    const code = 'SWIM\nJUMP\nFREE\nREST';
    expect(blocksOf(code).map((b) => b.kind)).toEqual(['swim', 'jump', 'free', 'rest']);
    expect(blocksToLogo(blocksOf(code))).toBe(code);
  });
  it('writes an If block as IF with = or <>, and reads it back', () => {
    const blocks: Block[] = [{ kind: 'if', sense: 'AHEAD', is: 'water', not: false, body: [{ kind: 'swim' }] }, { kind: 'if', sense: 'HERE', is: 'goal', not: true, body: [] }];
    const code = blocksToLogo(blocks);
    expect(code).toBe('IF AHEAD = "water [\n  SWIM\n]\nIF HERE <> "goal [ ]');
    expect(blocksOf(code)).toEqual(blocks);
  });
  it('nests If inside Repeat and Repeat inside If', () => {
    const code = 'REPEAT 6 [\n  IF AHEAD = "water [\n    SWIM\n  ]\n  IF AHEAD <> "water [\n    FD 50\n  ]\n]';
    expect(blocksToLogo(blocksOf(code))).toBe(code);
    const inner = 'IF AHEAD = "rock [\n  REPEAT 2 [\n    RT 90\n  ]\n]';
    expect(blocksToLogo(blocksOf(inner))).toBe(inner);
  });
  it('says no to IFELSE and to conditions blocks cannot show', () => {
    const no = (code: string) => {
      const r = toBlocks(parse(code, words));
      return r.ok ? 'ok' : r.reason;
    };
    expect(no('IFELSE AHEAD = "water [SWIM] [FD 50]')).toMatch(/IFELSE/);
    expect(no('IF GEMS = 1 [FD 50]')).toBe('it uses IF');
    expect(no('IF AHEAD = "water [FD :n]')).toMatch(/calculated/);
  });
  it('Studio code still reads IF as a block it cannot show', () => {
    const r = toBlocks(parse('MAKE "a 1\nIF :a = 1 [FD 10]'));
    expect(r.ok).toBe(false);
  });
  it('every Little reference solution is blocks that play the same way, with only blocks the palette offers', () => {
    for (const level of LEVELS.filter((l) => l.modes.includes('little'))) {
      const ref = ADVENTURE_REFERENCE[level.id]!.little!;
      const blocks = blocksOf(ref);
      const offered = new Set(littlePalette(level).groups.flatMap((g) => g.kinds));
      for (const k of kindsIn(blocks)) expect(offered.has(k as never), `${level.id} ${k}`).toBe(true);
      // Blocks put each command on its own line, so compare what Gio does, not the line numbers.
      const moves = (code: string) => JSON.stringify(playLevel(level, 'little', code).trace.map(({ line: _line, ...ev }) => ev));
      expect(moves(blocksToLogo(blocks)), level.id).toBe(moves(ref));
      expect(planBlocks(blocksToLogo(blocks)), level.id).toEqual(blocks);
    }
  });
});

describe('block tree with If blocks', () => {
  const tree: Block[] = [{ kind: 'forward', n: 50 }, { kind: 'if', sense: 'AHEAD', is: 'rock', not: false, body: [{ kind: 'right', n: 90 }] }, { kind: 'free' }];
  it('finds, fills and numbers lines inside an If body like a Repeat body', () => {
    expect(getAt(tree, [1, 0])).toEqual({ kind: 'right', n: 90 });
    const grown = insertBlock(tree, [1], 1, { kind: 'rest' });
    expect(blocksToLogo(grown).split('\n')).toEqual(['FD 50', 'IF AHEAD = "rock [', '  RT 90', '  REST', ']', 'FREE']);
    expect([...lineMap(grown).entries()]).toEqual([['0', 1], ['1', 2], ['1.0', 3], ['1.1', 4], ['2', 6]]);
  });
  it('moves a block into an If, and refuses to move an If into itself', () => {
    const moved = moveBlock(tree, [2], [1], 1)!;
    expect(kindsIn(moved.blocks)).toEqual(['forward', 'if', 'right', 'free']);
    expect(moveBlock(tree, [1], [1], 0)).toBeNull();
  });
});

describe('Little palette', () => {
  const level = (over: Partial<Level>): Level => lab(['.G.', '.~.', '.S.'], { modes: ['little'], ...over });
  it('shows only the blocks the level allows', () => {
    const kinds = (allow: string[]) => littlePalette(level({ allow: { little: allow, coder: [] } })).groups[0]!.kinds;
    expect(kinds(['FORWARD'])).toEqual(['forward']);
    expect(kinds(['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'FREE'])).toEqual(['forward', 'right', 'left', 'back', 'free']);
    expect(kinds(['FORWARD', 'REPEAT', 'IF', 'AHEAD', 'SWIM'])).toEqual(['forward', 'swim', 'repeat', 'if']);
  });
  it('gives Forward steps of 50 and turns of 90 with no number', () => {
    const p = littlePalette(level({}));
    expect(p.specs!.forward!.make!()).toEqual({ kind: 'forward', n: 50 });
    expect(p.specs!.forward!.number).toMatchObject({ step: 50, min: 50, max: 400 });
    expect(p.specs!.right!.make!()).toEqual({ kind: 'right', n: 90 });
    expect(p.specs!.right!.number).toBeNull();
    expect(p.specs!.left!.number).toBeNull();
  });
  it('offers the If block only the words this level can show', () => {
    expect(littlePalette(level({})).ifWords!.AHEAD).toEqual(['water', 'edge', 'goal', 'clear']);
  });
});

describe('Little editor markup', () => {
  // The editor reads the window size and media queries; a 390 by 844 phone stands in for them.
  beforeAll(() => {
    const list = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined };
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844, matchMedia: () => list });
  });
  afterAll(() => vi.unstubAllGlobals());
  const render = (code: string, over: Partial<Level> = {}) =>
    renderToStaticMarkup(createElement(AdventureBlocks, { level: lab(['.G.', '.~.', '.S.'], { modes: ['little'], allow: { little: ['FORWARD', 'RIGHT', 'SWIM', 'IF', 'AHEAD'], coder: [] }, ...over }), code, runningLine: null, problemLine: null, onChange: () => undefined }));
  it('lists the allowed blocks in the palette, with no group tabs and no Studio-only blocks', () => {
    const html = render('');
    for (const label of ['Forward', 'Turn right', 'Swim', 'If']) expect(html).toContain(`<span>${label}</span>`);
    for (const label of ['Colour', 'Circle', 'Pen up', 'Turn left', 'Note', 'Wait']) expect(html).not.toContain(`<span>${label}</span>`);
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('then press Go.');
  });
  it('shows the plan as blocks, an If as a sentence, and the Logo line that failed', () => {
    const html = renderToStaticMarkup(createElement(BlocksEditor, { blocks: blocksOf('FD 100\nIF AHEAD <> "water [\n  SWIM\n]'), runningLine: null, problemLine: 1, palette: littlePalette(lab(['.G.', '.~.', '.S.'], { allow: { little: ['FORWARD', 'IF', 'SWIM'], coder: [] } })), onChange: () => undefined }));
    expect(html).toContain('aria-label="Forward 100"');
    expect(html).toContain('If ahead is not water');
    expect(html).toContain('is-problem');
  });
  it('leaves Studio blocks as they were', () => {
    const html = renderToStaticMarkup(createElement(BlocksEditor, { blocks: [], runningLine: null, palette: STUDIO_PALETTE, onChange: () => undefined }));
    expect(html).toContain('role="tablist"');
    for (const label of ['Forward', 'Colour', 'Circle', 'Pen up']) expect(html).toContain(`<span>${label}</span>`);
    expect(html).not.toContain('Swim');
  });
});
