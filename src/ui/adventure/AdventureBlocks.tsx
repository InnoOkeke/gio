import { useMemo } from 'react';
import { ADVENTURE_LOOKUP, type Level } from '../../logo/adventure/index.js';
import { blocksToLogo, parse, toBlocks, type Block } from '../../logo/index.js';
import { BlocksEditor } from '../editor/BlocksEditor';
import { littlePalette } from './little-palette';

/** The plan as blocks. A plan that cannot be shown as blocks (it never comes from here) shows as an empty list. */
export function planBlocks(code: string): Block[] {
  if (code.trim() === '') return [];
  try {
    const shown = toBlocks(parse(code, { words: ADVENTURE_LOOKUP }));
    return shown.ok ? shown.blocks : [];
  } catch {
    return [];
  }
}

interface AdventureBlocksProps {
  level: Level;
  /** The plan as Logo. Blocks are written into it, so the plan is always real Logo underneath. */
  code: string;
  runningLine: number | null;
  problemLine: number | null;
  onChange(code: string): void;
}

/** Little Turtles' editor: the studio's block editor with the level's own palette. */
export function AdventureBlocks({ level, code, runningLine, problemLine, onChange }: AdventureBlocksProps) {
  const blocks = useMemo(() => planBlocks(code), [code]);
  const palette = useMemo(() => littlePalette(level), [level]);
  return <BlocksEditor blocks={blocks} runningLine={runningLine} problemLine={problemLine} palette={palette} onChange={(next) => onChange(blocksToLogo(next))} />;
}
