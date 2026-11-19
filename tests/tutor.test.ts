import { describe, it, expect } from 'vitest';
import { applyChanges, buildHintPrompt, leaksFix, lineDiff, numberLeak, textProblem } from '../src/ai/tutor.js';
import { diagnose, diagnosisKey } from '../src/logo/diagnose.js';
import { QUESTS } from '../src/logo/quests.js';
import type { Hint } from '../src/ui/api.js';
import { highestStep, nextLevel, withHint } from '../src/ui/tutor/ladder.js';

function quest(id: string) {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`no quest ${id}`);
  return q;
}

describe('diagnose', () => {
  it('calls blank code empty', () => {
    expect(diagnose('')).toEqual({ kind: 'empty' });
    expect(diagnose('  \n ')).toEqual({ kind: 'empty' });
  });

  it('reports a parse error with its line', () => {
    const d = diagnose('FD 10\nREPEAT 4 [FD 100');
    expect(d.kind).toBe('error');
    if (d.kind === 'error') {
      expect(d.line).toBe(2);
      expect(d.message.length).toBeGreaterThan(0);
    }
  });

  it('reports a run-time error with its line', () => {
    const d = diagnose('FD 10\nFD :nothing');
    expect(d).toMatchObject({ kind: 'error', line: 2 });
  });

  it('reports a drawing that does not match the quest', () => {
    const q = quest('c-bug-square');
    const d = diagnose(q.starter!, q);
    expect(d.kind).toBe('mismatch');
  });

  it('says a correct program works, with or without a quest', () => {
    expect(diagnose('REPEAT 4 [FD 100 RT 90]', quest('c-square'))).toEqual({ kind: 'works' });
    expect(diagnose('FD 50')).toEqual({ kind: 'works' });
  });

  it('builds a stable key that changes with the quest, the kind and the line', () => {
    const q = quest('c-bug-square');
    const a = diagnose(q.starter!, q);
    expect(diagnosisKey(q.id, a)).toBe(diagnosisKey(q.id, diagnose(q.starter!, q)));
    expect(diagnosisKey(null, { kind: 'works' })).toBe('free:works:');
    expect(diagnosisKey('c-line', { kind: 'error', line: 3, message: 'x' })).toBe('c-line:error:3');
    expect(diagnosisKey('c-line', { kind: 'error', line: null, message: 'x' })).toBe('c-line:error:');
    expect(diagnosisKey(q.id, a)).not.toBe(diagnosisKey('c-line', a));
    expect(diagnosisKey('c-line', { kind: 'error', line: 3, message: 'x' })).not.toBe(diagnosisKey('c-line', { kind: 'error', line: 4, message: 'x' }));
  });
});

describe('leaksFix', () => {
  it.each(['Try ```REPEAT 4``` instead', 'Turn RT 90 at each corner', 'Use FD :size here', 'Put it in REPEAT [ ... ]', 'Try rt 90 there', 'Make the turn left 120 degrees'])('flags "%s"', (text) => {
    expect(leaksFix(text)).toBe(true);
  });

  it.each(['What happens at each corner?', 'How far does the turtle turn before it walks again?', 'Look at the turn inside your loop.', 'Think about the number of sides.'])('allows "%s"', (text) => {
    expect(leaksFix(text)).toBe(false);
  });
});

describe('numberLeak', () => {
  it.each(['Turn 72 degrees', 'Try seventy-two', 'Make a quarter turn', 'Go twice as far', 'Use a hundred steps'])('flags "%s"', (text) => {
    expect(numberLeak(text)).toBe(true);
  });

  it.each(['What happens at one corner?', 'How many sides?', 'Look at the turn inside your loop.'])('allows "%s"', (text) => {
    expect(numberLeak(text)).toBe(false);
  });
});

describe('textProblem', () => {
  it('rejects a number at levels 1 and 2 in both styles, but not at level 3', () => {
    for (const style of ['code', 'blocks'] as const) {
      expect(textProblem('How far is a quarter turn?', 1, style, false)).toContain('number');
      expect(textProblem('The turn is about seventy-two.', 2, style, false)).toContain('number');
      expect(textProblem('Turn 72 degrees.', 3, style, false)).toBeNull();
    }
  });
});

