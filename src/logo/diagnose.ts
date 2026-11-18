import { check, start } from './index.js';
import { checkQuest, playWithPresses, type Quest } from './quests.js';

/**
 * What GIO's own interpreter finds when it looks at a child's program.
 * Shared by the browser (to decide which hint to ask for) and the server (so the line shown at hint level 2 never comes from the model).
 */
export type Diagnosis =
  | { kind: 'empty' }
  | { kind: 'error'; line: number | null; message: string }
  | { kind: 'mismatch'; message: string }
  | { kind: 'works' };

export function diagnose(code: string, quest?: Quest): Diagnosis {
  if (!code.trim()) return { kind: 'empty' };

  const parsed = check(code);
  if (!parsed.ok) return { kind: 'error', line: parsed.problem.line, message: parsed.problem.message };

  const started = start(code);
  if (!started.ok) return { kind: 'error', line: started.problem.line, message: started.problem.message };

  if (quest) {
    const played = playWithPresses(code, quest.presses);
    if (!played.ok) return { kind: 'error', line: null, message: played.message };
    const result = checkQuest(quest, code);
    if (!result.pass) return { kind: 'mismatch', message: result.message };
  }

  return { kind: 'works' };
}

/** Same key = same problem. The hint ladder restarts at the first step when this changes. */
export function diagnosisKey(questId: string | null, d: Diagnosis): string {
  const line = d.kind === 'error' ? (d.line ?? '') : '';
  return `${questId ?? 'free'}:${d.kind}:${line}`;
}
