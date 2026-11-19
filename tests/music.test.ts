import { describe, it, expect } from 'vitest';
import { LogoError, noteHz, noteName, parseTune } from '../src/logo/index.js';

const pos = { line: 3, column: 1 };
const tune = (value: Parameters<typeof parseTune>[0]) => parseTune(value, pos).items;

describe('note grammar', () => {
  const table: [string, string, number | null][] = [
    ['C', 'C4', 261.6256],
    ['c', 'C4', 261.6256],
    ['C#4', 'C#4', 277.1826],
    ['Bb3', 'Bb3', 233.0819],
    ['F#', 'F#4', 369.9944],
    ['A', 'A4', 440],
    ['A4', 'A4', 440],
    ['C5', 'C5', 523.2511],
    ['C2', 'C2', 65.4064],
    ['B7', 'B7', 3951.0664],
    ['R', 'R', null],
    ['r', 'R', null],
  ];
  it.each(table)('%s is %s', (word, name, hz) => {
    const [item] = tune([word]);
    expect(item!.name).toBe(name);
    if (hz === null) expect(item!.hz).toBeNull();
    else expect(item!.hz).toBeCloseTo(hz, 3);
  });

  it('puts A4 at 440 Hz and middle C at 261.63 Hz', () => {
    expect(noteHz('A4')).toBe(440);
    expect(noteHz('C4')).toBeCloseTo(261.63, 2);
    expect(noteHz('R')).toBeNull();
    expect(noteHz('H')).toBeNull();
  });

  it('names the nearest note for a frequency', () => {
    expect(noteName(440)).toBe('A4');
    expect(noteName(261.63)).toBe('C4');
    expect(noteName(450)).toBe('A4');
    expect(noteName(277)).toBe('C#4');
  });

  it('reads a single word or a list', () => {
    expect(tune('C')).toHaveLength(1);
    expect(tune(['C', 'D', 'E'])).toHaveLength(3);
  });
});

describe('lengths', () => {
  it('reads a number after a note or rest as beats, one beat by default', () => {
    expect(tune(['C', 2, 'R', 0.5, 'E']).map((i) => i.beats)).toEqual([2, 0.5, 1]);
    expect(tune(['C', 0.5])[0]!.beats).toBe(0.5);
    expect(tune(['R', 2])[0]).toMatchObject({ hz: null, beats: 2 });
  });
  it('allows up to 16 beats and nothing longer or zero', () => {
    expect(tune(['C', 16])[0]!.beats).toBe(16);
    expect(() => tune(['C', 17])).toThrow(/more than 0 and up to 16 beats/);
    expect(() => tune(['C', 0])).toThrow(/more than 0 and up to 16 beats/);
    expect(() => tune(['C', -1])).toThrow(/more than 0 and up to 16 beats/);
  });
});

describe('errors say what to do', () => {
  const message = (value: Parameters<typeof parseTune>[0]): string => {
    try {
      parseTune(value, pos);
    } catch (err) {
      expect(err).toBeInstanceOf(LogoError);
      expect((err as LogoError).line).toBe(3);
      return (err as LogoError).message;
    }
    throw new Error('no error');
  };

  it('lists the valid notes for an unknown word', () => {
    const m = message(['C', 'H']);
    expect(m).toContain('"H"');
    expect(m).toContain('C D E F G A B');
    expect(m).toContain('R for a rest');
  });
  it('explains that flats use a small b', () => {
    expect(message(['EB'])).toMatch(/flat uses a small b, like Eb/);
    expect(message(['BB'])).toMatch(/small b/);
  });
  it('rejects octaves outside 2 to 7', () => {
    expect(message(['C1'])).toContain('I don\'t know the note "C1"');
    expect(message(['C8'])).toContain('I don\'t know the note "C8"');
  });
  it('explains a number with no note before it', () => {
    expect(message([2, 'C'])).toMatch(/no note before it.*length of the note before it/);
    expect(message(['C', 2, 3])).toMatch(/no note before it/);
  });
  it('says PLAY needs notes for a number, a boolean or an empty list', () => {
    expect(message(5)).toContain('PLAY needs notes in a list, like PLAY [C D E]');
    expect(message(true)).toContain('PLAY [C D E]');
    expect(message([])).toBe('PLAY needs notes in a list, like PLAY [C D E].');
  });
  it('rejects a nested list', () => {
    expect(message([['C']])).toContain('PLAY [C D E]');
  });
  it('caps a tune at 256 notes', () => {
    expect(tune(Array<string>(256).fill('C'))).toHaveLength(256);
    expect(message(Array<string>(257).fill('C'))).toContain('256');
  });
});
