import { CONCEPTS, QUESTS, type Concept, type Quest, type QuestAudience } from '../../logo/quests.js';
import type { FriendId } from '../gio/catalog';

/** The scenes of the stages added after the first eleven. The first eleven keep one scene for each concept. */
export type StageArt =
  | 'pen'
  | 'flowers'
  | 'patterns'
  | 'pictures'
  | 'stars'
  | 'fewest'
  | 'lighthouse'
  | 'colour-cove'
  | 'ingredients'
  | 'grid'
  | 'surprise'
  | 'clockwork'
  | 'fractals'
  | 'bug-bay'
  | 'tiny'
  | 'mirror'
  | 'physics'
  | 'game-studio'
  | 'master';

/** Which scene the island card draws: a concept scene for the first stages, or the stage's own scene. */
export type ArtId = Concept | StageArt;

/**
 * One island is one stage of one mode (children see "Stage 7"). The key of the first stages is
 * `audience:concept`, for example `coder:loops`, and never changes because saved progress uses it.
 */
export interface Island {
  key: string;
  audience: QuestAudience;
  concept: Concept;
  /** The scene drawn on the island card. */
  art: ArtId;
  /** The sticker earned by sailing here for the first time, or null when this stage earns a stage stamp instead. */
  badge: Concept | null;
  /** The colour of the stage stamp. */
  stamp: string;
  name: string;
  /** One kid-friendly line about what lives and grows here. */
  tagline: string;
  /** The friend who lives on the island. */
  resident: FriendId;
  /** Two units of three quest ids each. A unit goes teach, twist, own. */
  units: readonly (readonly [string, string, string])[];
}

export function islandKey(audience: QuestAudience, concept: Concept): string {
  return `${audience}:${concept}`;
}

interface IslandOptions {
  /** A new stage gives its own key; the first stages keep `audience:concept`. */
  key?: string;
  art?: ArtId;
  /** `null` for a stage that earns a stamp but no sticker. The first stages default to their concept's badge. */
  badge?: Concept | null;
  stamp?: string;
}

function island(
  audience: QuestAudience,
  concept: Concept,
  name: string,
  tagline: string,
  resident: FriendId,
  units: readonly (readonly [string, string, string])[],
  options: IslandOptions = {},
): Island {
  return {
    key: options.key ?? islandKey(audience, concept),
    audience,
    concept,
    art: options.art ?? concept,
    badge: options.badge === undefined ? concept : options.badge,
    stamp: options.stamp ?? CONCEPTS[concept].color,
    name,
    tagline,
    resident,
    units,
  };
}

