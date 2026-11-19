import { useCallback, useRef, useState } from 'react';
import type { SkillChallenge } from './skill';
import { advanceRun, currentChallenge, solveChallenge, startSkillRun, type SkillRun, type SkillStep } from './skillRun';

/**
 * Runs a skill check for the Studio. The Studio starts each challenge as an ordinary quest, and asks this hook
 * three things: is the quest on screen a challenge (`isActive`), how did the child do (`solved`), and what
 * comes next (`advance`). A check that is not finished is simply forgotten when the child leaves.
 */
export function useSkillCheck() {
  const [run, setRunState] = useState<SkillRun | null>(null);
  const latest = useRef<SkillRun | null>(null);
  /** Set when the check itself is starting a quest, so that starting the quest does not end the check. */
  const launching = useRef(false);

  const setRun = useCallback((next: SkillRun | null) => {
    latest.current = next;
    setRunState(next);
  }, []);

  /** Begin a check. Returns the quest of the first challenge, or null when there is nothing to check. */
  const begin = useCallback(
    (key: string, plan: readonly SkillChallenge[]): string | null => {
      const started = startSkillRun(key, plan);
      setRun(started);
      launching.current = started !== null;
      return started ? currentChallenge(started)?.questId ?? null : null;
    },
    [setRun],
  );

  /** True when this quest is the challenge the child is on. */
  const isActive = useCallback((questId?: string): boolean => {
    const r = latest.current;
    if (!r) return false;
    return questId === undefined || currentChallenge(r)?.questId === questId;
  }, []);

  /** A challenge was solved. Ends the check when it is decided, and returns what happened. */
  const solved = useCallback(
    (questId: string, helped: boolean): SkillStep | null => {
      const r = latest.current;
      if (!r) return null;
      const step = solveChallenge(r, questId, helped);
      setRun(step.kind === 'next' ? step.run : null);
      return step;
    },
    [setRun],
  );

  /** Move on after a solved challenge. Returns the next challenge's quest, or null when there is none. */
  const advance = useCallback((): string | null => {
    const r = latest.current;
    const next = r ? advanceRun(r) : null;
    if (!next) return null;
    setRun(next);
    launching.current = true;
    return currentChallenge(next)?.questId ?? null;
  }, [setRun]);

  /** Every quest start calls this. A quest the check did not start (picked from the map, say) ends the check. */
  const questStarted = useCallback((): void => {
    if (launching.current) launching.current = false;
    else if (latest.current) setRun(null);
  }, [setRun]);

  const stop = useCallback((): void => {
    launching.current = false;
    if (latest.current) setRun(null);
  }, [setRun]);

  return { run, begin, isActive, solved, advance, questStarted, stop };
}
