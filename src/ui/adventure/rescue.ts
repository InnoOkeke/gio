import type { FriendId } from '../gio/catalog';

/** What a friend says once the cage is open and the friend comes home. One line per caged friend of the adventure. */
export const RESCUE_LINES: Partial<Record<FriendId, string>> = {
  dot: 'Dot the ladybird flies out. You found the bug and fixed it.',
  olly: 'Olly waves all eight arms. You said the pattern once and REPEAT did the rest.',
  hoot: 'Hoot hoots happily. Gio looked ahead and decided with IF.',
  bree: 'Bree grabs her tools. You taught Gio a new command with TO, then built bigger commands from it.',
  nutmeg: 'Nutmeg finds her acorns. A number in a box, made with MAKE, grew with every step.',
  spindle: 'Spindle spins a thank-you web. A command that calls itself wound the whole way out.',
};

/** The sentence under "You freed ...": the friend's own words, or nothing for a friend with no line. */
export const rescueLine = (id: FriendId): string => RESCUE_LINES[id] ?? '';