const LITTLE: readonly Island[] = [
  island('little', 'moves', 'Shape Shore', 'Walk, turn and draw your first shapes.', 'puff', [
    ['l-walk', 'l-corner', 'l-zigzag'],
    ['l-square', 'l-rectangle', 'l-circle'],
  ]),
  island('little', 'loops', 'Loop Lagoon', 'Do it again and again with one Repeat block.', 'olly', [
    ['l-repeat-square', 'l-triangle', 'l-hexagon'],
    ['l-stairs', 'l-flower-ring', 'l-octagon'],
  ]),
  island('little', 'colours', 'Colour Cove', 'Paint your drawings in lots of colours.', 'chip', [
    ['l-colours', 'l-rainbow-triangle', 'l-rainbow-box'],
    ['l-colour-rings', 'l-sunshine', 'l-snowman'],
  ]),
  island(
    'little',
    'moves',
    'Pen Playground',
    'Lift the pen, hop, and draw in pieces.',
    'dot',
    [
      ['l-pen-gap', 'l-pen-dashes', 'l-pen-jump'],
      ['l-pen-dotted-ring', 'l-pen-train', 'l-pen-ladder'],
    ],
    { key: 'little:pen', art: 'pen', badge: null, stamp: '#0f8fa6' },
  ),
  island(
    'little',
    'loops',
    'Flower Fields',
    'Grow flowers from circles, one petal at a time.',
    'puff',
    [
      ['l-flower-three', 'l-flower-eight', 'l-daisy'],
      ['l-bubbles', 'l-sunflower', 'l-garden'],
    ],
    { key: 'little:flowers', art: 'flowers', badge: null, stamp: '#ec3f86' },
  ),
  island(
    'little',
    'loops',
    'Pattern Park',
    'Spin shapes round and round to make patterns.',
    'olly',
    [
      ['l-spin-triangles', 'l-spin-boxes', 'l-petal-square'],
      ['l-fan', 'l-weave', 'l-wheel'],
    ],
    { key: 'little:patterns', art: 'patterns', badge: null, stamp: '#7a4cf0' },
  ),
  island(
    'little',
    'colours',
    'Picture Town',
    'Paint a whole picture from shapes.',
    'chip',
    [
      ['l-house-pic', 'l-tree-pic', 'l-boat-pic'],
      ['l-rocket-pic', 'l-snow-pic', 'l-town-pic'],
    ],
    { key: 'little:pictures', art: 'pictures', badge: null, stamp: '#f97316' },
  ),
  island(
    'little',
    'loops',
    'Star Sky',
    'Turn a lot to draw stars with many points.',
    'olly',
    [
      ['l-star-eight', 'l-star-twelve', 'l-hexagram'],
      ['l-star-burst', 'l-star-nest', 'l-star-night'],
    ],
    { key: 'little:stars', art: 'stars', badge: null, stamp: '#2b9bf4' },
  ),
  island(
    'little',
    'loops',
    'Block Saver',
    'Draw the same picture with fewer blocks.',
    'dot',
    [
      ['l-save-square', 'l-save-star', 'l-save-flower'],
      ['l-save-ring', 'l-save-fan', 'l-save-spin'],
    ],
    { key: 'little:fewest', art: 'fewest', badge: null, stamp: '#12a36b' },
  ),
  island(
    'little',
    'colours',
    'Logo Master Lighthouse',
    'The big finale: castles, fish, rainbows and a lighthouse.',
    'puff',
    [
      ['l-lh-castle', 'l-lh-lighthouse', 'l-lh-fish'],
      ['l-lh-rainbow', 'l-lh-windmill', 'l-lh-mosaic'],
    ],
    { key: 'little:lighthouse', art: 'lighthouse', badge: null, stamp: '#d4a017' },
  ),
];

