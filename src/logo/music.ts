import { LogoError, type SourcePos } from './errors.js';
import type { Value } from './interpreter.js';

/** One note or rest in a tune. `hz` is null for a rest. */
export interface TuneItem {
  hz: number | null;
  /** How many beats it lasts (above 0, up to MAX_BEATS). */
  beats: number;
  /** Tidy name with the octave written out, like C4 or Bb3. A rest is R. */
  name: string;
}

export interface Tune {
  items: TuneItem[];
}

export const MAX_TUNE_ITEMS = 256;
export const MAX_BEATS = 16;
export const MIN_OCTAVE = 2;
export const MAX_OCTAVE = 7;
export const DEFAULT_OCTAVE = 4;

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_WORD = /^([A-Ga-g])([#b]?)([2-7]?)$/;
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const VALID_NOTES = 'C D E F G A B (add # for sharp or a small b for flat, then an octave 2 to 7, like C#4 or Bb3) and R for a rest';
const NEEDS_NOTES = 'PLAY needs notes in a list, like PLAY [C D E].';

/** MIDI note number to frequency. MIDI 69 is A4 = 440 Hz and MIDI 60 is middle C. */
const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

function midiOf(letter: string, accidental: string, octave: number): number {
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (octave + 1) + SEMITONES[letter.toUpperCase()]! + shift;
}

/** Frequency of a note word like C, F#4 or Bb3. Returns null for a rest (R) and for anything that is not a note. */
export function noteHz(name: string): number | null {
  const m = NOTE_WORD.exec(name);
  if (!m) return null;
  return midiHz(midiOf(m[1]!, m[2]!, m[3] ? Number(m[3]) : DEFAULT_OCTAVE));
}

/** Nearest note name to a frequency, written with sharps and the octave, like C#4. */
export function noteName(hz: number): string {
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function describe(value: Value): string {
  return Array.isArray(value) ? `[${value.map(describe).join(' ')}]` : String(value);
}

/**
 * Read what follows PLAY: a note word ("C), or a list of notes, rests and lengths ([C D E 2 R]).
 * A number right after a note or rest is how many beats it lasts.
 */
export function parseTune(value: Value, pos: SourcePos): Tune {
  if (typeof value === 'number' || typeof value === 'boolean') throw new LogoError(`${NEEDS_NOTES} You gave ${describe(value)}.`, pos);
  const words = Array.isArray(value) ? value : [value];
  if (words.length === 0) throw new LogoError(NEEDS_NOTES, pos);

  const items: TuneItem[] = [];
  let lengthAllowed = false;
  for (const word of words) {
    if (typeof word === 'number') {
      if (!lengthAllowed) {
        throw new LogoError(`The ${describe(word)} has no note before it. A number sets the length of the note before it, like C 2 or R 0.5.`, pos);
      }
      if (!(word > 0 && word <= MAX_BEATS)) {
        throw new LogoError(`A note can last more than 0 and up to ${MAX_BEATS} beats. You gave ${describe(word)}.`, pos);
      }
      items[items.length - 1]!.beats = word;
      lengthAllowed = false;
      continue;
    }
    if (typeof word !== 'string') throw new LogoError(`${NEEDS_NOTES} You gave ${describe(word)}.`, pos);

    if (/^[Rr]$/.test(word)) {
      items.push({ hz: null, beats: 1, name: 'R' });
    } else {
      const m = NOTE_WORD.exec(word);
      if (!m) {
        if (/^[A-Ga-g]B/.test(word)) {
          throw new LogoError(`"${word}" is not a note. A flat uses a small b, like ${word[0]!.toUpperCase()}b, because capital B is the note B.`, pos);
        }
        throw new LogoError(`I don't know the note "${word}". Notes are ${VALID_NOTES}.`, pos);
      }
      const octave = m[3] ? Number(m[3]) : DEFAULT_OCTAVE;
      items.push({ hz: midiHz(midiOf(m[1]!, m[2]!, octave)), beats: 1, name: `${m[1]!.toUpperCase()}${m[2]!}${octave}` });
    }
    if (items.length > MAX_TUNE_ITEMS) throw new LogoError(`That is a long tune! One PLAY can hold ${MAX_TUNE_ITEMS} notes. Split it into two PLAYs.`, pos);
    lengthAllowed = true;
  }
  return { items };
}
