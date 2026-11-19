import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, validateProgram } from '../src/ai/logo-assistant.js';

describe('validateProgram', () => {
  it('accepts a tune with no drawing', () => {
    expect(validateProgram('; Twinkle\nSETTEMPO 100\nPLAY [C C G G A A G 2]', 'code')).toBeNull();
  });
  it('accepts a flipbook', () => {
    expect(validateProgram('; Growing circle\nREPEAT 10 [CLEAN CIRCLE REPCOUNT * 5 FRAME]', 'code')).toBeNull();
  });
  it('still accepts a plain drawing', () => {
    expect(validateProgram('; Square\nREPEAT 4 [FD 100 RT 90]', 'code')).toBeNull();
  });
  it('rejects a program that neither draws nor plays', () => {
    expect(validateProgram('; Nothing\nPU FD 10', 'code')).toBe('the program does not draw or play anything');
  });
  it('rejects an off-canvas drawing', () => {
    expect(validateProgram('; Too big\nFD 500', 'code')).toMatch(/off the canvas/);
  });
  it('rejects a 90 second tune', () => {
    expect(validateProgram('; Long\nREPEAT 3 [PLAY [C 16 D 16 E 16]]', 'code')).toMatch(/under 60 seconds/);
  });
  it('rejects SETTEMPO for blocks', () => {
    expect(validateProgram('; Tune\nSETTEMPO 90\nPLAY [C D E]', 'blocks')).toMatch(/can't be shown as blocks because it changes the tempo/);
  });
  it('accepts note, frame and wait blocks', () => {
    expect(validateProgram('; Tune\nPLAY [C E 2 G]\nFD 20\nFRAME\nWAIT 30', 'blocks')).toBeNull();
  });
  it('reports a bad note with its line', () => {
    expect(validateProgram('; Oops\nPLAY [C H]', 'code')).toMatch(/line 2 .*"H"/);
  });
});

describe('buildSystemPrompt', () => {
  it('explains PLAY and FRAME for code', () => {
    const prompt = buildSystemPrompt('code');
    expect(prompt).toContain('PLAY [C D E');
    expect(prompt).toContain('FRAME');
    expect(prompt).toContain('CLEAN between pictures');
  });
  it('lists the note blocks for blocks', () => {
    const prompt = buildSystemPrompt('blocks');
    expect(prompt).toContain('PLAY [C D E]: play notes');
    expect(prompt).toContain('FRAME:');
    expect(prompt).toContain('WAIT n:');
    expect(prompt).not.toContain('SETTEMPO');
  });
});
