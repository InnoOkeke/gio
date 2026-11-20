import { describe, expect, it } from 'vitest';
import { blocksToLogo, type Block } from '../src/logo/index.js';
import { getAt, insertBlock, isDescendant, lineMap, moveBlock, removeBlock } from '../src/ui/editor/block-tree';

const fd = (n: number): Block => ({ kind: 'forward', n });
const rt = (n: number): Block => ({ kind: 'right', n });
const rep = (n: number, body: Block[]): Block => ({ kind: 'repeat', n, body });
const logo = (blocks: Block[]) => blocksToLogo(blocks).trim().split('\n');

describe('moveBlock', () => {
  const list = [fd(10), fd(20), fd(30), fd(40)];

  it('moves a block down the same list and adjusts the index', () => {
    const r = moveBlock(list, [0], [], 3)!;
    expect(r.blocks.map((b) => (b as { n: number }).n)).toEqual([20, 30, 10, 40]);
    expect(r.path).toEqual([2]);
  });

  it('moves a block up the same list', () => {
    const r = moveBlock(list, [3], [], 1)!;
    expect(r.blocks.map((b) => (b as { n: number }).n)).toEqual([10, 40, 20, 30]);
    expect(r.path).toEqual([1]);
  });

  it('dropping next to itself changes nothing', () => {
    expect(moveBlock(list, [1], [], 1)!.blocks).toEqual(list);
    expect(moveBlock(list, [1], [], 2)!.blocks).toEqual(list);
  });

  it('moves into a Repeat', () => {
    const r = moveBlock([fd(1), rep(4, [rt(90)])], [0], [1], 1)!;
    // The Repeat shifted up to index 0 once fd(1) was removed.
    expect(r.blocks).toEqual([rep(4, [rt(90), fd(1)])]);
    expect(r.path).toEqual([0, 1]);
    expect(logo(r.blocks)).toEqual(['REPEAT 4 [', '  RT 90', '  FD 1', ']']);
  });

  it('moves out of a Repeat', () => {
    const r = moveBlock([rep(4, [fd(1), rt(90)]), fd(5)], [0, 1], [], 2)!;
    expect(r.blocks).toEqual([rep(4, [fd(1)]), fd(5), rt(90)]);
    expect(r.path).toEqual([2]);
  });

  it('moves into a nested Repeat', () => {
    const tree = [fd(9), rep(2, [rt(1), rep(3, [])])];
    const r = moveBlock(tree, [0], [1, 1], 0)!;
    expect(r.blocks).toEqual([rep(2, [rt(1), rep(3, [fd(9)])])]);
    expect(r.path).toEqual([0, 1, 0]);
  });

  it('moves a later top-level block into a nested Repeat', () => {
    const tree = [rep(2, [fd(1), rep(3, [rt(5)])]), fd(7)];
    const nested = moveBlock(tree, [1], [0, 1], 1)!;
    expect(nested.blocks).toEqual([rep(2, [fd(1), rep(3, [rt(5), fd(7)])])]);
  });

  it('refuses to drop a Repeat into itself or its descendants', () => {
    const tree = [rep(2, [rep(3, [fd(1)])])];
    expect(moveBlock(tree, [0], [0], 0)).toBeNull();
    expect(moveBlock(tree, [0], [0, 0], 0)).toBeNull();
    expect(moveBlock(tree, [0, 0], [0, 0], 0)).toBeNull();
  });

  it('returns null for a missing source and clamps a too-large index', () => {
    expect(moveBlock(list, [9], [], 0)).toBeNull();
    expect(moveBlock(list, [0], [], 99)!.path).toEqual([3]);
  });
});

describe('insertBlock and removeBlock', () => {
  it('inserts at the top, inside a Repeat and inside a nested Repeat', () => {
    const base = [rep(2, [rep(3, [])])];
    expect(insertBlock(base, [], 0, fd(1))).toEqual([fd(1), rep(2, [rep(3, [])])]);
    expect(insertBlock(base, [0], 0, fd(1))).toEqual([rep(2, [fd(1), rep(3, [])])]);
    expect(insertBlock(base, [0, 0], 0, fd(1))).toEqual([rep(2, [rep(3, [fd(1)])])]);
  });

  it('removes a nested block', () => {
    expect(removeBlock([rep(2, [fd(1), rt(2)])], [0, 0])).toEqual([rep(2, [rt(2)])]);
  });
});

describe('isDescendant and getAt', () => {
  it('knows ancestry', () => {
    expect(isDescendant([0, 1, 2], [0, 1])).toBe(true);
    expect(isDescendant([0, 1], [0, 1])).toBe(true);
    expect(isDescendant([0], [0, 1])).toBe(false);
    expect(isDescendant([1, 0], [0])).toBe(false);
  });
  it('reads a nested block', () => {
    expect(getAt([rep(2, [fd(1), rt(2)])], [0, 1])).toEqual(rt(2));
    expect(getAt([fd(1)], [3])).toBeUndefined();
  });
});

describe('lineMap', () => {
  it('matches the lines blocksToLogo writes', () => {
    const tree = [fd(1), rep(2, [rt(1), rep(3, [fd(2)]), fd(3)]), rt(4)];
    const lines = logo(tree);
    const map = lineMap(tree);
    const text = (path: string) => lines[map.get(path)! - 1]!.trim();
    expect(text('0')).toBe('FD 1');
    expect(text('1')).toBe('REPEAT 2 [');
    expect(text('1.0')).toBe('RT 1');
    expect(text('1.1')).toBe('REPEAT 3 [');
    expect(text('1.1.0')).toBe('FD 2');
    expect(text('1.2')).toBe('FD 3');
    expect(text('2')).toBe('RT 4');
  });
});
