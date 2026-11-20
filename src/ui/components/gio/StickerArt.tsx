import type { ReactElement } from 'react';
import { stickerById, type StickerId } from '../../gio/catalog';

/* Twelve original stickers. Each has its own outline and its own picture, so no sticker
 * depends on colour alone. All are drawn in a 40 by 40 box centred on 0. */

const INK = '#17261f';
const SHAPE = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const };
const PEN = { fill: 'none', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const WHITE = { ...PEN, stroke: '#fff' };
const DARK = { ...PEN, stroke: INK };

export const STICKER_ART: Record<StickerId, () => ReactElement> = {
  moves: () => (
    <g>
      <circle r="17" fill="#2b9bf4" {...SHAPE} />
      <path d="M 0 10 L 0 -9 M -6 -3 L 0 -9 L 6 -3" {...WHITE} />
    </g>
  ),
  colours: () => (
    <g>
      <path d="M 0 -18 C 8 -8 14 -1 14 5 A 14 14 0 0 1 -14 5 C -14 -1 -8 -8 0 -18 Z" fill="#ec3f86" {...SHAPE} />
      <path d="M -7 4 Q -7 10 -2 11" {...WHITE} />
    </g>
  ),
  loops: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" rx="8" fill="#12a36b" {...SHAPE} />
      <path d="M 7 -4 A 8 8 0 1 0 6 5" {...WHITE} />
      <path d="M 9 -10 L 7 -4 L 1 -6" {...WHITE} />
    </g>
  ),
  functions: () => (
    <g>
      <polygon points="0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9" fill="#7a4cf0" {...SHAPE} />
      <path d="M -2 -9 Q -7 -9 -7 -4 L -7 -2 Q -7 0 -10 0 Q -7 0 -7 2 L -7 4 Q -7 9 -2 9" {...WHITE} />
      <path d="M 2 -9 Q 7 -9 7 -4 L 7 -2 Q 7 0 10 0 Q 7 0 7 2 L 7 4 Q 7 9 2 9" {...WHITE} />
    </g>
  ),
  variables: () => (
    <g>
      <path d="M 0 -18 L 15 -12 L 15 2 C 15 11 7 16 0 19 C -7 16 -15 11 -15 2 L -15 -12 Z" fill="#f08a24" {...SHAPE} />
      <rect x="-8" y="-3" width="16" height="12" rx="2" {...WHITE} />
      <path d="M -10 -3 L -7 -9 L 7 -9 L 10 -3" {...WHITE} />
    </g>
  ),
  decisions: () => (
    <g>
      <polygon points="0,-19 17,0 0,19 -17,0" fill="#1fb5c4" {...SHAPE} />
      <path d="M 0 9 L 0 0 M 0 0 L -7 -7 M 0 0 L 7 -7 M -7 -2 L -7 -7 L -2 -7 M 7 -2 L 7 -7 L 2 -7" {...WHITE} />
    </g>
  ),
  recursion: () => (
    <g>
      {[
        [10, 0],
        [5, 8.66],
        [-5, 8.66],
        [-10, 0],
        [-5, -8.66],
        [5, -8.66],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r="7" fill="#ff7a59" {...SHAPE} />
      ))}
      <circle r="10" fill="#ff7a59" />
      <path d="M 0 0 Q 3 -1 3 -3 Q 3 -7 -2 -7 Q -9 -7 -9 0 Q -9 9 1 9 Q 11 9 11 -1" {...WHITE} strokeWidth="2.2" />
    </g>
  ),
  debugging: () => (
    <g>
      <path d="M 0 -17 L 18 14 L -18 14 Z" fill="#ef5a4c" {...SHAPE} />
      <circle cx="-1" cy="4" r="5" {...WHITE} strokeWidth="2.2" />
      <path d="M 3 8 L 8 12" {...WHITE} strokeWidth="2.2" />
    </g>
  ),
  events: () => (
    <g>
      <path d="M -17 -12 Q -17 -17 -12 -17 L 12 -17 Q 17 -17 17 -12 L 17 6 Q 17 11 12 11 L 4 11 L -6 19 L -5 11 L -12 11 Q -17 11 -17 6 Z" fill="#4f7cff" {...SHAPE} />
      <rect x="-8" y="-11" width="16" height="15" rx="3" {...WHITE} strokeWidth="2.2" />
      <path d="M 0 0 L 0 -6 M -3 -3 L 0 -6 L 3 -3" {...WHITE} strokeWidth="2.2" />
    </g>
  ),
  'first-drawing': () => (
    <g>
      <path d="M 0 16 C -22 2 -14 -16 0 -7 C 14 -16 22 2 0 16 Z" fill="#ff8fab" {...SHAPE} />
      <path d="M -8 3 Q -4 -6 0 1 T 8 -2" {...WHITE} strokeWidth="2.2" />
    </g>
  ),
  'bug-fixer': () => (
    <g>
      <polygon points="0,-19 4.7,-6.5 18.1,-5.9 7.6,2.5 11.2,15.4 0,8 -11.2,15.4 -7.6,2.5 -18.1,-5.9 -4.7,-6.5" fill="#ffc93c" {...SHAPE} />
      <path d="M -6 0 L -1 5 L 7 -5" {...DARK} />
    </g>
  ),
  adventurer: () => (
    <g>
      <circle r="18" fill="#7bc96f" {...SHAPE} />
      <path d="M -5 13 L -5 -11" {...WHITE} />
      <path d="M -5 -11 L 11 -6 L -5 -1 Z" fill="#ffc93c" {...SHAPE} strokeWidth="2" />
      <path d="M -12 13 L 8 13" {...WHITE} />
    </g>
  ),
};

/** A sticker on its own, for the sticker book and toasts. The shell draws STICKER_ART directly. */
export function StickerPicture({ id, size = 48, className }: { id: StickerId; size?: number; className?: string }) {
  const Art = STICKER_ART[id];
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} role="img" aria-label={`${stickerById(id).name} sticker`} className={className}>
      <Art />
    </svg>
  );
}
