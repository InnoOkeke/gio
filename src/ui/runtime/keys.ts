import { noteName } from '../../logo/index.js';

export interface NoteKey {
  /** The Logo word for this pitch, as used in note blocks. */
  pitch: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B' | 'C5';
  label: string;
  /** Boomwhacker-style colour. */
  color: string;
}

export const NOTE_KEYS: readonly NoteKey[] = [
  { pitch: 'C', label: 'C', color: '#e5473b' },
  { pitch: 'D', label: 'D', color: '#f08a1c' },
  { pitch: 'E', label: 'E', color: '#f2c10f' },
  { pitch: 'F', label: 'F', color: '#2fa760' },
  { pitch: 'G', label: 'G', color: '#2b9bf4' },
  { pitch: 'A', label: 'A', color: '#7a4cf0' },
  { pitch: 'B', label: 'B', color: '#ec3f86' },
  { pitch: 'C5', label: 'C', color: '#e5473b' },
];

/** Which of the eight keys a frequency lights, or null for a rest. Sharps and flats light their letter. */
export function keyIndexForHz(hz: number | null): number | null {
  if (hz === null) return null;
  const match = /^([A-G])#?(-?\d+)$/.exec(noteName(hz));
  if (!match) return null;
  const letter = match[1]!;
  if (letter === 'C' && Number(match[2]) >= 5) return 7;
  return 'CDEFGAB'.indexOf(letter);
}
