import type { QuestAudience } from '../../logo/quests.js';
import type { Friend } from './catalog';

export interface LinePools {
  greeting: readonly string[];
  runStart: readonly string[];
  success: readonly string[];
  notYet: readonly string[];
}

/** Gio's words. Plain text only: no emoji, because the bubble is read aloud. */
export const LINES: Record<QuestAudience, LinePools> = {
  little: {
    greeting: [
      "Hi, I'm Gio! Tap the blocks below to tell me where to go, then press Run.",
      "Hello, friend! I'm Gio. Pick a block and let's draw something.",
    ],
    runStart: ['Here I go!', 'Watch me draw!', 'Off I walk!'],
    success: ['Look what we drew together!', 'We did it! That was fun.', 'Wow, nice drawing! Want to make another?'],
    notYet: ["Hmm, that's not quite it yet. Let's look at it together.", 'Oops! We can fix it. Tap a block to change it.'],
  },
  coder: {
    greeting: [
      "Hi, I'm Gio! Tell me what to draw up top, or type FD 100 in the code box and press Run.",
      "Hello, coder! I'm Gio. Type a command and press Run.",
    ],
    runStart: ['Running your code!', 'Here I go, following your steps.', 'Watch the turtle go!'],
    success: ['Your code worked! Nice drawing.', 'That ran well. What will you try next?', 'Nice work, coder! Want to change a number and see what happens?'],
    notYet: ["That's not quite right yet. Read the message and try again.", "A bug! Every coder meets them. Let's find it."],
  },
};

/** Pick a line by counter, so the same step always gives the same line. */
export function pickLine(pool: readonly string[], counter: number): string {
  const n = pool.length;
  if (n === 0) return '';
  const i = Number.isFinite(counter) ? Math.trunc(counter) : 0;
  return pool[((i % n) + n) % n] ?? '';
}

export function welcomeBackLine(): string {
  return 'Welcome back! Your garden kept growing.';
}

/** One bubble message, so it is spoken once and never cut off. */
export function friendIntro(friend: Friend): string {
  return `Meet ${friend.name} the ${friend.species}, who loves ${friend.idea.toLowerCase()} and now lives in your garden.`;
}
