import type { Concept, QuestAudience } from '../../logo/quests.js';
import { CONCEPTS } from '../../logo/quests.js';

export type FriendId = 'olly' | 'dot' | 'chip' | 'puff' | 'nutmeg' | 'hoot' | 'bree' | 'spindle' | 'hop';
export type StickerId = Concept | 'first-drawing' | 'bug-fixer';

/** The learning signal that brings a friend to the garden. */
export type UnlockRule = 'repeat' | 'bug-fixed' | 'colours' | 'circle' | 'make' | 'if' | 'to' | 'recursion' | 'when';

export interface Friend {
  id: FriendId;
  name: string;
  species: string;
  /** The big idea this friend stands for, in kid words. */
  idea: string;
  /** How to meet this friend, in kid words. */
  hint: string;
  modes: readonly QuestAudience[];
  unlock: UnlockRule;
}

export interface Sticker {
  id: StickerId;
  name: string;
  /** How to earn it, in kid words. */
  hint: string;
  modes: readonly QuestAudience[];
}

const BOTH: readonly QuestAudience[] = ['little', 'coder'];
const CODER: readonly QuestAudience[] = ['coder'];

export const FRIENDS: readonly Friend[] = [
  { id: 'olly', name: 'Olly', species: 'octopus', idea: 'Loops', hint: 'Use REPEAT to do something again and again.', modes: BOTH, unlock: 'repeat' },
  { id: 'dot', name: 'Dot', species: 'ladybird', idea: 'Fixing bugs', hint: 'Fix a bug so your drawing works.', modes: BOTH, unlock: 'bug-fixed' },
  { id: 'chip', name: 'Chip', species: 'chameleon', idea: 'Colours', hint: 'Draw with two or more colours.', modes: BOTH, unlock: 'colours' },
  { id: 'puff', name: 'Puff', species: 'pufferfish', idea: 'Circles', hint: 'Draw a circle.', modes: BOTH, unlock: 'circle' },
  { id: 'nutmeg', name: 'Nutmeg', species: 'squirrel', idea: 'Variables', hint: 'Store a number with MAKE.', modes: CODER, unlock: 'make' },
  { id: 'hoot', name: 'Hoot', species: 'owl', idea: 'Decisions', hint: 'Make a choice with IF or IFELSE.', modes: CODER, unlock: 'if' },
  { id: 'bree', name: 'Bree', species: 'beaver', idea: 'New commands', hint: 'Build your own command with TO and END.', modes: CODER, unlock: 'to' },
  { id: 'spindle', name: 'Spindle', species: 'spider', idea: 'Recursion', hint: 'Make a command that uses itself.', modes: CODER, unlock: 'recursion' },
  { id: 'hop', name: 'Hop', species: 'frog', idea: 'Games and events', hint: 'Use WHEN so a key press makes me move.', modes: CODER, unlock: 'when' },
];

const CONCEPT_HINT: Record<Concept, string> = {
  moves: 'Sail Shape Shore: win two gold stars in each of its two units.',
  colours: 'Sail Colour Cove: win two gold stars in each of its two units.',
  loops: 'Sail Loop Lagoon: win two gold stars in each of its two units.',
  functions: 'Sail Function Falls: win two gold stars in each of its two units.',
  variables: 'Sail Variable Valley: win two gold stars in each of its two units.',
  decisions: 'Sail Decision Dunes: win two gold stars in each of its two units.',
  recursion: 'Sail Recursion Ridge: win two gold stars in each of its two units.',
  debugging: 'Sail Bug Burrow: win two gold stars in each of its two units.',
  events: 'Sail Event Forest: win two gold stars in each of its two units.',
};

/** Concept stickers wear the existing quest badge names. */
const CONCEPT_MODES: Record<Concept, readonly QuestAudience[]> = {
  moves: BOTH,
  colours: ['little'],
  loops: BOTH,
  functions: CODER,
  variables: CODER,
  decisions: CODER,
  recursion: CODER,
  debugging: CODER,
  events: CODER,
};

export const STICKERS: readonly Sticker[] = [
  ...(Object.keys(CONCEPTS) as Concept[]).map((concept) => ({
    id: concept as StickerId,
    name: CONCEPTS[concept].badge,
    hint: CONCEPT_HINT[concept],
    modes: CONCEPT_MODES[concept],
  })),
  { id: 'first-drawing', name: 'First drawing', hint: 'Run a drawing you made yourself.', modes: BOTH },
  { id: 'bug-fixer', name: 'Bug fixer', hint: 'Fix a bug so your drawing works.', modes: BOTH },
];

export const SHELL_SLOTS = 7;

export const FRIEND_IDS: readonly FriendId[] = FRIENDS.map((f) => f.id);
export const STICKER_IDS: readonly StickerId[] = STICKERS.map((s) => s.id);

export function friendById(id: FriendId): Friend {
  const f = FRIENDS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown friend ${id}`);
  return f;
}

export function stickerById(id: StickerId): Sticker {
  const s = STICKERS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown sticker ${id}`);
  return s;
}
