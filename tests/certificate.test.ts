import { describe, it, expect } from 'vitest';
import { NAME_MAX, cleanName, emptyCertificate, formatEarned, parseCertificate, stageTally, tallyLine } from '../src/ui/path/certificate';

describe('certificate name', () => {
  it('keeps a normal name as typed', () => {
    expect(cleanName('Ada Lovelace')).toBe('Ada Lovelace');
    expect(cleanName('Zoë 🐢')).toBe('Zoë 🐢');
  });

  it('caps the name at 40 characters without splitting an emoji', () => {
    expect(NAME_MAX).toBe(40);
    expect(Array.from(cleanName('x'.repeat(80)))).toHaveLength(40);
    const turtles = cleanName('🐢'.repeat(60));
    expect(Array.from(turtles)).toHaveLength(40);
    expect(turtles).toBe('🐢'.repeat(40));
  });

  it('removes control characters and extra spaces', () => {
    expect(cleanName('  Ada\u0000\n\tLove   lace ')).toBe('Ada Love lace ');
  });

  it('reads stored data without ever throwing', () => {
    expect(parseCertificate(null)).toEqual(emptyCertificate());
    expect(parseCertificate('Ada')).toEqual(emptyCertificate());
    expect(parseCertificate({ v: 1, name: 42 })).toEqual(emptyCertificate());
    expect(parseCertificate({ v: 1, name: '  Ada  ' })).toEqual({ v: 1, name: 'Ada' });
    expect(Array.from(parseCertificate({ v: 1, name: 'y'.repeat(100) }).name)).toHaveLength(40);
  });
});

describe('certificate wording', () => {
  it('counts sailed and tested-out stages, and never counts a stage twice', () => {
    expect(stageTally([{ sailed: true, tested: false }, { sailed: false, tested: true }, { sailed: true, tested: true }])).toEqual({ sailed: 2, tested: 1 });
    expect(tallyLine({ sailed: 20, tested: 0 })).toBe('20 stages sailed');
    expect(tallyLine({ sailed: 18, tested: 2 })).toBe('18 stages sailed, 2 tested out');
    expect(tallyLine({ sailed: 1, tested: 0 })).toBe('1 stage sailed');
  });

  it('formats a date key and rejects a bad one', () => {
    expect(formatEarned('2026-06-14', 'en-GB')).toBe('14 June 2026');
    expect(formatEarned('not a date')).toBe('');
    expect(formatEarned('2026-13-45', 'en-GB')).not.toBe('14 June 2026');
  });
});
