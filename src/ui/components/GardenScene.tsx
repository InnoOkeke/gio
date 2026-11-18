import type { ReactElement } from 'react';
import { CONCEPTS, type Concept, type Quest } from '../../logo/quests.js';
import { friendById, type FriendId } from '../gio/catalog';
import type { Badge } from '../progress';
import { FRIEND_ART } from './gio/FriendArt';
import { TurtleSprite } from './TurtleSprite';

interface GardenSceneProps {
  /** The quests for the current mode, in order. Each completed one grows a flower. */
  quests: readonly Quest[];
  completed: readonly string[];
  badges: readonly Badge[];
  friends: readonly FriendId[];
}

const CONCEPT_ORDER = Object.keys(CONCEPTS) as Concept[];

/** Where each friend lives: x, y and size in the 400 by 240 scene. Olly and Puff swim in the pond. */
const SPOTS: Record<FriendId, { x: number; y: number; s: number }> = {
  olly: { x: 238, y: 128, s: 52 },
  puff: { x: 300, y: 134, s: 46 },
  dot: { x: 10, y: 120, s: 38 },
  chip: { x: 50, y: 120, s: 38 },
  nutmeg: { x: 94, y: 120, s: 38 },
  hoot: { x: 138, y: 120, s: 38 },
  bree: { x: 182, y: 120, s: 38 },
  spindle: { x: 28, y: 152, s: 38 },
  hop: { x: 72, y: 152, s: 38 },
};

const PETALS = [0, 72, 144, 216, 288];

function Flower({ x, y, color }: { x: number; y: number; color: string }): ReactElement {
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

function Tree({ x, color }: { x: number; color: string }): ReactElement {
  return (
    <g>
      <rect x={x - 2.5} y={102} width="5" height="16" rx="2" fill="#8a5a2b" />
      <circle cx={x} cy={96} r="14" fill={color} stroke="#17261f" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx={x - 4} cy={92} r="3" fill="#ffffff" fillOpacity="0.28" />
    </g>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The garden, drawn from what the child has really done. It is never stored, so it cannot drift from their progress. */
export function GardenScene({ quests, completed, badges, friends }: GardenSceneProps) {
  const done = quests.map((q, i) => ({ q, i })).filter(({ q }) => completed.includes(q.id));
  const trees = badges.filter((b) => b.earned);
  const empty = done.length === 0 && trees.length === 0 && friends.length === 0;

  const cols = Math.max(1, Math.ceil(quests.length / 2));
  const flowerAt = (i: number) => ({
    x: 16 + (Math.floor(i / 2) + (i % 2 ? 0.5 : 0)) * ((368 - 16) / cols),
    y: 194 + (i % 2) * 16,
  });

  const names = friends.map((id) => friendById(id).name);
  const label = empty
    ? 'Your garden is empty for now. Gio is waiting for you to learn something new.'
    : `Your garden has ${plural(done.length, 'flower', 'flowers')}, ${plural(trees.length, 'tree', 'trees')} and ${plural(friends.length, 'friend', 'friends')}${names.length ? `: ${names.join(', ')}` : ''}.`;

  return (
    <div className="relative">
      <svg viewBox="0 0 400 240" className="block w-full h-auto rounded-[22px] bg-[#cfeefc]" role="img" aria-label={label}>
        <defs>
          <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fdcf7" />
            <stop offset="1" stopColor="#e6f7fd" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#garden-sky)" />
        <circle cx="344" cy="40" r="20" fill="#ffd84a" />
        <circle cx="344" cy="40" r="26" fill="#ffd84a" fillOpacity="0.28" />
        <path d="M 40 52 q 8 -14 22 -8 q 8 -12 22 -2 q 14 0 12 12 H 36 q -6 -1 4 -2 Z" fill="#ffffff" fillOpacity="0.9" />
        <path d="M 170 30 q 6 -10 17 -6 q 7 -8 17 0 q 11 1 9 10 H 166 q -5 -1 4 -4 Z" fill="#ffffff" fillOpacity="0.85" />
        <path d="M 0 112 Q 100 92 200 108 T 400 104 V 240 H 0 Z" fill="#8fd9a4" />
        <path d="M 0 150 Q 120 128 230 146 T 400 140 V 240 H 0 Z" fill="#62c47f" />
        <path d="M 0 188 Q 150 172 400 184 V 240 H 0 Z" fill="#3fae68" />

        <ellipse cx="300" cy="170" rx="68" ry="20" fill="#5bb7e8" stroke="#2d86b8" strokeWidth="2" />
        <path d="M 262 172 q 8 -4 16 0 M 310 178 q 8 -4 16 0 M 286 164 q 6 -3 12 0" fill="none" stroke="#e6f7fd" strokeWidth="2" strokeLinecap="round" />

        {trees.map((b) => (
          <Tree key={b.concept} x={24 + CONCEPT_ORDER.indexOf(b.concept) * 44} color={CONCEPTS[b.concept].color} />
        ))}

        {friends.map((id) => {
          const spot = SPOTS[id];
          const Art = FRIEND_ART[id];
          return (
            <svg key={id} x={spot.x} y={spot.y} width={spot.s} height={spot.s} viewBox="0 0 100 100" className="friend-art" overflow="visible">
              <Art />
            </svg>
          );
        })}

        {done.map(({ q, i }) => {
          const p = flowerAt(i);
          return <Flower key={q.id} x={p.x} y={p.y} color={CONCEPTS[q.concept].color} />;
        })}
      </svg>
      {empty && (
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 pointer-events-none">
          <div className="w-[88px] h-[88px]" aria-hidden="true">
            <TurtleSprite mood="happy" />
          </div>
          <p className="m-0 rounded-full bg-white/90 px-4 py-1.5 text-[15px] font-extrabold text-ink shadow-[var(--shadow-1)]">
            Learn something new and I will plant it here!
          </p>
        </div>
      )}
    </div>
  );
}
