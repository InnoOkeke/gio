import type { ReactElement } from 'react';

/* The garden's flower and tree, shared by Gio's garden and the adventure map so both worlds look alike. */

const PETALS = [0, 72, 144, 216, 288];

export function Flower({ x, y, color }: { x: number; y: number; color: string }): ReactElement {
  return (
    <g transform={`translate(${x} ${y}) scale(1.35) translate(${-x} ${-y})`}>
      <path d={`M ${x} ${y} L ${x} ${y + 15}`} stroke="#2f8f4e" strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M ${x} ${y + 10} q 5 -1 6 -5`} stroke="#2f8f4e" strokeWidth="2" strokeLinecap="round" fill="none" />
      {PETALS.map((a) => (
        <circle key={a} cx={x + 4.2 * Math.cos((a * Math.PI) / 180)} cy={y + 4.2 * Math.sin((a * Math.PI) / 180)} r="3.4" fill={color} stroke="#17261f" strokeOpacity="0.35" strokeWidth="0.8" />
      ))}
      <circle cx={x} cy={y} r="2.6" fill="#ffd84a" stroke="#17261f" strokeOpacity="0.4" strokeWidth="0.8" />
    </g>
  );
}

export function Tree({ x, color }: { x: number; color: string }): ReactElement {
  return (
    <g>
      <rect x={x - 2.5} y={102} width="5" height="16" rx="2" fill="#8a5a2b" />
      <circle cx={x} cy={96} r="14" fill={color} stroke="#17261f" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx={x - 4} cy={92} r="3" fill="#ffffff" fillOpacity="0.28" />
    </g>
  );
}