const CODER: readonly Island[] = [
  island('coder', 'moves', 'Shape Shore', 'Lines, corners and your first shapes.', 'puff', [
    ['c-line', 'c-ell', 'c-square'],
    ['c-rectangle', 'c-triangle', 'c-circle'],
  ]),
  island('coder', 'loops', 'Loop Lagoon', 'Let REPEAT do the hard work.', 'olly', [
    ['c-repeat', 'c-loop-triangle', 'c-loop-hexagon'],
    ['c-star', 'c-loop-spin', 'c-loop-sun'],
  ]),
  island(
    'coder',
    'colours',
    'Colour Cove',
    'Pen colours, thick lines and a night sky to paint.',
    'chip',
    [
      ['c-red-blue', 'c-four-colours', 'c-fat-lines'],
      ['c-night-sky', 'c-rainbow-fan', 'c-colour-wheel'],
    ],
    { key: 'coder:colour-cove', art: 'colour-cove', badge: null, stamp: '#ec3f86' },
  ),
  island('coder', 'debugging', 'Bug Burrow', 'Something is broken. Find the bug and fix it.', 'dot', [
    ['c-bug-square', 'c-bug-triangle', 'c-bug-star'],
    ['c-bug-hexagon', 'c-bug-typo', 'c-bug-missing-end'],
  ]),
  island('coder', 'functions', 'Function Falls', 'Teach the turtle brand new commands.', 'bree', [
    ['c-box-command', 'c-triangle-command', 'c-function'],
    ['c-house', 'c-three-squares', 'c-square-ring'],
  ]),
  island(
    'coder',
    'functions',
    'Ingredient Island',
    'Commands with inputs, mixed into bigger recipes.',
    'bree',
    [
      ['c-ing-square', 'c-ing-poly', 'c-ing-petals'],
      ['c-ing-house', 'c-ing-grid', 'c-ing-stars'],
    ],
    { key: 'coder:ingredients', art: 'ingredients', badge: null, stamp: '#2b9bf4' },
  ),
  island('coder', 'variables', 'Variable Valley', 'Store numbers and change them as you go.', 'nutmeg', [
    ['c-make-size', 'c-make-double', 'c-shape'],
    ['c-make-growing', 'c-make-steps', 'c-two-inputs'],
  ]),
  island(
    'coder',
    'moves',
    'Grid Garden',
    'Dots and lines at exact spots, from SETXY and DOT.',
    'puff',
    [
      ['c-grid-corners', 'c-grid-ruler', 'c-grid-diagonal'],
      ['c-grid-lattice', 'c-grid-axes', 'c-grid-parabola'],
    ],
    { key: 'coder:grid', art: 'grid', badge: null, stamp: '#12a36b' },
  ),
  island('coder', 'decisions', 'Decision Dunes', 'Let your code choose what to do.', 'hoot', [
    ['c-half-and-half', 'c-gap-square', 'c-bend'],
    ['c-dashes', 'c-turn-choice', 'c-half-hexagon'],
  ]),
  island(
    'coder',
    'decisions',
    'Surprise Springs',
    'RANDOM makes every run a surprise.',
    'hoot',
    [
      ['c-rand-step', 'c-rand-wobble', 'c-rand-coin'],
      ['c-rand-dice', 'c-rand-confetti', 'c-rand-maze'],
    ],
    { key: 'coder:surprise', art: 'surprise', badge: null, stamp: '#0f8fa6' },
  ),
  island('coder', 'events', 'Event Forest', 'Make things happen when a key is pressed.', 'hop', [
    ['c-one-key', 'c-game', 'c-space-square'],
    ['c-stamp', 'c-ticker', 'c-sketch'],
  ]),
  island(
    'coder',
    'events',
    'Clockwork Canyon',
    'A game clock ticks, and your code keeps score.',
    'hop',
    [
      ['c-clock-walk', 'c-clock-spiral', 'c-clock-count'],
      ['c-clock-timer', 'c-clock-score', 'c-clock-race'],
    ],
    { key: 'coder:clockwork', art: 'clockwork', badge: null, stamp: '#14b8a6' },
  ),
  island('coder', 'recursion', 'Recursion Ridge', 'Commands that call themselves, again and again.', 'spindle', [
    ['c-rec-stairs', 'c-rec-rays', 'c-spiral'],
    ['c-rec-triangle-spiral', 'c-rec-nested', 'c-rec-pentagon-spiral'],
  ]),
  island(
    'coder',
    'recursion',
    'Fractal Falls',
    'Trees, snowflakes and ferns grown from one small recipe.',
    'spindle',
    [
      ['c-frac-tree', 'c-frac-koch', 'c-frac-sierpinski'],
      ['c-frac-snowflake', 'c-frac-general', 'c-frac-fern'],
    ],
    { key: 'coder:fractals', art: 'fractals', badge: null, stamp: '#b4236b' },
  ),
  island(
    'coder',
    'debugging',
    'Bug Bay',
    'Bigger programs with more than one bug. Fix them, do not rewrite them.',
    'dot',
    [
      ['c-bb-two-bugs', 'c-bb-name', 'c-bb-runaway'],
      ['c-bb-off-by-one', 'c-bb-inputs', 'c-bb-game'],
    ],
    { key: 'coder:bug-bay', art: 'bug-bay', badge: null, stamp: '#ef5a4c' },
  ),
  island(
    'coder',
    'loops',
    'Tiny Code Temple',
    'The same picture in fewer and fewer commands.',
    'olly',
    [
      ['c-tiny-square', 'c-tiny-ring', 'c-tiny-burst'],
      ['c-tiny-spiral', 'c-tiny-flower', 'c-tiny-snowflake'],
    ],
    { key: 'coder:tiny', art: 'tiny', badge: null, stamp: '#7a4cf0' },
  ),
  island(
    'coder',
    'functions',
    'Mirror Mountains',
    'Draw one piece, then mirror it, spin it and tile it.',
    'bree',
    [
      ['c-mir-butterfly', 'c-mir-snowflake6', 'c-mir-row'],
      ['c-mir-crosshatch', 'c-mir-honeycomb', 'c-mir-mandala'],
    ],
    { key: 'coder:mirror', art: 'mirror', badge: null, stamp: '#2b9bf4' },
  ),
  island(
    'coder',
    'variables',
    'Physics Peak',
    'Gravity, floors and bouncing balls, one tick at a time.',
    'nutmeg',
    [
      ['c-phys-fall', 'c-phys-floor', 'c-phys-bounce'],
      ['c-phys-damped', 'c-phys-throw', 'c-phys-box'],
    ],
    { key: 'coder:physics', art: 'physics', badge: null, stamp: '#f97316' },
  ),
  island(
    'coder',
    'events',
    'Game Studio',
    'Levels, lives, scores and monsters. Build whole games.',
    'hop',
    [
      ['c-gs-gem', 'c-gs-walls', 'c-gs-lives'],
      ['c-gs-levels', 'c-gs-chase', 'c-gs-three'],
    ],
    { key: 'coder:game-studio', art: 'game-studio', badge: null, stamp: '#14b8a6' },
  ),
  island(
    'coder',
    'recursion',
    'Logo Master',
    'Everything you know, in one last set of puzzles.',
    'spindle',
    [
      ['c-lm-polyspi', 'c-lm-garden', 'c-lm-engine'],
      ['c-lm-tiny-flake', 'c-lm-bounce-count', 'c-lm-final-game'],
    ],
    { key: 'coder:master', art: 'master', badge: null, stamp: '#d4a017' },
  ),
];

