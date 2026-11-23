import type { AgeModeId, Level, RealmId } from '../../logo/adventure/index.js';
import type { FriendId } from '../gio/catalog';
import { gateLevel, realmsFor } from './state';

/** What a child reads about a world: its name, a line for the world map and a story for the first visit. */
export interface RealmInfo {
  id: RealmId;
  name: string;
  /** One line under the name on the world map. */
  blurb: string;
  /** The first-visit card. Read aloud when read-aloud is on. */
  story: string;
  /** The friend the card shows. Null when the world has no garden friend to meet. */
  friend: FriendId | null;
}

export const REALMS: Record<RealmId, RealmInfo> = {
  maze: {
    id: 'maze',
    name: 'Maze Meadow',
    blurb: 'Walk, turn and fix a bug.',
    story: 'Welcome to Maze Meadow! Tell Gio where to walk, one command at a time. A ladybird called Dot is stuck in a cage somewhere ahead.',
    friend: 'dot',
  },
  woods: {
    id: 'woods',
    name: 'Whispering Woods',
    blurb: 'Say it once, do it again.',
    story: 'The Whispering Woods are full of patterns. Say a pattern once and REPEAT it. Olly the octopus is waiting to be freed.',
    friend: 'olly',
  },
  river: {
    id: 'river',
    name: 'Rolling River',
    blurb: 'Look ahead and decide.',
    story: 'The river is in a different place every time. Let Gio look ahead and decide, with IF. Hoot the owl is watching from the tree.',
    friend: 'hoot',
  },
  swamp: {
    id: 'swamp',
    name: 'Sleepy Swamp',
    blurb: 'Wait for the right moment.',
    story: 'Everything in the swamp moves slowly, to a beat. Wait with REST until the way is clear.',
    friend: null,
  },
  cave: {
    id: 'cave',
    name: 'Crystal Cave',
    blurb: 'Teach Gio new commands.',
    story: 'The Crystal Cave echoes! Teach Gio a brand new command with TO, then use it again and again. Bree the beaver has a workshop here.',
    friend: 'bree',
  },
  hills: {
    id: 'hills',
    name: 'Number Hills',
    blurb: 'Keep numbers in a box.',
    story: 'On the Number Hills, numbers can change. Keep one in a box with MAKE. Nutmeg the squirrel has lost her acorns.',
    friend: 'nutmeg',
  },
  castle: {
    id: 'castle',
    name: "Gio's Castle",
    blurb: 'Everything you know, together.',
    story: "This is Gio's Castle. Use everything you have learned. Spindle the spider has a web that needs a command that calls itself.",
    friend: 'spindle',
  },
};

export const realmName = (realm: RealmId): string => REALMS[realm].name;

/** What a closed world says it needs, in kid words ("Win Maze Meadow's boss to open"). */
export function lockedText(realm: RealmId, mode: AgeModeId, levels?: readonly Level[]): string {
  const order = realmsFor(mode, levels);
  const before = order[order.indexOf(realm) - 1];
  if (!before) return '';
  const gate = gateLevel(before, mode, levels);
  const what = gate?.kind === 'boss' ? `${realmName(before)}'s boss` : `the last level of ${realmName(before)}`;
  return `Win ${what} to open`;
}

/** What the child still needs for the next star, in words. Null for three stars. */
export function nextStarRule(stars: number, commands: number, par: number): string | null {
  if (stars <= 1) return 'Collect every gem for a second star.';
  if (stars === 2) {
    const over = commands - par;
    return over > 0
      ? `Use ${par} ${par === 1 ? 'command' : 'commands'} or fewer for a third star. You used ${commands}.`
      : `Use ${par} ${par === 1 ? 'command' : 'commands'} or fewer for a third star.`;
  }
  return null;
}
