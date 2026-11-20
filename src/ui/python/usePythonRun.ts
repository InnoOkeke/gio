import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { check, DEFAULT_BACKGROUND, INITIAL_STATE, toText, translate, type GameKey, type RunResult, type TurtleEvent } from '../../logo/index.js';
import type { StageHandle } from '../components/Stage';
import type { BubbleMessage } from '../components/TurtleBubble';
import type { PythonEditorHandle } from '../editor/PythonEditor';
import { deletePythonDoc, readPythonDoc, writePythonDoc, MAX_ENTRY_CHARS, type PythonDoc } from './doc';
import type { PythonResult } from './protocol';
import { PythonRuntime, PYTHON_READY_KEY } from './runtime';

export type PythonPhase = 'idle' | 'loading' | 'ready' | 'failed';

export type GeneratedPython = { ok: true; text: string } | { ok: false; reason: 'empty' | 'problem'; line?: number };

interface Options {
  stageRef: RefObject<StageHandle>;
  /** The Logo the child is working on. */
  logo: string;
  /** "draft" or the project's slug: where the child's own Python is kept on this device. */
  docKey: string;
  /** A quest is open: Python can be read but not run or changed. */
  locked: boolean;
  setBubble(message: BubbleMessage): void;
  /** A Python run is starting: the page ends any Logo game, forgets Logo rewards for this run and clears printed lines. */
  onStart(): void;
}

const DROPPED_TEXT = 'Some of what your Python drew could not be shown.';
function rememberedReady(): boolean {
  try {
    return localStorage.getItem(PYTHON_READY_KEY) === '1';
  } catch {
    return false;
  }
}

function resultFor(events: TurtleEvent[]): RunResult {
  let background = DEFAULT_BACKGROUND;
  for (const e of events) if (e.type === 'background') background = e.color;
  return { events, final: events.length ? events[events.length - 1]!.state : { ...INITIAL_STATE }, background };
}

/** The last line of a Python message is the part a child can use, so keep that and say where it happened. */
function plainProblem(message: string, line: number): string {
  const last = message.trim().split('\n').pop() ?? message;
  return line > 0 ? `Python found a problem on line ${line}: ${last}` : `Python found a problem: ${last}`;
}

/**
 * Everything the Python tab needs for one drawing: the child's own Python (kept only on this device), the sandboxed
 * engine, running it on the stage, and game keys. Python runs never earn rewards or finish quests.
 */
