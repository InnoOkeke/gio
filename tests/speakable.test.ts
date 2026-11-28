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
    expect(speakable('Type REPEAT 4 [FD :size RT 90] to draw it.')).toEqual(['Type repeat 4, forward size right 90, to draw it.']);
  });
  it('reads Logo words in the language of the text, never spelled out', () => {
    expect(speakable('Écris REPETE 4 [AV 100 TD 90] puis LC.', 'fr')).toEqual(['Écris répète 4, avance 100 droite 90, puis lève le crayon.']);
    expect(speakable('Usa FD 50 y luego BAJALAPIZ.', 'es')).toEqual(['Usa avanza 50 y luego baja el lápiz.']);
    expect(speakable('Use DOAGAIN 4 [GO 100]', 'pcm')).toEqual(['Use do again 4, go 100.']);
  });
  it('leaves other words in capitals alone', () => {
    expect(speakable('GIO says OK.')).toEqual(['GIO says OK.']);
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