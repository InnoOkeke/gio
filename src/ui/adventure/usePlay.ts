import { useCallback, useEffect, useRef, useState } from 'react';
import { playLevel, type AdvEvent, type AgeModeId, type Level, type LevelOutcome } from '../../logo/adventure/index.js';
import { haptic } from '../haptics';
import type { Speed } from '../runtime/player';
import { AdventurePlayer, runOnFrames, type AdventureStatus, type PlayerFrame } from './AdventurePlayer';
import { playCue } from './cues';
import { pickPlayback } from './playback';
import { initialScene, type SceneState } from './scene-state';

export interface PlayConfig {
  speed: Speed;
  reducedMotion: boolean;
  /** The plan could not be read: show the problem. */
  onProblem(outcome: LevelOutcome): void;
  /** The run reached its end. Called once per run, with the result of the whole plan (all maps). */
  onFinished(outcome: LevelOutcome, code: string): void;
}

export interface PlayView {
  status: AdventureStatus;
  scene: SceneState;
  frame: PlayerFrame | null;
  /** The outcome of the run on screen, after it has finished. */
  outcome: LevelOutcome | null;
  /** The run on screen is showing another map (a variant), not the main one. */
  onVariant: boolean;
  /** The events of the map on screen, to find where a bump happened. */
  trace: readonly AdvEvent[];
  /** The latest line for the live region. */
  narration: string;
  go(code: string): void;
  step(code: string): void;
  reset(): void;
  setSpeed(speed: Speed): void;
}

/**
 * Runs a plan through Gio's own interpreter (`playLevel`) and plays the trace with `AdventurePlayer`.
 * Nothing the child types is ever run as JavaScript.
 */
export function usePlay(level: Level, mode: AgeModeId, cfg: PlayConfig): PlayView {
  const [status, setStatus] = useState<AdventureStatus>('idle');
  const [frame, setFrame] = useState<PlayerFrame | null>(null);
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);
  const [onVariant, setOnVariant] = useState(false);
  const [narration, setNarration] = useState('');
  const [trace, setTrace] = useState<readonly AdvEvent[]>([]);
  const player = useRef<AdventurePlayer | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const run = useRef<{ code: string; outcome: LevelOutcome; finished: boolean } | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const halt = useCallback(() => {
    stop.current?.();
    stop.current = null;
  }, []);

  const clear = useCallback(() => {
    halt();
    player.current = null;
    run.current = null;
    setStatus('idle');
    setFrame(null);
    setOutcome(null);
    setOnVariant(false);
    setNarration('');
    setTrace([]);
  }, [halt]);

  /** Read the plan and build a player for it. Returns false when the plan has a problem. */
  const prepare = useCallback(
    (code: string): boolean => {
      halt();
      const result = playLevel(level, mode, code);
      if (result.status === 'error') {
        player.current = null;
        run.current = null;
        setStatus('idle');
        setFrame(null);
        setOutcome(null);
        cfgRef.current.onProblem(result);
        return false;
      }
      const playback = pickPlayback(level, result);
      run.current = { code, outcome: result, finished: false };
      setOutcome(null);
      setOnVariant(playback.mapIndex > 0);
      setNarration('');
      setTrace(playback.trace);
      player.current = new AdventurePlayer(
        level,
        playback.map,
        playback.trace,
        {
          onFrame: setFrame,
          onStatus: (s) => {
            setStatus(s);
            if (s !== 'playing') halt();
            const current = run.current;
            if (s === 'done' && current && !current.finished) {
              current.finished = true;
              setOutcome(current.outcome);
              if (current.outcome.status === 'won') haptic('win');
              cfgRef.current.onFinished(current.outcome, current.code);
            }
          },
          onNarrate: setNarration,
          onCue: (cue) => {
            playCue(cue);
            if (cue === 'gem') haptic('snap');
          },
        },
        { speed: cfgRef.current.speed, reducedMotion: cfgRef.current.reducedMotion, loseMessage: playback.loseMessage },
      );
      return true;
    },
    [halt, level, mode],
  );

  const go = useCallback(
    (code: string) => {
      const current = player.current;
      if (current?.status === 'playing') {
        current.pause();
        return;
      }
      // Keep going after a pause. After a finished run, or an edited plan, start again from the top.
      const fresh = !current || current.status === 'done' || run.current?.code !== code;
      if (fresh && !prepare(code)) return;
      const p = player.current!;
      p.setSpeed(cfgRef.current.speed);
      p.setReducedMotion(cfgRef.current.reducedMotion);
      stop.current = runOnFrames(p);
      p.play();
    },
    [prepare],
  );

  const step = useCallback(
    (code: string) => {
      const current = player.current;
      const fresh = !current || current.status === 'done' || run.current?.code !== code;
      if (fresh && !prepare(code)) return;
      const p = player.current!;
      p.setReducedMotion(cfgRef.current.reducedMotion);
      p.step();
    },
    [prepare],
  );

  const setSpeed = useCallback((speed: Speed) => player.current?.setSpeed(speed), []);

  // Leaving the page or the level stops the clock.
  useEffect(() => () => halt(), [halt]);

  return {
    status,
    scene: frame?.scene ?? initialScene(level),
    frame,
    outcome,
    onVariant,
    trace,
    narration,
    go,
    step,
    reset: clear,
    setSpeed,
  };
}
