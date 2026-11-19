import type { ReactElement } from 'react';
import type { StageArt } from '../path/islands';

/* The scenes of the stages after the first eleven. Each one is drawn in the same 240 by 170 box as the
 * concept scenes, on the left and middle of the island (x 52 to 142, y 66 to 126), so the resident friend
 * keeps the right side. No emoji and no text a child must read: the card around the scene says the name. */

const INK = '#17261f';
const LINE = { stroke: INK, strokeOpacity: 0.35, strokeWidth: 1.2, strokeLinejoin: 'round' as const };
const UI = 'ui-rounded, system-ui, sans-serif';

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** A star outline with `points` tips. */
function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const [x, y] = polar(cx, cy, i % 2 === 0 ? outer : inner, -Math.PI / 2 + (i * Math.PI) / points);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** A gear outline with `teeth` teeth. */
function gearPath(cx: number, cy: number, r: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const parts: string[] = [];
  for (let t = 0; t < teeth; t++) {
    const a = t * step;
    const pts = [polar(cx, cy, r, a - step * 0.3), polar(cx, cy, r + 6, a - step * 0.17), polar(cx, cy, r + 6, a + step * 0.17), polar(cx, cy, r, a + step * 0.3)];
    for (const [x, y] of pts) parts.push(`${parts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** A small binary tree of branches, as one path. */
function branches(x: number, y: number, length: number, angle: number, depth: number): string {
  const x2 = x + length * Math.sin(angle);
  const y2 = y - length * Math.cos(angle);
  const here = `M ${x.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  if (depth === 0) return here;
  return here + branches(x2, y2, length * 0.72, angle - 0.5, depth - 1) + branches(x2, y2, length * 0.72, angle + 0.5, depth - 1);
}

const FRACTAL_TREE = branches(98, 126, 22, 0, 5);

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <path d={`M ${x} 126 V ${y}`} stroke="#2f8f4e" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => {
        const [px, py] = polar(x, y, 7, (i * Math.PI * 2) / 5);
        return <circle key={i} cx={px} cy={py} r="5" fill={color} {...LINE} />;
      })}
      <circle cx={x} cy={y} r="3.6" fill="#ffd84a" />
    </g>
  );
}

function Block({ x, y, w = 20, h = 14, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} rx="3" fill={fill} {...LINE} />;
}

