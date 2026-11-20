import type { Dir } from '../../logo/adventure/level.js';
import type { SceneState } from './scene-state';

const FACING: Record<Dir, string> = { N: 'up', E: 'right', S: 'down', W: 'left' };

/** Which third of an axis a cell sits in. */
function third(index: number, size: number): 'low' | 'mid' | 'high' {
  const f = size <= 1 ? 0.5 : index / (size - 1);
  return f <= 1 / 3 ? 'low' : f >= 2 / 3 ? 'high' : 'mid';
}

/** "at the top", "at the bottom left", "in the middle". */
export function whereWords(col: number, row: number, cols: number, rows: number): string {
  const v = third(row, rows);
  const h = third(col, cols);
  if (v === 'mid' && h === 'mid') return 'in the middle';
  const vertical = v === 'low' ? 'top' : v === 'high' ? 'bottom' : '';
  const horizontal = h === 'low' ? 'left' : h === 'high' ? 'right' : '';
  if (!horizontal) return `at the ${vertical}`;
  if (!vertical) return `on the ${horizontal}`;
  return `at the ${vertical} ${horizontal}`;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

function cellsOf(scene: SceneState, ch: string): [number, number][] {
  const found: [number, number][] = [];
  scene.cells.forEach((row, r) => row.forEach((c, k) => c === ch && found.push([k, r])));
  return found;
}

/** Where a few things are: "at the top", or "at the top and in the middle". */
function placesOf(scene: SceneState, cells: [number, number][]): string {
  const words = [...new Set(cells.map(([c, r]) => whereWords(c, r, scene.cols, scene.rows)))];
  return words.length <= 3 ? words.join(' and ') : '';
}

function thing(scene: SceneState, ch: string, one: string, many: string, none: string): string {
  const cells = cellsOf(scene, ch);
  if (cells.length === 0) return none;
  const where = placesOf(scene, cells);
  const count = cells.length === 1 ? `${one}` : `${cells.length} ${many}`;
  return `${count[0]!.toUpperCase()}${count.slice(1)}${where ? ` ${where}` : ''}.`;
}

/**
 * One sentence per kind of thing, for the scene's `aria-label` and for reading aloud:
 * "Map 5 by 5. Gio at the bottom, facing up. Flag at the top. 1 gem. No rocks."
 */
export function describeScene(scene: SceneState): string {
  const { gio, cols, rows } = scene;
  const parts = [`Map ${cols} by ${rows}.`, `Gio ${whereWords(gio.col, gio.row, cols, rows)}, facing ${FACING[gio.dir]}.`];
  const flag = cellsOf(scene, 'G');
  if (flag.length > 0) parts.push(`Flag ${placesOf(scene, flag)}.`);
  const cages = cellsOf(scene, 'F');
  if (cages.length > 0) parts.push(thing(scene, 'F', 'Caged friend', 'caged friends', ''));
  const gate = cellsOf(scene, 'D');
  if (gate.length > 0) parts.push(`Gate ${placesOf(scene, gate)}.`);
  const left = cellsOf(scene, 'g').length;
  parts.push(scene.gems > 0 ? `${plural(left, 'gem')} left, ${scene.gems} collected.` : `${plural(left, 'gem')}.`);
  const rocks = cellsOf(scene, '#').length;
  parts.push(rocks === 0 ? 'No rocks.' : `${plural(rocks, 'rock')}.`);
  const water = cellsOf(scene, '~').length;
  if (water > 0) parts.push(`${plural(water, 'water square')}.`);
  if (scene.enemies.length > 0) parts.push(`${plural(scene.enemies.length, 'Grumble')}.`);
  if (scene.fires.length > 0) parts.push(`${plural(scene.fires.length, 'fire square', 'fire squares')} burning.`);
  const boots = cellsOf(scene, 'j').length;
  if (boots > 0) parts.push(`${plural(boots, 'pair')} of boots.`);
  const shields = cellsOf(scene, 'o').length;
  if (shields > 0) parts.push(`${plural(shields, 'shield')}.`);
  return parts.filter(Boolean).join(' ');
}

/** What one cell holds, in a word or two. Gio and anything moving win over the ground. */
export function cellWord(scene: SceneState, col: number, row: number): string {
  const { gio } = scene;
  if (gio.col === col && gio.row === row) return `Gio, facing ${FACING[gio.dir]}`;
  if (scene.enemies.some((e) => e.col === col && e.row === row)) return 'Grumble';
  if (scene.fires.some(([c, r]) => c === col && r === row)) return 'fire';
  if (scene.freed.some(([c, r]) => c === col && r === row)) return 'free friend';
  switch (scene.cells[row]![col]) {
    case '#':
      return 'rock';
    case '~':
      return 'water';
    case '=':
      return 'bridge';
    case 'g':
      return 'gem';
    case 'G':
      return 'flag';
    case 'F':
      return 'cage';
    case 'D':
      return 'gate';
    case 'j':
      return 'boots';
    case 'o':
      return 'shield';
    default:
      return 'clear';
  }
}

export interface DescribedRow {
  /** "Row 1 of 5, top". */
  label: string;
  cells: string[];
  /** The row as one sentence, for reading aloud. */
  spoken: string;
}

/** The map row by row, top first. Used for the "Describe the map" table and for reading aloud. */
export function describeRows(scene: SceneState): DescribedRow[] {
  return scene.cells.map((_, row) => {
    const edge = row === 0 ? ', top' : row === scene.rows - 1 ? ', bottom' : '';
    const label = `Row ${row + 1} of ${scene.rows}${edge}`;
    const cells = scene.cells[row]!.map((_c, col) => cellWord(scene, col, row));
    return { label, cells, spoken: `${label}: ${cells.join(', ')}.` };
  });
}