export const ISLANDS: Record<QuestAudience, readonly Island[]> = { little: LITTLE, coder: CODER };

export const ALL_ISLANDS: readonly Island[] = [...LITTLE, ...CODER];

/** The islands for one mode, in sailing order. */
export function islandsFor(audience: QuestAudience): readonly Island[] {
  return ISLANDS[audience];
}

/** How many stages a mode has: 20 for Turtle Coders and 10 for Little Turtles once all content is in. */
export function stageCount(audience: QuestAudience): number {
  return ISLANDS[audience].length;
}

/** The stage number children see, starting at 1. 0 for an island that is not on the map. */
export function stageNumber(i: Island): number {
  return ISLANDS[i.audience].findIndex((x) => x.key === i.key) + 1;
}

export function islandByKey(key: string): Island | undefined {
  return ALL_ISLANDS.find((i) => i.key === key);
}

export function islandQuestIds(i: Island): string[] {
  return i.units.flatMap((u) => [...u]);
}

export interface QuestPlace {
  island: Island;
  unitIndex: number;
  /** Position inside the unit, 0 to 2. */
  index: number;
}

const PLACES: ReadonlyMap<string, QuestPlace> = new Map(
  ALL_ISLANDS.flatMap((isl) => isl.units.flatMap((unit, unitIndex) => unit.map((id, index): [string, QuestPlace] => [id, { island: isl, unitIndex, index }]))),
);

/** Where a quest lives: its island, unit and position. */
export function placeOf(questId: string): QuestPlace | undefined {
  return PLACES.get(questId);
}

export function islandOf(questId: string): Island | undefined {
  return PLACES.get(questId)?.island;
}

export function unitOf(questId: string): { island: Island; unitIndex: number; ids: readonly string[] } | undefined {
  const p = PLACES.get(questId);
  return p ? { island: p.island, unitIndex: p.unitIndex, ids: p.island.units[p.unitIndex]! } : undefined;
}

export function questById(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}
