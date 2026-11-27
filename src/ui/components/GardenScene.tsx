import { CONCEPTS, type Concept, type Quest } from '../../logo/quests.js';
import { friendById, type FriendId } from '../gio/catalog';
import type { Badge } from '../progress';
import { FRIEND_ART } from './gio/FriendArt';
import { Flower, Tree } from './gio/GardenArt';
import { TurtleSprite } from './TurtleSprite';
import { useLang, useT } from '../lang';
import { pluralIn } from '../../i18n/index.js';

interface GardenSceneProps {
  /** The quests for the current mode, in order. Each completed one grows a flower. */
  quests: readonly Quest[];
  completed: readonly string[];
  badges: readonly Badge[];
  friends: readonly FriendId[];
  /** The child is a Logo Master: a golden shell shines on the grass. */
  golden?: boolean;
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


/** The garden, drawn from what the child has really done. It is never stored, so it cannot drift from their progress. */
export function GardenScene({ quests, completed, badges, friends, golden = false }: GardenSceneProps) {
  const t = useT();
  const { lang } = useLang();
  const done = quests.map((q, i) => ({ q, i })).filter(({ q }) => completed.includes(q.id));
  const trees = badges.filter((b) => b.earned);
  const empty = done.length === 0 && trees.length === 0 && friends.length === 0;

  // Up to 24 flowers sit in two staggered rows. A full garden (48 quests) uses three, so none overlap.
  const rows = quests.length > 24 ? 3 : 2;
  const cols = Math.max(1, Math.ceil(quests.length / rows));
  const flowerAt = (i: number) => ({
    x: 16 + (Math.floor(i / rows) + (i % rows) / rows) * ((368 - 16) / cols),
    y: (rows === 3 ? 186 : 194) + (i % rows) * (rows === 3 ? 14 : 16),
  });
  // Draw the front row last so nearer flowers sit on top of the ones behind.
  done.sort((a, b) => (a.i % rows) - (b.i % rows) || a.i - b.i);

  const names = friends.map((id) => friendById(id).name);
  const label = empty
    ? t('garden.scene.empty')
    : t('garden.scene.has', {
        flowers: pluralIn(lang, 'garden.flowers', done.length),
        trees: pluralIn(lang, 'garden.trees', trees.length),
        friends: pluralIn(lang, 'garden.friendsN', friends.length),
        names: names.length ? t('garden.scene.names', { names: names.join(', ') }) : '',
        golden: golden ? t('garden.scene.golden') : '',
      });

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

        {golden && (
          <g data-testid="garden-golden-shell" transform="translate(372 128)">
            <circle r="17" fill="#fff8dc" fillOpacity="0.55" />
            <ellipse rx="11" ry="13" fill="#f2b705" stroke="#a86f00" strokeWidth="1.8" />
            <path d="M 0 -5 L 4.5 -2.5 L 4.5 2.5 L 0 5 L -4.5 2.5 L -4.5 -2.5 Z" fill="#ffe27a" stroke="#a86f00" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M -7 -8 Q -9 -3 -8 2" fill="none" stroke="#fff8dc" strokeWidth="1.6" strokeLinecap="round" />
            <path className="gio-spark" d="M 13 -14 L 14.5 -11 L 17.5 -9.5 L 14.5 -8 L 13 -5 L 11.5 -8 L 8.5 -9.5 L 11.5 -11 Z" fill="#fff8dc" stroke="#a86f00" strokeWidth="0.8" strokeLinejoin="round" />
          </g>
        )}
      </svg>
      {empty && (
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 pointer-events-none">
          <div className="w-[88px] h-[88px]" aria-hidden="true">
            <TurtleSprite mood="happy" />
          </div>
          <p className="m-0 rounded-full bg-white/90 px-4 py-1.5 text-[15px] font-extrabold text-ink shadow-[var(--shadow-1)]">
            {t('garden.plant')}
          </p>
        </div>
      )}
    </div>
  );
}
