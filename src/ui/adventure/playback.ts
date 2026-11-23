import type { AdvEvent, Level, LevelOutcome } from '../../logo/adventure/index.js';

/** Which map and trace the scene should play for a finished `playLevel`. */
export interface Playback {
  /** 0 is the main map; 1 and up are `level.variants`. */
  mapIndex: number;
  map: string[];
  trace: readonly AdvEvent[];
  /** What to say when the run ends with no event to explain it (Gio got tired). */
  loseMessage: string;
}

const winsOn = (trace: readonly AdvEvent[]): boolean => trace.some((e) => e.type === 'win');

/**
 * A plan runs on the main map and on every variant. Show the main map, unless the plan won there and
 * failed on another map: then show that map, so the child sees what went wrong and where.
 */
export function pickPlayback(level: Level, outcome: LevelOutcome): Playback {
  const variants = level.variants ?? [];
  if (outcome.status !== 'won' && winsOn(outcome.trace)) {
    const at = outcome.variants.findIndex((v) => v.status !== 'won');
    const failed = at >= 0 ? outcome.variants[at] : undefined;
    if (failed && variants[at]) return { mapIndex: at + 1, map: variants[at]!, trace: failed.trace, loseMessage: failed.message };
  }
  return { mapIndex: 0, map: level.map, trace: outcome.trace, loseMessage: outcome.message };
}

/** The other maps of a won level, for the thumbnails ("Now your plan works in two other rivers"). */
export function variantMaps(level: Level, outcome: LevelOutcome): { map: string[]; trace: readonly AdvEvent[]; won: boolean }[] {
  return (level.variants ?? []).map((map, i) => ({ map, trace: outcome.variants[i]?.trace ?? [], won: outcome.variants[i]?.status === 'won' }));
}