export function usePythonRun({ stageRef, logo, docKey, locked, setBubble, onStart }: Options) {
  const [mine, setMine] = useState<PythonDoc | null>(() => readPythonDoc(docKey));
  const [phase, setPhase] = useState<PythonPhase>('idle');
  const [consented, setConsented] = useState(rememberedReady);
  const [failure, setFailure] = useState<string | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [active, setActive] = useState(false);
  const [gameKeys, setGameKeys] = useState<GameKey[]>([]);
  const [runningLine, setRunningLineState] = useState<number | null>(null);
  const [problemLine, setProblemLineState] = useState<number | null>(null);
  const activeRef = useRef(false);
  const pressingRef = useRef(false);
  const hadProblemRef = useRef(false);
  const editorRef = useRef<PythonEditorHandle>(null);
  const runtimeRef = useRef<PythonRuntime | null>(null);
  const mineRef = useRef(mine);
  mineRef.current = mine;
  const keyRef = useRef(docKey);
  const saveTimer = useRef<number | null>(null);
  const optionsRef = useRef({ setBubble, onStart });
  optionsRef.current = { setBubble, onStart };

  const generated = useMemo((): GeneratedPython => {
    if (!logo.trim()) return { ok: false, reason: 'empty' };
    const parsed = check(logo);
    if (!parsed.ok) return { ok: false, reason: 'problem', line: parsed.problem.line };
    return { ok: true, text: toText(translate(parsed.program, logo, 'python')) };
  }, [logo]);

  // The child's Python belongs to one drawing. A first save moves the draft's Python to the new project.
  useEffect(() => {
    const previous = keyRef.current;
    if (previous === docKey) return;
    keyRef.current = docKey;
    const current = mineRef.current;
    if (previous === 'draft' && current) {
      writePythonDoc(docKey, current);
      deletePythonDoc('draft');
      return;
    }
    setMine(readPythonDoc(docKey));
  }, [docKey]);

  const runtime = useCallback((): PythonRuntime => {
    if (!runtimeRef.current) {
      runtimeRef.current = new PythonRuntime({
        pending: () => stageRef.current?.pending() ?? 0,
        onAsync: (result) => afterEvents(result),
      });
    }
    return runtimeRef.current;
    // afterEvents only uses refs, so the runtime can keep the first copy.
  }, [stageRef]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current ?? undefined);
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    },
    [],
  );

  const setLine = useCallback((line: number | null) => {
    editorRef.current?.setRunningLine(line);
    setRunningLineState(line);
  }, []);

  const clearProblem = useCallback(() => {
    editorRef.current?.setProblemLine(null);
    setProblemLineState(null);
  }, []);

  const reportProblem = useCallback((result: PythonResult) => {
    if (!result.error) return;
    hadProblemRef.current = true;
    optionsRef.current.setBubble({ kind: 'problem', text: plainProblem(result.error.message, result.error.line) });
    if (result.error.line > 0) {
      editorRef.current?.setProblemLine(result.error.line);
      setProblemLineState(result.error.line);
    }
  }, []);

  /** Events that come from a key press or a game timer go straight to the stage. */
  function afterEvents(result: PythonResult): void {
    if (!activeRef.current) return;
    if (result.dropped) {
      hadProblemRef.current = true;
      optionsRef.current.setBubble({ kind: 'info', text: DROPPED_TEXT });
    }
    if (result.events.length) {
      pressingRef.current = true;
      stageRef.current?.appendEvents(result.events);
    }
    setGameKeys(result.keys);
    reportProblem(result);
  }

  /** The child said yes to the download (or had before): load Python and remember it. */
  const getReady = useCallback(async (): Promise<boolean> => {
    setFailure(null);
    setPhase('loading');
    try {
      await runtime().ensureReady();
      setConsented(true);
      setPhase('ready');
      return true;
    } catch (error) {
      setPhase('failed');
      setFailure(error instanceof Error ? error.message : 'Python could not start.');
      return false;
    }
  }, [runtime]);

  /** The Python that Run runs: the child's own if they made it theirs, otherwise the translation of the Logo. */
  const source = useCallback((): string | null => {
    if (mineRef.current) return mineRef.current.code;
    return generated.ok ? generated.text : null;
  }, [generated]);

  const run = useCallback(
    async (step = false): Promise<void> => {
      if (locked) return;
      const code = source();
      if (code === null || !code.trim()) {
        optionsRef.current.setBubble({
          kind: 'info',
          text: generated.ok === false && generated.reason === 'problem' ? 'Fix the Logo first, then I can run it as Python.' : 'There is no Python to run yet. Write some Logo or make the Python yours.',
        });
        return;
      }
      if (!consented) {
        optionsRef.current.setBubble({ kind: 'info', text: 'Tap Get Python ready first. Then I can run your Python.' });
        return;
      }
      // A Python run is not a Logo run: nothing it does can earn a sticker, a star or a quest.
      optionsRef.current.onStart();
      activeRef.current = true;
      setActive(true);
      pressingRef.current = false;
      hadProblemRef.current = false;
      setGameKeys([]);
      clearProblem();
      setLine(null);
      stageRef.current?.reset();
      if (!runtime().isReady()) {
        optionsRef.current.setBubble({ kind: 'info', text: 'Getting real Python ready…' });
        if (!(await getReady())) {
          optionsRef.current.setBubble({ kind: 'problem', text: "I couldn't get Python ready. Check your connection and try again." });
          activeRef.current = false;
          setActive(false);
          return;
        }
      }
      const result = await runtime().run(code);
      if (!activeRef.current) return;
      setGameKeys(result.keys);
      if (result.dropped) hadProblemRef.current = true;
      const keyed = result.keys.length > 0 || result.ticks.length > 0;
      if (!result.events.length) {
        if (result.error) reportProblem(result);
        else if (result.dropped) optionsRef.current.setBubble({ kind: 'info', text: DROPPED_TEXT });
        else optionsRef.current.setBubble({ kind: 'info', text: keyed ? 'Game on! Press the arrow keys to play.' : 'That Python made no drawing. Add a command like forward(100), then run it.' });
        return;
      }
      stageRef.current?.load(resultFor(result.events));
      if (result.error) reportProblem(result);
      else if (result.dropped) optionsRef.current.setBubble({ kind: 'info', text: DROPPED_TEXT });
      else optionsRef.current.setBubble({ kind: 'info', text: keyed ? 'Game on! Press the arrow keys to play.' : 'Running your Python. This is real Python, in your browser!' });
      if (step) stageRef.current?.step();
      else stageRef.current?.play();
    },
    [locked, source, generated, consented, runtime, getReady, stageRef, clearProblem, setLine, reportProblem],
  );

  const pressKey = useCallback(
    async (key: GameKey): Promise<void> => {
      if (!activeRef.current || key === 'TICK') return;
      const result = await runtime().press(key);
      afterEvents(result);
    },
    [runtime],
  );

  /** Called by the page when the stage's playback status changes. Returns true when a Python run handled it. */
  const handleStatus = useCallback((status: string): boolean => {
    if (!activeRef.current) return false;
    if (status === 'done') {
      setLine(null);
      if (!pressingRef.current && !hadProblemRef.current) optionsRef.current.setBubble({ kind: 'success', text: 'That was real Python, running in your browser!' });
    }
    return true;
  }, [setLine]);

  /** A Logo run, Reset or New starts: forget game timers and keys, keep Python loaded. */
  const release = useCallback(() => {
    runtimeRef.current?.release();
    activeRef.current = false;
    pressingRef.current = false;
    setActive(false);
    setGameKeys([]);
    setLine(null);
    clearProblem();
  }, [setLine, clearProblem]);

  /** Reset or New: stop Python completely, so a loop that never ends is gone too. */
  const stop = useCallback(() => {
    // A busy Python is thrown away (it may be in a loop that never ends); an idle one is kept loaded.
    if (runtimeRef.current?.busy()) runtimeRef.current.stop();
    release();
  }, [release]);

  /* ---- the child's own Python ---- */

  const persist = useCallback((doc: PythonDoc) => {
    window.clearTimeout(saveTimer.current ?? undefined);
    saveTimer.current = window.setTimeout(() => {
      setTooBig(!writePythonDoc(keyRef.current, doc));
    }, 400);
  }, []);

  const makeMine = useCallback(() => {
    if (!generated.ok || locked) return;
    const doc = { code: generated.text, forkedFrom: logo };
    setTooBig(!writePythonDoc(keyRef.current, doc));
    setMine(doc);
  }, [generated, logo, locked]);

  const editMine = useCallback(
    (code: string) => {
      const next = { code, forkedFrom: mineRef.current?.forkedFrom ?? '' };
      mineRef.current = next;
      setMine(next);
      setTooBig(code.length > MAX_ENTRY_CHARS);
      persist(next);
    },
    [persist],
  );

  /** "Start again from my Logo": the Python is replaced by a fresh translation. */
  const startAgain = useCallback(() => {
    if (!generated.ok) return;
    const doc = { code: generated.text, forkedFrom: logo };
    setTooBig(!writePythonDoc(keyRef.current, doc));
    mineRef.current = doc;
    setMine(doc);
    editorRef.current?.replaceAll(doc.code);
  }, [generated, logo]);

  const logoChanged = mine !== null && mine.forkedFrom !== logo;

  return {
    editorRef,
    mine,
    generated,
    phase,
    failure,
    consented,
    tooBig,
    logoChanged,
    locked,
    /** True while the stage is showing a Python run. */
    active,
    activeRef,
    gameKeys,
    runningLine,
    problemLine,
    getReady,
    run,
    pressKey,
    handleStatus,
    setLine,
    release,
    stop,
    makeMine,
    editMine,
    startAgain,
  };
}

export type PythonControls = ReturnType<typeof usePythonRun>;