describe('lineDiff', () => {
  it('finds a changed line, numbered in the child program', () => {
    expect(lineDiff('; hi\nREPEAT 4 [FD 100 RT 60]', '; hi\nREPEAT 4 [FD 100 RT 90]')).toEqual([{ line: 2, was: 'REPEAT 4 [FD 100 RT 60]', now: 'REPEAT 4 [FD 100 RT 90]' }]);
  });

  it('finds an inserted line, numbered in the corrected program', () => {
    expect(lineDiff('FD 10\nFD 30', 'FD 10\nRT 90\nFD 30')).toEqual([{ line: 2, was: null, now: 'RT 90' }]);
  });

  it('finds a removed line, numbered in the child program', () => {
    expect(lineDiff('FD 10\nBK 5\nFD 30', 'FD 10\nFD 30')).toEqual([{ line: 2, was: 'BK 5', now: null }]);
  });

  it('returns nothing for identical programs, ignoring trailing spaces', () => {
    expect(lineDiff('FD 10  \nRT 90', 'FD 10\nRT 90')).toEqual([]);
  });

  it('applyChanges turns the child program into the corrected one', () => {
    const cases: [string, string][] = [
      ['; hi\nREPEAT 4 [FD 100 RT 60]', '; hi\nREPEAT 4 [FD 100 RT 90]'],
      ['FD 10\nFD 30', 'FD 10\nRT 90\nFD 30'],
      ['FD 10\nBK 5\nFD 30', 'FD 10\nFD 30'],
      ['A\nB\nC\nD', 'A\nX\nY\nC\nZ'],
      ['', 'FD 10\nRT 90'],
    ];
    for (const [before, after] of cases) expect(applyChanges(before, lineDiff(before, after))).toBe(after);
  });

  it('refuses programs longer than 200 lines with a 400 error', () => {
    const long = Array.from({ length: 201 }, (_, k) => `FD ${k}`).join('\n');
    expect(() => lineDiff(long, 'FD 1')).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => lineDiff('FD 1', long)).toThrow(expect.objectContaining({ status: 400 }));
    const ok = Array.from({ length: 200 }, (_, k) => `FD ${k}`).join('\n');
    expect(lineDiff(ok, ok)).toEqual([]);
  });
});

describe('hint ladder', () => {
  const hint = (text: string): Hint => ({ text });

  it('walks Think, Look, Fix for the same problem, then stops asking', () => {
    let ladder = null as ReturnType<typeof withHint> | null;
    expect(nextLevel(ladder, 'q:mismatch:')).toBe(1);
    ladder = withHint(ladder, 'q:mismatch:', 1, hint('a'));
    expect(nextLevel(ladder, 'q:mismatch:')).toBe(2);
    ladder = withHint(ladder, 'q:mismatch:', 2, hint('b'));
    expect(nextLevel(ladder, 'q:mismatch:')).toBe(3);
    ladder = withHint(ladder, 'q:mismatch:', 3, hint('c'));
    expect(nextLevel(ladder, 'q:mismatch:')).toBeNull();
    expect(highestStep(ladder)).toBe(3);
    expect(ladder.hints[1]?.text).toBe('a');
  });

  it('restarts at Think when the problem changes', () => {
    const ladder = withHint(withHint(null, 'q:error:2', 1, hint('a')), 'q:error:2', 2, hint('b'));
    expect(nextLevel(ladder, 'q:error:5')).toBe(1);
    const fresh = withHint(ladder, 'q:error:5', 1, hint('new'));
    expect(fresh.hints[2]).toBeUndefined();
    expect(fresh.key).toBe('q:error:5');
  });

  it('keeps earlier hints when a later one is added', () => {
    const ladder = withHint(withHint(null, 'k', 1, hint('a')), 'k', 2, hint('b'));
    expect(ladder.hints).toEqual({ 1: { text: 'a' }, 2: { text: 'b' } });
    expect(highestStep(null)).toBeNull();
  });
});

describe('buildHintPrompt', () => {
  const ctx = { diagnosis: 'GIO stopped with a problem on line 2', goal: 'Draw a square', target: 'REPEAT 4 [FD 100 RT 90]' };

  it('includes the answer key at levels 2 and 3 only', () => {
    expect(buildHintPrompt('code', 1, ctx)).not.toContain('REPEAT 4 [FD 100 RT 90]');
    expect(buildHintPrompt('code', 1, ctx)).not.toContain('ANSWER KEY');
    for (const level of [2, 3] as const) {
      const prompt = buildHintPrompt('code', level, ctx);
      expect(prompt).toContain('ANSWER KEY');
      expect(prompt).toContain('REPEAT 4 [FD 100 RT 90]');
    }
  });

  it('tells levels 1 and 2 not to write any number, but not level 3', () => {
    expect(buildHintPrompt('code', 1, ctx)).toContain('Do not write any digit or number word');
    expect(buildHintPrompt('blocks', 2, ctx)).toContain('Do not write any digit or number word');
    expect(buildHintPrompt('code', 3, ctx)).not.toContain('Do not write any digit or number word');
  });

  it('always carries the diagnosis and the goal', () => {
    for (const level of [1, 2, 3] as const) {
      const prompt = buildHintPrompt('code', level, ctx);
      expect(prompt).toContain('GIO stopped with a problem on line 2');
      expect(prompt).toContain('Draw a square');
    }
  });

  it('asks for one question at level 1, words only at level 2 and a fenced program at level 3', () => {
    expect(buildHintPrompt('code', 1, ctx)).toContain('exactly ONE question');
    expect(buildHintPrompt('code', 2, ctx)).toContain('Do not give the corrected code');
    expect(buildHintPrompt('code', 3, ctx)).toContain('WHOLE corrected program in one fenced code block');
  });

  it('forbids programming words for Little Turtles and limits them to two short sentences', () => {
    const prompt = buildHintPrompt('blocks', 1, ctx);
    expect(prompt).toContain('at most 2 very short sentences');
    expect(prompt).toContain('Do not use programming words');
    expect(buildHintPrompt('blocks', 3, ctx)).toContain('Use ONLY these block commands');
  });
});
