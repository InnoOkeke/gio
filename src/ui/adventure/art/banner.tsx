import type { ReactElement } from 'react';
import type { RealmId } from '../../../logo/adventure/level.js';
import { REALM_PALETTES } from './tiles';

const INK = '#17261f';
const EDGE = { stroke: INK, strokeOpacity: 0.35, strokeWidth: 1.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** The one small landmark of each world, drawn on top of its hills in a 120 by 60 picture. */
function Landmark({ realm }: { realm: RealmId }): ReactElement {
  const p = REALM_PALETTES[realm];
  switch (realm) {
    case 'maze':
      return (
        <g>
          <rect x="70" y="26" width="14" height="18" rx="4" fill={p.tuft} {...EDGE} />
          <rect x="86" y="30" width="14" height="14" rx="4" fill={p.tuft} {...EDGE} />
          <rect x="54" y="32" width="14" height="12" rx="4" fill={p.tuft} {...EDGE} />
        </g>
      );
    case 'woods':
      return (
        <g>
          {[62, 80, 98].map((x, i) => (
            <g key={x}>
              <rect x={x - 2} y={36 - i} width="4" height={10 + i} rx="2" fill={p.wood} {...EDGE} />
              <circle cx={x} cy={30 - i * 2} r={10 - i} fill={p.tuft} {...EDGE} />
            </g>
          ))}
        </g>
      );
    case 'river':
      return (
        <g>
          <path d="M 0 40 C 30 30, 50 52, 80 40 S 110 34, 120 40 L 120 60 L 0 60 Z" fill={p.water} {...EDGE} />
          <path d="M 20 48 q 6 -4 12 0 M 62 46 q 6 -4 12 0 M 92 50 q 6 -4 12 0" fill="none" stroke={p.waveLine} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'swamp':
      return (
        <g>
          <ellipse cx="78" cy="44" rx="30" ry="8" fill={p.water} {...EDGE} />
          {[66, 78, 90].map((x) => (
            <path key={x} d={`M ${x} 44 L ${x} 26`} stroke={p.tuft} strokeWidth="3" strokeLinecap="round" />
          ))}
          <circle cx="96" cy="22" r="3" fill="#fff" fillOpacity="0.7" />
          <circle cx="60" cy="18" r="2" fill="#fff" fillOpacity="0.7" />
        </g>
      );
    case 'cave':
      return (
        <g>
          <path d="M 64 46 L 72 16 L 80 46 Z" fill="#c6b8ff" {...EDGE} />
          <path d="M 80 46 L 90 24 L 98 46 Z" fill="#ffb3d1" {...EDGE} />
          <path d="M 54 46 L 60 30 L 66 46 Z" fill="#9fd6ff" {...EDGE} />
        </g>
      );
    case 'hills':
      return (
        <g>
          <circle cx="92" cy="20" r="11" fill="#f97316" {...EDGE} />
          <path d="M 56 46 Q 76 22 96 46 Z" fill={p.groundB} {...EDGE} />
        </g>
      );
    case 'castle':
      return (
        <g>
          <rect x="68" y="24" width="30" height="22" rx="3" fill={p.rockHigh} {...EDGE} />
          <rect x="64" y="16" width="10" height="30" rx="2" fill={p.rock} {...EDGE} />
          <rect x="92" y="16" width="10" height="30" rx="2" fill={p.rock} {...EDGE} />
          <path d="M 83 24 L 83 10 L 94 14 L 83 18" fill="#ef5a4c" {...EDGE} />
          <path d="M 80 46 L 80 36 Q 83 31 86 36 L 86 46 Z" fill={p.wood} {...EDGE} />
        </g>
      );
  }
}

/** A small picture of a world for the map: sky, two hills in the world's colours and one landmark. Decorative. */
export function RealmBanner({ realm }: { realm: RealmId }): ReactElement {
  const p = REALM_PALETTES[realm];
  return (
    <svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice" className="adv-banner" aria-hidden="true" focusable="false">
      <rect width="120" height="60" fill="#e9f6fb" />
      <circle cx="18" cy="16" r="8" fill="#ffe08a" />
      <path d="M 0 44 Q 30 22 62 40 T 120 36 L 120 60 L 0 60 Z" fill={p.groundB} {...EDGE} />
      <path d="M 0 52 Q 36 36 72 50 T 120 48 L 120 60 L 0 60 Z" fill={p.groundA} {...EDGE} />
      <Landmark realm={realm} />
    </svg>
  );
}
