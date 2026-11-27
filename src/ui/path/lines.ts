import type { QuestAudience } from '../../logo/quests.js';
import { pickLine } from '../gio/lines';
import { linePool } from '../../i18n/content.js';
import { translator, type Lang } from '../../i18n/index.js';

/**
 * The words of the adventure map. Plain text only: no emoji, because Gio's bubble reads them aloud once.
 * One pool per mode, in the voice of src/ui/gio/lines.ts. `{island}` and `{prev}` are filled in by `say`.
 */
export interface MapLines {
  unitMastered: readonly string[];
  islandSailed: readonly string[];
  /** Said after an island is sailed and the next one opens. */
  opened: readonly string[];
  reviewDone: readonly string[];
  reviewHelped: readonly string[];
  hintUsed: readonly string[];
  gold: readonly string[];
  silver: readonly string[];
  locked: readonly string[];
  /** The map's closing line when every island is sailed and every quest cleared. */
  allDone: readonly string[];
}

export const MAP_LINES: Record<QuestAudience, MapLines> = {
  little: {
    unitMastered: ['Two gold stars! You are a star!', 'Two gold stars! This unit is yours!'],
    islandSailed: ['Hooray! What a sailor you are!', 'Whoosh! You are a real sailor now!'],
    opened: ['{island} is open now. Let us sail there next!', 'Look! {island} is open. Ready to explore?'],
    reviewDone: ['{island} is so happy to see you again!', 'You remembered it all! What a great visit.'],
    reviewHelped: ['Good try! We will visit {island} again soon.', 'Nice visit! {island} will see you again soon.'],
    hintUsed: ['You used a hint, so this one will be a silver star. Try it again later for gold!'],
    gold: ['Gold star! You did it all by yourself.', 'Gold star! Wow, no hints!'],
    silver: ['Silver star! Try it again without a hint for gold.', 'Silver star! You can win gold next time.'],
    locked: ['Sail {prev} first. Then {island} opens!'],
    allDone: ['You sailed every island! Gio is so proud of you.'],
  },
  coder: {
    unitMastered: ['Two gold stars, no hints.', 'You can do this on your own.'],
    islandSailed: ['Every unit is mastered. Nicely done.', 'Two units, all mastered. Nicely done.'],
    opened: ['{island} is open now. Ready for the next island?', '{island} just opened. Sail on when you are ready.'],
    reviewDone: ['{island} review done. Your memory is sharp.', 'You remembered {island}. That is how skills stick.'],
    reviewHelped: ['Review done with some help. {island} will come back in 2 days.', 'Good try. {island} will come back in 2 days for another go.'],
    hintUsed: ['Hint used, so this will be a silver star. You can try it again later for gold.'],
    gold: ['Gold star! You solved it with no hints.', 'Gold star! Clean solve.'],
    silver: ['Silver star. Try it again without a hint for gold.', 'Silver star. Replay it later and go for gold.'],
    locked: ['Sail {prev} first, then {island} opens.'],
    allDone: ['Every island is sailed and every quest cleared. Legend.'],
  },
};

/** The map's words in a language. Other languages' pools live in their locale files under map.<mode>.<pool>. */
export function mapLinesFor(mode: QuestAudience, lang: Lang): MapLines {
  const pools = MAP_LINES[mode];
  if (lang === 'en') return pools;
  const out = {} as Record<keyof MapLines, readonly string[]>;
  for (const name of Object.keys(pools) as (keyof MapLines)[]) out[name] = linePool(`map.${mode}.${name}`, pools[name], lang);
  return out;
}

/** Pick a line by counter and fill in the island names. */
export function say(pool: readonly string[], counter: number, vars: { island?: string; prev?: string } = {}): string {
  return pickLine(pool, counter).replace('{island}', vars.island ?? '').replace('{prev}', vars.prev ?? '');
}

/** The quiet invitation to revisit an island. */
export function reviewInvite(islandName: string, lang: Lang = 'en'): string {
  return translator(lang)('path.reviewInvite', { island: islandName });
}

/** The small print under an island's unit: how mastery works. */
export const MASTER_RULE = 'Win 2 gold stars to master a unit.';
export const UNIT_TIME = 'About 10 minutes';
