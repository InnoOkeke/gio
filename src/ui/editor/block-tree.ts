import type { Block } from '../../logo/index.js';

/** A block's place in the tree: indexes from the top list down through Repeat bodies. */
export type Path = number[];

export function getAt(blocks: Block[], path: Path): Block | undefined {
  let list = blocks;
  let node: Block | undefined;
  for (const i of path) {
    node = list[i];
    if (!node) return undefined;
    list = node.kind === 'repeat' ? node.body : [];
  }
  return node;
}

export function update(blocks: Block[], path: Path, fn: (list: Block[], index: number) => Block[]): Block[] {
  if (path.length === 1) return fn(blocks, path[0]!);
  const [head, ...rest] = path;
  return blocks.map((b, i) => (i === head && b.kind === 'repeat' ? { ...b, body: update(b.body, rest, fn) } : b));
}

export function insertInto(blocks: Block[], parent: Path, index: number, block: Block): Block[] {
  if (!parent.length) return [...blocks.slice(0, index), block, ...blocks.slice(index)];
  return update(blocks, parent, (list, i) =>
    list.map((b, k) => (k === i && b.kind === 'repeat' ? { ...b, body: [...b.body.slice(0, index), block, ...b.body.slice(index)] } : b)),
  );
}

/** Logo line of every block, matching blocksToLogo's layout, so the running line can light up a block. */
export function lineMap(blocks: Block[]): Map<string, number> {
  const map = new Map<string, number>();
  let line = 1;
  const visit = (list: Block[], prefix: Path) => {
    list.forEach((b, i) => {
      const path = [...prefix, i];
      map.set(path.join('.'), line++);
      if (b.kind === 'repeat' && b.body.length) {
        visit(b.body, path);
        line++; // closing ]
      }
    });
  };
  visit(blocks, []);
  return map;
}

/** True when `path` is `ancestor` itself or sits anywhere inside it. */
export function isDescendant(path: Path, ancestor: Path): boolean {
  return path.length >= ancestor.length && ancestor.every((v, i) => path[i] === v);
}

/** Insert a new block into the list at `parent` (empty for the top list), before position `index`. */
export function insertBlock(blocks: Block[], parent: Path, index: number, block: Block): Block[] {
  return insertInto(blocks, parent, index, block);
}

export function removeBlock(blocks: Block[], path: Path): Block[] {
  return update(blocks, path, (list, i) => [...list.slice(0, i), ...list.slice(i + 1)]);
}

/**
 * Move the block at `from` into the list at `toParent`, before position `toIndex` of that list as
 * it looks BEFORE the move. Returns the new blocks and the block's new path, or null when the drop
 * is refused (a Repeat cannot go inside itself) or the source does not exist.
 */
export function moveBlock(blocks: Block[], from: Path, toParent: Path, toIndex: number): { blocks: Block[]; path: Path } | null {
  const block = getAt(blocks, from);
  if (!block) return null;
  if (isDescendant(toParent, from)) return null;

  const depth = from.length - 1;
  const fromIndex = from[depth]!;
  const sameParent = from.length - 1 === toParent.length && toParent.every((v, i) => from[i] === v);

  // Removing the block shifts later siblings (and anything inside them) up by one.
  const parent = toParent.map((v, i) => (i === depth && v > fromIndex && isDescendant(toParent, from.slice(0, depth)) ? v - 1 : v));
  const index = sameParent && fromIndex < toIndex ? toIndex - 1 : toIndex;

  const without = removeBlock(blocks, from);
  const list = parent.length ? getAt(without, parent) : undefined;
  const length = parent.length ? (list?.kind === 'repeat' ? list.body.length : -1) : without.length;
  if (length < 0) return null;
  const at = Math.max(0, Math.min(index, length));
  return { blocks: insertInto(without, parent, at, block), path: [...parent, at] };
}
