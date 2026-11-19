import type { TurtleEvent } from '../../logo/index.js';

export interface Tone {
  hz: number | null;
  seconds: number;
}

export interface ScheduledTone {
  hz: number | null;
  /** Seconds on the audio clock when the tone begins. */
  start: number;
  length: number;
  /** How long the note sounds; a little shorter than `length` so repeated notes do not blur. */
  audible: number;
}

/** True when the program uses FRAME, so it plays as a movie: each picture appears whole. */
export function isAnimated(events: readonly TurtleEvent[]): boolean {
  return events.some((e) => e.type === 'frame');
}

/** How long the turtle waits at this event: a tune lasts as long as its notes, WAIT as long as it says. */
export function holdSeconds(event: TurtleEvent): number {
  if (event.type === 'play') return event.tones.reduce((sum, tone) => sum + tone.seconds, 0);
  if (event.type === 'wait') return event.seconds;
  return 0;
}

/** The picture number (1, 2, 3...) shown once the event at `index` has been reached, or null before any FRAME. */
export function frameNumberAt(events: readonly TurtleEvent[], index: number): number | null {
  let count = 0;
  const last = Math.min(index, events.length - 1);
  for (let k = 0; k <= last; k++) if (events[k]!.type === 'frame') count++;
  return count > 0 ? count : null;
}

export const AUDIBLE_FRACTION = 0.92;

/** Place each tone one after another from startTime. Rests keep their time but are not audible. */
export function noteSchedule(tones: readonly Tone[], startTime: number): ScheduledTone[] {
  let start = startTime;
  return tones.map((tone) => {
    const item = { hz: tone.hz, start, length: tone.seconds, audible: tone.seconds * AUDIBLE_FRACTION };
    start += tone.seconds;
    return item;
  });
}