import { CONCEPTS, QUESTS, type Concept, type Quest, type QuestAudience } from '../../logo/quests.js';
import type { FriendId } from '../gio/catalog';

/** Which scene the island card draws. For now each scene is named after a concept; new stages add their own ids. */
export type ArtId = Concept;

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
  island('coder', 'debugging', 'Bug Burrow', 'Something is broken. Find the bug and fix it.', 'dot', [
    ['c-bug-square', 'c-bug-triangle', 'c-bug-star'],
    ['c-bug-hexagon', 'c-bug-typo', 'c-bug-missing-end'],
  ]),
  island('coder', 'functions', 'Function Falls', 'Teach the turtle brand new commands.', 'bree', [
    ['c-box-command', 'c-triangle-command', 'c-function'],
    ['c-house', 'c-three-squares', 'c-square-ring'],
  ]),
  island('coder', 'variables', 'Variable Valley', 'Store numbers and change them as you go.', 'nutmeg', [
    ['c-make-size', 'c-make-double', 'c-shape'],
    ['c-make-growing', 'c-make-steps', 'c-two-inputs'],
  ]),
  island('coder', 'decisions', 'Decision Dunes', 'Let your code choose what to do.', 'hoot', [
    ['c-half-and-half', 'c-gap-square', 'c-bend'],
    ['c-dashes', 'c-turn-choice', 'c-half-hexagon'],
  ]),
  island('coder', 'events', 'Event Forest', 'Make things happen when a key is pressed.', 'hop', [
    ['c-one-key', 'c-game', 'c-space-square'],
    ['c-stamp', 'c-ticker', 'c-sketch'],
  ]),
  island('coder', 'recursion', 'Recursion Ridge', 'Commands that call themselves, again and again.', 'spindle', [
    ['c-rec-stairs', 'c-rec-rays', 'c-spiral'],
    ['c-rec-triangle-spiral', 'c-rec-nested', 'c-rec-pentagon-spiral'],
  ]),
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
