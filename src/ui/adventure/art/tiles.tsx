import type { ReactElement } from 'react';
import type { RealmId } from '../../../logo/adventure/level.js';

/* Tiles are drawn in a 50 by 50 box with the same soft outline as the garden and island art: INK at 35 percent
 * opacity, 1.2 wide, round joins. Shapes carry the meaning (waves, chunky rocks, diamonds, bars, a padlock),
 * so no tile depends on colour alone. */

export const TILE = 50;
const INK = '#17261f';
const EDGE = { stroke: INK, strokeOpacity: 0.35, strokeWidth: 1.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export interface RealmPalette {
  name: string;
  groundA: string;
  groundB: string;
  tuft: string;
  rock: string;
  rockHigh: string;
  water: string;
  waveLine: string;
  wood: string;
  /** The Grumble colour in this realm. */
  grumble: string;
}

/** Realm palettes from the existing tokens: --green, --sky, --grape, --sun, --coral and a few earth tones. */
export const REALM_PALETTES: Record<RealmId, RealmPalette> = {
  maze: { name: 'Maze Meadow', groundA: '#c9efae', groundB: '#bce79d', tuft: '#7fc36a', rock: '#8c98a3', rockHigh: '#bcc6cf', water: '#8fd3f4', waveLine: '#dff3fc', wood: '#a9743a', grumble: '#ff9a62' },
  woods: { name: 'Whispering Woods', groundA: '#8fcf8a', groundB: '#7fc17e', tuft: '#3f8f55', rock: '#7d6a58', rockHigh: '#a99682', water: '#7cc7e8', waveLine: '#d3eefa', wood: '#8a5a2b', grumble: '#f2b24c' },
  river: { name: 'Rolling River', groundA: '#d6f0c4', groundB: '#c8e8b3', tuft: '#8bc57a', rock: '#8e9aa8', rockHigh: '#c2ccd8', water: '#6cc2f0', waveLine: '#e4f6ff', wood: '#a9743a', grumble: '#ff9a62' },
  swamp: { name: 'Sleepy Swamp', groundA: '#9fd8c8', groundB: '#8fcdbc', tuft: '#0f8fa6', rock: '#6f7f86', rockHigh: '#9cacb2', water: '#4fb3c8', waveLine: '#b6e6ee', wood: '#7a5a3a', grumble: '#b58cf0' },
  cave: { name: 'Crystal Cave', groundA: '#c5bfdc', groundB: '#b8b1d3', tuft: '#8a7fc0', rock: '#5f6477', rockHigh: '#8c91a5', water: '#8aa9e6', waveLine: '#d5e1fb', wood: '#7a6a8a', grumble: '#ff8fab' },
  hills: { name: 'Number Hills', groundA: '#f6e3a1', groundB: '#f0d98c', tuft: '#f97316', rock: '#a28c6a', rockHigh: '#cfbb98', water: '#86cdea', waveLine: '#def2fb', wood: '#a9743a', grumble: '#ef6a5a' },
  castle: { name: "Gio's Castle", groundA: '#e5ddcf', groundB: '#d9d0bf', tuft: '#b9ae98', rock: '#7c7a86', rockHigh: '#aaa8b6', water: '#7fbfe6', waveLine: '#d8eefb', wood: '#8a5a2b', grumble: '#ff7a6b' },
};

/** Symbol ids used by the scene. `uid` keeps them apart when several scenes share a page. */
export type TileSymbol = 'groundA' | 'groundB' | 'rock' | 'water' | 'bridge' | 'gem' | 'flag' | 'bars' | 'gate' | 'boots' | 'shield' | 'fire' | 'tree';

export const symbolId = (uid: string, name: TileSymbol): string => `${uid}-${name}`;

function Tuft({ x, y, color }: { x: number; y: number; color: string }): ReactElement {
  return <path d={`M ${x} ${y} l -2 -5 M ${x} ${y} l 0 -6 M ${x} ${y} l 2 -5`} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />;
}

/** All the tiles as `<symbol>`s, to be reused with `<use>`. */
export function TileDefs({ uid, palette }: { uid: string; palette: RealmPalette }): ReactElement {
  const id = (n: TileSymbol) => symbolId(uid, n);
  const view = `0 0 ${TILE} ${TILE}`;
  return (
    <defs>
      <symbol id={id('groundA')} viewBox={view}>
        <rect width={TILE} height={TILE} fill={palette.groundA} />
        <Tuft x={12} y={38} color={palette.tuft} />
        <Tuft x={38} y={16} color={palette.tuft} />
      </symbol>
      <symbol id={id('groundB')} viewBox={view}>
        <rect width={TILE} height={TILE} fill={palette.groundB} />
        <Tuft x={34} y={40} color={palette.tuft} />
        <Tuft x={14} y={14} color={palette.tuft} />
      </symbol>
      <symbol id={id('rock')} viewBox={view}>
        <path d="M 7 40 Q 4 26 13 17 Q 20 7 31 10 Q 44 12 45 27 Q 47 38 40 43 Q 24 47 7 40 Z" fill={palette.rock} {...EDGE} strokeWidth={2.4} />
        <path d="M 14 24 Q 17 15 27 14" fill="none" stroke={palette.rockHigh} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M 29 30 L 36 36 M 22 36 L 27 40" fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" strokeLinecap="round" />
      </symbol>
      <symbol id={id('tree')} viewBox={view}>
        <ellipse cx="25" cy="45" rx="14" ry="3.6" fill={INK} fillOpacity="0.18" />
        <path d="M 21 46 L 22 33 L 28 33 L 29 46 Z" fill={palette.wood} {...EDGE} strokeWidth={1.8} />
        <path d="M 25 4 Q 34 4 37 12 Q 45 15 43 24 Q 45 33 36 35 Q 30 40 24 36 Q 15 39 11 32 Q 4 28 8 20 Q 7 10 16 9 Q 19 4 25 4 Z" fill={palette.tuft} {...EDGE} strokeWidth={2.2} />
        <path d="M 15 17 Q 18 11 25 11" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <path d="M 30 22 q 3 -3 6 0 M 18 27 q 3 -3 6 0" fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" strokeLinecap="round" />
      </symbol>
      <symbol id={id('water')} viewBox={view}>
        <rect width={TILE} height={TILE} fill={palette.water} />
        <path d="M 4 16 Q 10 11 16 16 T 28 16 T 40 16" fill="none" stroke={palette.waveLine} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 10 30 Q 16 25 22 30 T 34 30 T 46 30" fill="none" stroke={palette.waveLine} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 2 43 Q 8 39 14 43 T 26 43" fill="none" stroke={palette.waveLine} strokeWidth="2.4" strokeLinecap="round" />
      </symbol>
      <symbol id={id('bridge')} viewBox={view}>
        <rect width={TILE} height={TILE} fill={palette.water} />
        <rect x="6" y="0" width="38" height={TILE} fill={palette.wood} {...EDGE} />
        {[6, 16, 26, 36, 46].map((y) => (
          <path key={y} d={`M 6 ${y} L 44 ${y}`} stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" />
        ))}
        <path d="M 6 0 L 6 50 M 44 0 L 44 50" stroke={INK} strokeOpacity="0.4" strokeWidth="3" />
      </symbol>
      <symbol id={id('gem')} viewBox={view}>
        <path d="M 25 8 L 38 20 L 25 42 L 12 20 Z" fill="#ff6fa8" {...EDGE} strokeWidth={2} />
        <path d="M 12 20 L 38 20 M 25 8 L 21 20 L 25 42 M 25 8 L 29 20 L 25 42" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M 40 8 l 1.4 3.6 l 3.6 1.4 l -3.6 1.4 l -1.4 3.6 l -1.4 -3.6 l -3.6 -1.4 l 3.6 -1.4 Z" fill="#ffd84d" />
      </symbol>
      <symbol id={id('flag')} viewBox={view}>
        <ellipse cx="25" cy="43" rx="11" ry="4" fill={INK} fillOpacity="0.18" />
        <path d="M 17 44 L 17 6" stroke={INK} strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
        <path d="M 19 7 L 41 14 L 19 23 Z" fill="#ff6b5a" {...EDGE} strokeWidth={2} />
        <circle cx="17" cy="6" r="2.6" fill="#ffd84d" {...EDGE} />
      </symbol>
      <symbol id={id('bars')} viewBox={view}>
        <path d="M 6 44 L 6 10 Q 25 -2 44 10 L 44 44" fill="#fff" fillOpacity="0.18" stroke={INK} strokeOpacity="0.7" strokeWidth="2.4" strokeLinejoin="round" />
        {[14, 22, 30, 38].map((x) => (
          <path key={x} d={`M ${x} 8 L ${x} 44`} stroke={INK} strokeOpacity="0.6" strokeWidth="2.6" strokeLinecap="round" />
        ))}
        <path d="M 4 44 L 46 44" stroke={INK} strokeOpacity="0.75" strokeWidth="4" strokeLinecap="round" />
      </symbol>
      <symbol id={id('gate')} viewBox={view}>
        <path d="M 4 46 L 4 14 Q 25 -4 46 14 L 46 46 Z" fill={palette.rock} {...EDGE} strokeWidth={2.4} />
        <path d="M 12 46 L 12 18 Q 25 8 38 18 L 38 46 Z" fill={palette.wood} {...EDGE} />
        <rect x="19" y="26" width="12" height="11" rx="2.4" fill="#ffd84d" {...EDGE} strokeWidth={1.8} />
        <path d="M 21.5 26 L 21.5 21 Q 25 16 28.5 21 L 28.5 26" fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="25" cy="31" r="1.7" fill={INK} fillOpacity="0.7" />
      </symbol>
      <symbol id={id('boots')} viewBox={view}>
        <path d="M 9 14 L 9 34 Q 9 40 15 40 L 24 40 L 24 32 L 18 32 L 18 14 Z" fill="#c8793a" {...EDGE} strokeWidth={2} />
        <path d="M 28 14 L 28 34 Q 28 40 34 40 L 43 40 L 43 32 L 37 32 L 37 14 Z" fill="#c8793a" {...EDGE} strokeWidth={2} />
        <path d="M 9 20 L 18 20 M 28 20 L 37 20" stroke="#ffd84d" strokeWidth="2.6" />
        <path d="M 11 43 l 3 -3 M 30 43 l 3 -3" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />
      </symbol>
      <symbol id={id('shield')} viewBox={view}>
        <path d="M 25 6 L 41 11 L 41 25 Q 41 37 25 45 Q 9 37 9 25 L 9 11 Z" fill="#4aa8ff" {...EDGE} strokeWidth={2.2} />
        <path d="M 25 12 L 35 15 L 35 25 Q 35 33 25 39 Z" fill="#fff" fillOpacity="0.4" />
        <path d="M 25 17 L 27 22 L 32 22 L 28 25 L 29.6 30 L 25 27 L 20.4 30 L 22 25 L 18 22 L 23 22 Z" fill="#ffd84d" />
      </symbol>
      <symbol id={id('fire')} viewBox={view}>
        <path d="M 25 5 Q 33 16 36 24 Q 40 32 34 40 Q 29 46 22 45 Q 12 43 12 32 Q 12 25 19 19 Q 19 26 23 27 Q 21 16 25 5 Z" fill="#ff8a24" {...EDGE} strokeWidth={2} />
        <path d="M 26 22 Q 32 30 31 36 Q 30 42 24 42 Q 18 41 19 35 Q 20 30 26 22 Z" fill="#ffd84d" />
      </symbol>
    </defs>
  );
}

/** Which ground tile a cell sits on: a checker of two greens keeps long rows readable. */
export function groundFor(col: number, row: number): TileSymbol {
  return (col + row) % 2 === 0 ? 'groundA' : 'groundB';
}

/** The tile under a map character, and the overlay on top of it (if any). `S` and `.` are plain ground. */
export function tileFor(ch: string, col: number, row: number, realm?: RealmId): { base: TileSymbol; over: TileSymbol | null } {
  switch (ch) {
    case '#':
      return { base: groundFor(col, row), over: realm === 'woods' ? 'tree' : 'rock' };
    case '~':
      return { base: 'water', over: null };
    case '=':
      return { base: 'bridge', over: null };
    case 'g':
      return { base: groundFor(col, row), over: 'gem' };
    case 'G':
      return { base: groundFor(col, row), over: 'flag' };
    case 'D':
      return { base: groundFor(col, row), over: 'gate' };
    case 'j':
      return { base: groundFor(col, row), over: 'boots' };
    case 'o':
      return { base: groundFor(col, row), over: 'shield' };
    default:
      return { base: groundFor(col, row), over: null };
  }
}
