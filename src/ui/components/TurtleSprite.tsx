import type { ReactElement } from 'react';
import { SHELL_SLOTS, type StickerId } from '../gio/catalog';
import type { GioMood } from '../gio/mood';
import { STICKER_ART } from './gio/StickerArt';

const INK = '#0b3d2c';
const LINE = { fill: 'none', stroke: INK, strokeWidth: 1.8, strokeLinecap: 'round' as const };

/** Where stickers sit on the shell: the centre hexagon, then the six segments clockwise from the top right. */
const SLOTS: readonly { x: number; y: number; r: number }[] = [
  { x: 0, y: 0, r: 9.5 },
  { x: 17, y: -22, r: 7.2 },
  { x: 24, y: 0, r: 7.2 },
  { x: 17, y: 22, r: 7.2 },
  { x: -17, y: 22, r: 7.2 },
  { x: -24, y: 0, r: 7.2 },
  { x: -17, y: -22, r: 7.2 },
];

function sparkle(x: number, y: number, s: number): string {
  const a = 5 * s;
  const b = 1.5 * s;
  return `M ${x} ${y - a} L ${x + b} ${y - b} L ${x + a} ${y} L ${x + b} ${y + b} L ${x} ${y + a} L ${x - b} ${y + b} L ${x - a} ${y} L ${x - b} ${y - b} Z`;
}

const HAPPY_FACE = (
  <>
    <path d="M -8.5 -46 Q -5.5 -51 -2.5 -46 M 2.5 -46 Q 5.5 -51 8.5 -46" {...LINE} />
    <ellipse cx="-9.5" cy="-41" rx="2.8" ry="1.7" fill="#ff8fa3" />
    <ellipse cx="9.5" cy="-41" rx="2.8" ry="1.7" fill="#ff8fa3" />
    <path d="M -4.5 -41.5 Q 0 -34 4.5 -41.5 Z" fill={INK} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
  </>
);

function Face({ mood }: { mood: GioMood }): ReactElement {
  switch (mood) {
    case 'happy':
      return HAPPY_FACE;
    case 'cheer':
      return (
        <>
          {HAPPY_FACE}
          <path className="gio-spark" d={sparkle(-30, -52, 1.2)} fill="#ffc93c" stroke="#e8962a" strokeWidth="1" strokeLinejoin="round" />
          <path className="gio-spark gio-spark-2" d={sparkle(32, -50, 1.4)} fill="#ffc93c" stroke="#e8962a" strokeWidth="1" strokeLinejoin="round" />
          <path className="gio-spark gio-spark-3" d={sparkle(45, -30, 0.9)} fill="#ffc93c" stroke="#e8962a" strokeWidth="1" strokeLinejoin="round" />
        </>
      );
    case 'curious':
      return (
        <>
          <circle cx="-5.5" cy="-46.5" r="3" fill={INK} />
          <circle cx="5.5" cy="-46.5" r="3.4" fill={INK} />
          <path d="M -9 -51.5 L -3 -51.5" {...LINE} />
          <path d="M 2.5 -51.5 Q 6 -55 9.5 -52.5" {...LINE} />
          <ellipse cx="1.5" cy="-39.5" rx="1.9" ry="2.2" fill={INK} />
        </>
      );
    case 'thinking':
      return (
        <>
          <circle cx="-5.5" cy="-46.5" r="3.6" fill="#fff" stroke={INK} strokeWidth="1" />
          <circle cx="5.5" cy="-46.5" r="3.6" fill="#fff" stroke={INK} strokeWidth="1" />
          <circle cx="-5" cy="-48" r="1.8" fill={INK} />
          <circle cx="6" cy="-48" r="1.8" fill={INK} />
          <path d="M -2.5 -39.5 L 2.5 -39.5" {...LINE} />
          <circle className="gio-dot" cx="18" cy="-46" r="1.6" fill="#44554c" />
          <circle className="gio-dot gio-dot-2" cx="22.5" cy="-51" r="2.1" fill="#44554c" />
          <circle className="gio-dot gio-dot-3" cx="27.5" cy="-57" r="2.6" fill="#44554c" />
        </>
      );
    case 'calm':
      return (
        <>
          <circle cx="-5.5" cy="-46.5" r="2.6" fill={INK} />
          <circle cx="5.5" cy="-46.5" r="2.6" fill={INK} />
          <path d="M -3.5 -40 Q 0 -37.5 3.5 -40" {...LINE} />
        </>
      );
    default:
      return (
        <>
          <circle cx="-5.5" cy="-47" r="3" fill={INK} />
          <circle cx="5.5" cy="-47" r="3" fill={INK} />
          <path d="M -4 -40 Q 0 -37 4 -40" {...LINE} />
        </>
      );
  }
}

/**
 * Gio, drawn facing up (heading 0). Rotation is applied by the stage.
 * The face shows his mood and the shell shows the stickers he wears, so it reads without motion.
 */
export function TurtleSprite({ mood = 'idle', stickers }: { mood?: GioMood; stickers?: readonly (StickerId | null)[] }) {
  return (
    <svg viewBox="-60 -60 120 120" width="100%" height="100%" aria-hidden="true" className="turtle-body">
      <g className="gio-pose" data-mood={mood}>
        <g className="turtle-legs">
          <ellipse cx="-30" cy="-20" rx="13" ry="9" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(-30 -30 -20)" />
          <ellipse cx="30" cy="-20" rx="13" ry="9" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(30 30 -20)" />
          <ellipse cx="-27" cy="25" rx="12" ry="8" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(30 -27 25)" />
          <ellipse cx="27" cy="25" rx="12" ry="8" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(-30 27 25)" />
        </g>
        <path d="M -6 40 L 0 52 L 6 40 Z" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="0" cy="-44" r="14" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" />
        <Face mood={mood} />
        <ellipse cx="0" cy="0" rx="34" ry="40" fill="#ffd166" stroke="#0b7a4f" strokeWidth="3.5" />
        <path d="M 0 -15 L 13 -7.5 L 13 7.5 L 0 15 L -13 7.5 L -13 -7.5 Z" fill="#ffe8a3" stroke="#e8962a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 0 -15 L 0 -38 M 13 -7.5 L 31 -16 M 13 7.5 L 31 16 M 0 15 L 0 38 M -13 7.5 L -31 16 M -13 -7.5 L -31 -16" stroke="#e8962a" strokeWidth="3" strokeLinecap="round" />
        {stickers?.slice(0, SHELL_SLOTS).map((id, i) => {
          if (!id) return null;
          const slot = SLOTS[i]!;
          const Art = STICKER_ART[id];
          return (
            <g key={i} transform={`translate(${slot.x} ${slot.y}) scale(${(slot.r * 2) / 38})`}>
              <Art />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
