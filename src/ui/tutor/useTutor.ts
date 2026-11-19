import { useCallback, useRef, useState } from 'react';
import { diagnose, diagnosisKey } from '../../logo/diagnose.js';
import type { Quest } from '../../logo/quests.js';
import { api, ApiError, type AssistantStyle, type Hint } from '../api';
import { nextLevel, withHint, type HintLadder, type HintStep } from './ladder';

export interface TutorContext {
  code: string;
  style: AssistantStyle;
  quest: Quest | null;
}

export interface TutorError {
  text: string;
  /** True when the turtle kindly turned the request down (kid-safe redirect). */
  redirect: boolean;
}

export const EMPTY_FREE = 'Add something first, then tap "I\'m stuck" and I can help.';
export const ALREADY_DONE = 'You already did it! Press Run to see it again.';

/** State of the "I'm stuck" card. Hints never touch quest progress, badges, stickers or friends. */
export function useTutor() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TutorError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ladder, setLadder] = useState<HintLadder | null>(null);
  const [shown, setShown] = useState<HintStep>(1);
  const ladderRef = useRef<HintLadder | null>(null);
  /** Bumped whenever the child moves on, so an answer that arrives late is dropped. */
  const ticket = useRef(0);

  const store = (next: HintLadder | null) => {
    ladderRef.current = next;
    setLadder(next);
  };

  /** Ask for the next step. Resolves with the new hint, or null when nothing new arrived. */
  const ask = useCallback(async (ctx: TutorContext): Promise<{ level: HintStep; hint: Hint } | null> => {
    const mine = ++ticket.current;
    setOpen(true);
    setError(null);
    setNotice(null);

    const diagnosis = diagnose(ctx.code, ctx.quest ?? undefined);
    if (ctx.quest && diagnosis.kind === 'works') {
      setNotice(ALREADY_DONE);
      return null;
    }

    if (!ctx.quest && diagnosis.kind === 'empty') {
      setNotice(EMPTY_FREE);
      return null;
    }
    const key = diagnosisKey(ctx.quest?.id ?? null, diagnosis);
    const level = nextLevel(ladderRef.current, key);
    if (level === null) {
      setShown(3);
      return null;
    }

    setLoading(true);
    try {
      const hint = await api.hint(level, ctx.code, ctx.style, ctx.quest?.id);
      if (mine !== ticket.current) return null;
      store(withHint(ladderRef.current, key, level, hint));
      setShown(level);
      return { level, hint };
    } catch (err) {
      if (mine !== ticket.current) return null;
      setError({ text: err instanceof Error ? err.message : 'I could not think of a hint right now. Try again?', redirect: err instanceof ApiError && err.redirect });
      return null;
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, []);

  /** Go back (or forward) to a hint that was already fetched. Costs nothing. */
  const show = useCallback((level: HintStep) => {
    if (!ladderRef.current?.hints[level]) return;
    setError(null);
    setNotice(null);
    setShown(level);
  }, []);

  const close = useCallback(() => {
    ticket.current += 1;
    setOpen(false);
    setLoading(false);
    setError(null);
    setNotice(null);
  }, []);

  /** Forget everything: a new quest, a new drawing. */
  const reset = useCallback(() => {
    close();
    ladderRef.current = null;
    setLadder(null);
    setShown(1);
  }, [close]);

  return { open, loading, error, notice, ladder, shown, ask, show, close, reset };
}
