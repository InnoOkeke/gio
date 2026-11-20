import { sound } from '../runtime/sound';
import type { Tone } from '../runtime/timeline';

export type Cue = 'step' | 'turn' | 'swim' | 'jump' | 'free' | 'gem' | 'power' | 'bump' | 'win';

export const CUES: readonly Cue[] = ['step', 'turn', 'swim', 'jump', 'free', 'gem', 'power', 'bump', 'win'];

/** Note frequencies in hertz. */
const C4 = 262;
const E4 = 330;
const G4 = 392;
const C5 = 523;
const E5 = 659;
const G5 = 784;
const C6 = 1047;

/**
 * The adventure's sounds as notes: a soft step tick, a gem chime, a bump thud and a win jingle, plus a few
 * small ones. They are played through the same Web Audio engine as the rest of GIO, so the sound toggle
 * silences them and nothing is downloaded.
 */
export function cueTones(cue: Cue): Tone[] {
  switch (cue) {
    case 'step':
      return [{ hz: 330, seconds: 0.05 }];
    case 'turn':
      return [{ hz: 294, seconds: 0.04 }];
    case 'swim':
      return [
        { hz: 392, seconds: 0.06 },
        { hz: 349, seconds: 0.06 },
      ];
    case 'jump':
      return [
        { hz: C4, seconds: 0.05 },
        { hz: G4, seconds: 0.08 },
      ];
    case 'free':
      return [
        { hz: E4, seconds: 0.08 },
        { hz: G4, seconds: 0.08 },
        { hz: C5, seconds: 0.14 },
      ];
    case 'gem':
      return [
        { hz: E5, seconds: 0.07 },
        { hz: C6, seconds: 0.16 },
      ];
    case 'power':
      return [
        { hz: G4, seconds: 0.07 },
        { hz: C5, seconds: 0.07 },
        { hz: G5, seconds: 0.12 },
      ];
    case 'bump':
      return [
        { hz: 110, seconds: 0.12 },
        { hz: 82, seconds: 0.18 },
      ];
    case 'win':
      return [
        { hz: C5, seconds: 0.12 },
        { hz: E5, seconds: 0.12 },
        { hz: G5, seconds: 0.12 },
        { hz: C6, seconds: 0.3 },
      ];
  }
}

/** Play a cue now. Does nothing when sound is off. */
export function playCue(cue: Cue): void {
  sound.play(cueTones(cue));
}
