import type { PrimitiveSpec } from '../primitives.js';

/**
 * The seven words that exist only inside Gio's Adventure. They are never added to the global
 * PRIMITIVES, so Studio, saved programs, the translator and syntax highlighting do not see them.
 */
export const ADVENTURE_WORDS: readonly PrimitiveSpec[] = [
  { name: 'SWIM', aliases: [], arity: 0, kind: 'command', help: 'Swim one step forward into water' },
  { name: 'JUMP', aliases: [], arity: 0, kind: 'command', help: 'Hop over whatever is in front, two steps ahead (needs boots)' },
  { name: 'FREE', aliases: [], arity: 0, kind: 'command', help: 'Open the cage in front of Gio' },
  { name: 'REST', aliases: [], arity: 0, kind: 'command', help: 'Stand still for one beat' },
  { name: 'AHEAD', aliases: [], arity: 0, kind: 'reporter', help: 'What Gio will find in the next step, like "water or "rock' },
  { name: 'HERE', aliases: [], arity: 0, kind: 'reporter', help: 'What Gio is standing on: "clear, "water or "goal' },
  { name: 'GEMS', aliases: [], arity: 0, kind: 'reporter', help: 'How many gems Gio has collected' },
];

export const ADVENTURE_LOOKUP: ReadonlyMap<string, PrimitiveSpec> = new Map(ADVENTURE_WORDS.map((w) => [w.name, w]));

/** What AHEAD can answer, highest priority first. */
export const AHEAD_WORDS = ['enemy', 'fire', 'friend', 'gate', 'rock', 'water', 'edge', 'goal', 'gem', 'clear'] as const;
export type AheadWord = (typeof AHEAD_WORDS)[number];

/** What HERE can answer. */
export const HERE_WORDS = ['clear', 'water', 'goal'] as const;
export type HereWord = (typeof HERE_WORDS)[number];
