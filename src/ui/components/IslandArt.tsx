import { useId, type ReactElement } from 'react';
import { CONCEPTS, type Concept } from '../../logo/quests.js';
import type { Island } from '../path/islands';
import { FRIEND_ART } from './gio/FriendArt';
import { Tree } from './gio/GardenArt';
import { STICKER_ART } from './gio/StickerArt';

/* One small scene for each island, drawn in a 240 by 170 box in the garden's sky and hills palette.
 * The scene is the island's own picture; the card around it says the name and the state in words. */

const INK = '#17261f';
const LINE = { stroke: INK, strokeOpacity: 0.35, strokeWidth: 1.2, strokeLinejoin: 'round' as const };

/** The props on the island, drawn on the left and middle of the hill so the resident has room on the right. */
const PROPS: Record<Concept, (color: string) => ReactElement> = {
  moves: (c) => (
    <g>
      <rect x="66" y="100" width="22" height="20" rx="3" fill={c} fillOpacity="0.28" stroke={c} strokeWidth="3" />
      <path d="M 96 120 L 109 96 L 122 120 Z" fill={c} fillOpacity="0.28" stroke={c} strokeWidth="3" strokeLinejoin="round" />
      <rect x="86" y="72" width="5" height="30" rx="2" fill="#8a5a2b" />
      <path d="M 91 74 H 116 L 123 80 L 116 86 H 91 Z" fill={c} {...LINE} />
    </g>
  ),
  loops: (c) => (
    <g>
      <ellipse cx="98" cy="106" rx="38" ry="13" fill="#5bb7e8" stroke="#2d86b8" strokeWidth="2" />
      <ellipse cx="98" cy="106" rx="22" ry="7" fill="none" stroke="#e6f7fd" strokeWidth="2" className="isle-ripple" />
      <path d="M 64 100 A 38 20 0 1 1 132 100" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
      <path d="M 124 78 L 134 99 L 114 96 Z" fill={c} stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  ),
  colours: () => (
    <g>
      <path d="M 66 106 C 62 86 92 76 116 82 C 142 90 140 116 112 118 C 100 118 100 108 90 110 C 80 112 70 116 66 106 Z" fill="#f6e3c0" {...LINE} />
      <circle cx="82" cy="94" r="6.5" fill="#ec3f86" {...LINE} />
      <circle cx="98" cy="88" r="6.5" fill="#ffc93c" {...LINE} />
      <circle cx="114" cy="92" r="6.5" fill="#2b9bf4" {...LINE} />
      <circle cx="123" cy="106" r="6.5" fill="#12a36b" {...LINE} />
    </g>
  ),
  debugging: (c) => (
    <g>
      <path d="M 62 124 Q 66 92 100 90 Q 134 92 140 124 Z" fill="#a9794a" {...LINE} />
      <ellipse cx="100" cy="116" rx="15" ry="10" fill="#3b2a20" />
      <circle cx="132" cy="86" r="11" fill="#ffffff" fillOpacity="0.55" stroke={c} strokeWidth="4" />
      <path d="M 140 94 L 150 104" stroke={c} strokeWidth="5" strokeLinecap="round" />
      <path d="M 72 108 l 6 -4 M 128 110 l 6 -3" stroke={INK} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  functions: (c) => (
    <g>
      <path d="M 66 124 L 72 76 H 132 L 138 124 Z" fill="#b9a98f" {...LINE} />
      <rect x="92" y="76" width="22" height="48" fill="#7cc8f0" />
      <path d="M 98 78 V 122 M 104 78 V 122 M 110 78 V 122" stroke="#e6f7fd" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 8" className="isle-fall" />
      <ellipse cx="103" cy="124" rx="26" ry="6" fill="#5bb7e8" stroke="#2d86b8" strokeWidth="1.5" />
      <path d="M 72 76 V 62 L 86 68 L 72 74" fill={c} stroke={c} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
  variables: (c) => (
    <g>
      <path d="M 56 124 Q 80 96 104 124 Z" fill="#62c47f" {...LINE} />
      <rect x="86" y="88" width="36" height="32" rx="5" fill="#f0b46a" {...LINE} />
      <rect x="86" y="88" width="36" height="9" rx="4" fill={c} fillOpacity="0.9" />
      <text x="104" y="115" textAnchor="middle" fontSize="19" fontWeight="900" fill={INK} fontFamily="ui-rounded, system-ui, sans-serif">
        n
      </text>
    </g>
  ),
  decisions: (c) => (
    <g>
      <path d="M 54 124 Q 82 100 112 124 Z" fill="#f3d9a0" {...LINE} />
      <rect x="98" y="76" width="5" height="46" rx="2" fill="#8a5a2b" />
      <path d="M 103 78 H 126 L 134 84 L 126 90 H 103 Z" fill={c} {...LINE} />
      <path d="M 98 96 H 76 L 68 102 L 76 108 H 98 Z" fill="#ffffff" {...LINE} />
      <path d="M 78 102 H 90" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  events: (c) => (
    <g>
      <path d="M 66 122 L 78 90 L 90 122 Z M 74 108 L 86 78 L 98 108 Z" fill="#2f8f4e" {...LINE} />
      <rect x="96" y="92" width="32" height="30" rx="8" fill="#ffffff" stroke={c} strokeWidth="3.5" />
      <path d="M 112 114 V 99 M 106 105 L 112 99 L 118 105" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  ),
  recursion: (c) => (
    <g>
      <path d="M 54 124 L 92 70 L 130 124 Z" fill="#b8c2cc" {...LINE} />
      <path d="M 82 86 L 92 70 L 102 86 L 97 82 L 92 87 L 87 82 Z" fill="#ffffff" />
      <path d="M 92 124 L 112 94 L 132 124 Z" fill="#9fb0bf" {...LINE} />
      <path d="M 106 103 L 112 94 L 118 103 Z" fill="#ffffff" />
      <path d="M 112 124 L 124 106 L 136 124 Z" fill={c} fillOpacity="0.85" {...LINE} />
    </g>
  ),
};

interface IslandArtProps {
  island: Island;
  /** Locked islands sit in the mist. */
  locked: boolean;
  /** The island has been sailed: it gets its tree, flag and sticker. */
  sailed: boolean;
  /** The resident friend has been met. Otherwise the friend is a soft sleeping shape. */
  met: boolean;
  className?: string;
}

export function IslandArt({ island, locked, sailed, met, className }: IslandArtProps) {
  const uid = useId().replace(/:/g, '');
  const color = CONCEPTS[island.concept].color;
  const Resident = FRIEND_ART[island.resident];
  const Sticker = STICKER_ART[island.concept];

  return (
    <svg viewBox="0 0 240 170" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fdcf7" />
          <stop offset="1" stopColor="#e6f7fd" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="240" height="170" rx="26" />
        </clipPath>
        <filter id={`${uid}-sleep`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.15  0 0 0 0 0.12  0 0 0 0.3 0" />
        </filter>
        <filter id={`${uid}-mist`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0.2" />
        </filter>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="240" height="170" fill={`url(#${uid}-sky)`} />
        <circle cx="206" cy="34" r="15" fill="#ffd84a" />
        <circle cx="206" cy="34" r="21" fill="#ffd84a" fillOpacity="0.28" />
        <path d="M 22 38 q 8 -13 21 -7 q 8 -11 21 -2 q 13 0 11 11 H 18 q -5 -1 4 -2 Z" fill="#ffffff" fillOpacity="0.9" />

        <g filter={locked ? `url(#${uid}-mist)` : undefined} opacity={locked ? 0.7 : 1}>
          {/* The sea and the island's shore */}
          <path d="M 0 118 Q 60 108 120 118 T 240 116 V 170 H 0 Z" fill="#5bb7e8" />
          <path d="M 0 136 Q 60 128 120 138 T 240 134 V 170 H 0 Z" fill="#46a5da" />
          <path d="M 14 128 q 10 -4 20 0 M 196 142 q 10 -4 20 0 M 170 154 q 10 -4 20 0" className="isle-wave" fill="none" stroke="#e6f7fd" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="120" cy="132" rx="98" ry="24" fill="#f3d9a0" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" />
          <path d="M 40 130 Q 62 76 120 76 T 200 130 Z" fill="#8fd9a4" stroke={INK} strokeOpacity="0.22" strokeWidth="1.5" />
          <path d="M 56 130 Q 76 94 120 94 T 184 130 Z" fill="#62c47f" fillOpacity="0.55" />

          {sailed && <Tree x={156} color={color} />}
          {PROPS[island.concept](color)}

          {/* The resident friend: full colour once met, otherwise a soft sleeping shape */}
          <svg x="150" y="68" width="58" height="58" viewBox="0 0 100 100" overflow="visible" className="friend-art">
            {met ? (
              <Resident />
            ) : (
              <g filter={`url(#${uid}-sleep)`}>
                <Resident />
              </g>
            )}
          </svg>
          {!met && (
            <g fill={INK} fillOpacity="0.5" fontWeight="900" fontFamily="ui-rounded, system-ui, sans-serif">
              <text x="200" y="76" fontSize="14" className="isle-zzz">
                z
              </text>
              <text x="209" y="64" fontSize="11" className="isle-zzz isle-zzz-2">
                z
              </text>
            </g>
          )}

          {sailed && (
            <g>
              <rect x="38" y="76" width="4" height="40" rx="2" fill="#8a5a2b" />
              <path d="M 42 78 H 66 L 59 86 L 66 94 H 42 Z" fill={color} {...LINE} className="isle-flag" />
            </g>
          )}
        </g>

        {sailed && (
          <g transform="translate(34 138)">
            <circle r="21" fill="#ffffff" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" />
            <g transform="scale(1)">
              <Sticker />
            </g>
          </g>
        )}

        {locked && (
          <g>
            <ellipse cx="60" cy="96" rx="64" ry="20" fill="#ffffff" fillOpacity="0.82" />
            <ellipse cx="170" cy="112" rx="70" ry="22" fill="#ffffff" fillOpacity="0.86" />
            <ellipse cx="120" cy="84" rx="56" ry="16" fill="#ffffff" fillOpacity="0.8" />
            <g transform="translate(120 98)">
              <circle r="24" fill="#ffffff" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" />
              <rect x="-10" y="-3" width="20" height="15" rx="3.5" fill="#44554c" />
              <path d="M -6 -3 V -8 a6 6 0 0 1 12 0 V -3" fill="none" stroke="#44554c" strokeWidth="3.2" strokeLinecap="round" />
              <circle cy="4.5" r="2" fill="#ffffff" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
