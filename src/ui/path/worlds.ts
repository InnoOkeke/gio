import type { QuestAudience } from '../../logo/quests.js';

/** A group of four stages on the Turtle Coders map. */
export interface World {
  title: string;
  /** The first stage of the world, starting at 1. */
  from: number;
  /** The last stage of the world. */
  to: number;
}

export const CODER_WORLDS: readonly World[] = [
  { title: 'Shapes and colours', from: 1, to: 4 },
  { title: 'Commands', from: 5, to: 8 },
  { title: 'Smart code', from: 9, to: 12 },
  { title: 'Big ideas', from: 13, to: 16 },
  { title: 'Masterpieces', from: 17, to: 20 },
];

/** The world that begins at this stage, if any. Only the Turtle Coders map is grouped into worlds; Little Turtles is one list. */
export function worldStartingAt(audience: QuestAudience, stage: number): World | undefined {
  return audience === 'coder' ? CODER_WORLDS.find((w) => w.from === stage) : undefined;
}
