import { describe, expect, it } from 'vitest';
import { speakable, voiceLangs } from '../src/ui/speakable';

describe('speakable', () => {
  it('keeps punctuation so the voice pauses', () => {
    expect(speakable('Great job! Now try this: turn right, then go.')).toEqual(['Great job! Now try this: turn right, then go.']);
  });
  it('gives list items and lines without a full stop their own sentence', () => {
    expect(speakable('Try these\n• Draw a square\n• Add a colour')).toEqual(['Try these. Draw a square. Add a colour.']);
  });
  it('reads Logo words, variables and brackets naturally', () => {
    expect(speakable('Type REPEAT 4 [FD :size RT 90] to draw it.')).toEqual(['Type REPEAT 4, forward size right 90, to draw it.']);
  });
  it('drops emoji and does not split numbers with a decimal point', () => {
    expect(speakable('Well done! 🐢⭐ You moved 1.5 steps.')).toEqual(['Well done! You moved 1.5 steps.']);
  });
  it('splits long text into pieces the voice will not cut off', () => {
    const long = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1} of a long explanation.`).join(' ');
    const pieces = speakable(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(220);
    expect(pieces.join(' ')).toBe(long);
  });
  it('returns nothing for empty text', () => {
    expect(speakable('  \n • ')).toEqual([]);
  });
});

describe('voiceLangs', () => {
  it('reads Pidgin with a Nigerian English voice first', () => {
    expect(voiceLangs('pcm')).toEqual(['en-ng', 'en']);
    expect(voiceLangs('fr')).toEqual(['fr']);
  });
});