export const STAGE_PROPS: Record<StageArt, (color: string) => ReactElement> = {
  /* Little Turtles */
  pen: (c) => (
    <g>
      <path d="M 56 122 H 72 M 82 122 H 98 M 108 122 H 124" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
      <g transform="rotate(32 100 96)">
        <rect x="93" y="64" width="14" height="38" rx="2" fill="#ffc93c" {...LINE} />
        <path d="M 93 102 L 100 116 L 107 102 Z" fill="#f6e3c0" {...LINE} />
        <path d="M 97.5 111 L 100 116 L 102.5 111 Z" fill={INK} />
        <rect x="93" y="58" width="14" height="8" rx="3" fill="#ec3f86" {...LINE} />
      </g>
    </g>
  ),
  flowers: (c) => (
    <g>
      <Flower x={66} y={104} color={c} />
      <Flower x={92} y={94} color="#ffc93c" />
      <Flower x={118} y={106} color="#ffffff" />
    </g>
  ),
  patterns: (c) => (
    <g>
      {[0, 15, 30, 45, 60, 75].map((a, i) => (
        <rect key={a} x="80" y="86" width="36" height="36" fill="none" stroke={i % 2 === 0 ? c : '#0f8fa6'} strokeWidth="3" strokeLinejoin="round" transform={`rotate(${a} 98 104)`} />
      ))}
    </g>
  ),
  pictures: (c) => (
    <g>
      <rect x="62" y="96" width="34" height="28" fill="#f6e3c0" {...LINE} />
      <path d="M 58 98 L 79 76 L 100 98 Z" fill={c} {...LINE} />
      <rect x="74" y="106" width="10" height="18" fill="#8a5a2b" />
      <rect x="66" y="102" width="7" height="7" fill="#9fdcf7" stroke={INK} strokeOpacity="0.4" />
      <rect x="104" y="102" width="26" height="22" fill="#f6e3c0" {...LINE} />
      <path d="M 101 104 L 117 88 L 133 104 Z" fill="#2b9bf4" {...LINE} />
    </g>
  ),
  stars: (c) => (
    <g>
      <path d={starPath(98, 98, 26, 11)} fill="#ffd84a" stroke={c} strokeWidth="3.5" strokeLinejoin="round" />
      <path d={starPath(64, 80, 9, 4)} fill="#ffffff" {...LINE} />
      <path d={starPath(130, 76, 8, 3.5)} fill="#ffffff" {...LINE} />
      <path d={starPath(124, 112, 7, 3)} fill={c} fillOpacity="0.85" {...LINE} />
    </g>
  ),
  fewest: (c) => (
    <g>
      <Block x={64} y={110} w={22} h={14} fill="#f97316" />
      <Block x={90} y={110} w={22} h={14} fill="#2b9bf4" />
      <Block x={77} y={96} w={22} h={14} fill="#12a36b" />
      <circle cx="122" cy="86" r="14" fill="#ffffff" stroke={c} strokeWidth="3.5" />
      <text x="122" y="92" textAnchor="middle" fontSize="18" fontWeight="900" fill={INK} fontFamily={UI}>
        3
      </text>
    </g>
  ),
  lighthouse: () => (
    <g>
      <path d="M 82 124 L 88 78 H 108 L 114 124 Z" fill="#ffffff" {...LINE} />
      <path d="M 85 108 H 111 L 113 118 H 83 Z M 87 90 H 109 L 107 98 H 89 Z" fill="#ec3f86" fillOpacity="0.9" />
      <rect x="86" y="68" width="24" height="10" rx="2" fill="#44554c" />
      <path d="M 88 68 H 108 L 98 56 Z" fill="#d4a017" {...LINE} />
      <path d="M 110 72 L 146 62 V 82 Z" fill="#ffd84a" fillOpacity="0.7" />
      <path d="M 86 72 L 56 64 V 80 Z" fill="#ffd84a" fillOpacity="0.55" />
    </g>
  ),

  /* Turtle Coders */
  'colour-cove': () => (
    <g>
      {['#ec3f86', '#ff8a2b', '#ffc93c', '#12a36b', '#2b9bf4', '#7a4cf0'].map((col, i) => (
        <path key={col} d={`M ${52 + i * 3} 124 A ${46 - i * 3} ${46 - i * 3} 0 0 1 ${144 - i * 3} 124`} fill="none" stroke={col} strokeWidth="3.4" />
      ))}
    </g>
  ),
  ingredients: (c) => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path d={`M ${60 + i * 28} 104 H ${84 + i * 28} L ${82 + i * 28} 124 H ${62 + i * 28} Z`} fill={['#f97316', c, '#12a36b'][i]} {...LINE} />
          <ellipse cx={72 + i * 28} cy="104" rx="12" ry="3.4" fill={INK} fillOpacity="0.55" />
          <path d={`M ${68 + i * 28} 98 q -4 -6 0 -11 M ${76 + i * 28} 98 q -4 -6 0 -11`} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
  grid: (c) => (
    <g>
      <rect x="56" y="82" width="82" height="42" rx="8" fill="#a9794a" fillOpacity="0.55" {...LINE} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((k) => (
          <circle key={`${r}${k}`} cx={70 + k * 20} cy={92 + r * 14} r="5.5" fill={(r + k) % 2 === 0 ? c : '#ffc93c'} {...LINE} />
        )),
      )}
    </g>
  ),
  surprise: (c) => (
    <g>
      <g transform="rotate(-14 90 104)">
        <rect x="68" y="82" width="44" height="44" rx="8" fill="#ffffff" stroke={c} strokeWidth="3.5" />
        {[[78, 92], [102, 92], [90, 104], [78, 116], [102, 116]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill={INK} />
        ))}
      </g>
      <g transform="translate(130 86) rotate(16)">
        <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#ffc93c" {...LINE} />
        <text y="8" textAnchor="middle" fontSize="22" fontWeight="900" fill={INK} fontFamily={UI}>
          ?
        </text>
      </g>
    </g>
  ),
  clockwork: (c) => (
    <g>
      <path d={gearPath(82, 106, 17, 9)} fill={c} fillOpacity="0.85" {...LINE} />
      <circle cx="82" cy="106" r="6" fill="#f6e3c0" {...LINE} />
      <path d={gearPath(116, 96, 12, 7)} fill="#ffc93c" {...LINE} />
      <circle cx="116" cy="96" r="4.5" fill="#f6e3c0" {...LINE} />
      <path d={gearPath(118, 120, 9, 6)} fill="#9fb0bf" {...LINE} />
    </g>
  ),
  fractals: (c) => (
    <g>
      <path d={FRACTAL_TREE} fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 98 126 V 108" stroke="#8a5a2b" strokeWidth="4.4" strokeLinecap="round" />
    </g>
  ),
  'bug-bay': (c) => (
    <g>
      <path d="M 58 122 Q 76 112 94 122 T 130 122" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 70 112 H 118 L 110 124 H 78 Z" fill="#8a5a2b" {...LINE} />
      <ellipse cx="94" cy="96" rx="14" ry="11" fill={c} {...LINE} />
      <circle cx="94" cy="83" r="6" fill="#44554c" {...LINE} />
      <path d="M 90 78 L 84 70 M 98 78 L 104 70 M 80 92 L 70 88 M 80 100 L 70 104 M 108 92 L 118 88 M 108 100 L 118 104" fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 94 88 V 106" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" />
    </g>
  ),
  tiny: (c) => (
    <g>
      <path d="M 60 124 H 126 V 118 H 60 Z" fill="#b9a98f" {...LINE} />
      <path d="M 56 84 L 93 66 L 130 84 Z" fill={c} {...LINE} />
      {[68, 82, 104, 118].map((x) => (
        <rect key={x} x={x - 3.5} y="86" width="7" height="32" fill="#f6e3c0" {...LINE} />
      ))}
      <rect x="86" y="96" width="14" height="22" rx="7" fill="#3b2a20" />
    </g>
  ),
  mirror: (c) => (
    <g>
      <path d="M 56 110 L 78 80 L 94 100 L 104 88 L 120 110 Z" fill="#9fb0bf" {...LINE} />
      <path d="M 76 84 L 78 80 L 82 85 L 80 83 Z" fill="#ffffff" />
      <path d="M 56 114 L 78 144 L 94 124 L 104 136 L 120 114 Z" fill="#9fb0bf" fillOpacity="0.4" {...LINE} />
      <path d="M 52 112 H 126" stroke={c} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="2 7" />
      <rect x="126" y="76" width="9" height="46" rx="3" fill="#e6f7fd" stroke={c} strokeWidth="2.6" />
    </g>
  ),
  physics: (c) => (
    <g>
      <path d="M 52 126 L 88 74 L 124 126 Z" fill="#b8c2cc" {...LINE} />
      <path d="M 79 88 L 88 74 L 97 88 L 92 84 L 88 89 L 84 84 Z" fill="#ffffff" />
      <path d="M 88 74 Q 112 40 138 100" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
      <circle cx="100" cy="56" r="7" fill={c} {...LINE} />
    </g>
  ),
  'game-studio': (c) => (
    <g>
      <rect x="58" y="72" width="76" height="46" rx="8" fill="#17261f" />
      <rect x="63" y="77" width="66" height="36" rx="4" fill="#cfeec9" />
      <circle cx="104" cy="92" r="5" fill={c} />
      <rect x="70" y="104" width="22" height="5" rx="2.5" fill={INK} />
      <path d="M 82 118 H 110 L 114 126 H 78 Z" fill="#44554c" {...LINE} />
      <path d="M 112 100 h 10 M 117 95 v 10" stroke="#17261f" strokeOpacity="0.7" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
  master: () => (
    <g>
      <rect x="54" y="106" width="28" height="18" fill="#f3d9a0" stroke="#d4a017" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="82" y="92" width="28" height="32" fill="#ffd84a" stroke="#d4a017" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="110" y="112" width="28" height="12" fill="#f3d9a0" stroke="#d4a017" strokeWidth="2.2" strokeLinejoin="round" />
      <path d={starPath(96, 74, 15, 6.5)} fill="#fff3b0" stroke="#d4a017" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 96 92 V 100" stroke="#d4a017" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
};
