import { lazy, Suspense, useState } from 'react';
import { PYTHON_OFFLINE_TEXT, type PythonControls } from '../python/usePythonRun';
import { TranslatedCode } from './TranslatedCode';

const PythonEditor = lazy(() => import('../editor/PythonEditor'));

interface PythonPanelProps {
  py: PythonControls;
  logo: string;
  /** The Logo line the turtle is running, for the read-only translation. */
  logoRunningLine: number | null;
  onCopied(): void;
}

const NOTE = 'text-[15px] font-semibold text-ink-2 m-0';

/**
 * The Python tab. Python is the child's own: the translation of their Logo (read-only, always up to date), or a copy they
 * made theirs. Running it uses real Python in a locked box in the browser, and never earns rewards.
 */
export function PythonPanel({ py, logo, logoRunningLine, onCopied }: PythonPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const loading = py.phase === 'loading';

  const status = py.locked ? (
    <div className="px-4 py-3 border-b border-line bg-paper-2">
      <p className={NOTE}>Python runs are for your own drawings. Finish the quest and I will run your Python here.</p>
    </div>
  ) : !py.consented ? (
    <div className="px-4 py-3 border-b border-line bg-paper-2 flex flex-col gap-2">
      <p className={`${NOTE} text-ink`}>
        <strong className="font-extrabold">Real Python lives in your browser.</strong> It downloads about 8 to 13 MB (a grown-up may want Wi-Fi) and needs the internet each time it starts.
        {py.returning && <> You used Python before, so it will download again now.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary min-h-[48px] px-5 text-[16px]" disabled={loading} onClick={() => void py.getReady()}>
          {loading ? 'Getting Python ready…' : 'Get Python ready'}
        </button>
        {py.phase === 'failed' && <p className="m-0 text-[15px] font-bold text-[#b4236b]">{py.failure === PYTHON_OFFLINE_TEXT ? PYTHON_OFFLINE_TEXT : "I couldn't get Python. Check your connection, then try again."}</p>}
      </div>
    </div>
  ) : null;

  const busy = loading && py.consented ? (
    <div className="px-4 py-2 border-b border-line bg-paper-2" aria-live="polite">
      <p className={`${NOTE} flex items-center gap-2`}>
        <span className="inline-flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#12a36b] animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-[#12a36b] animate-pulse [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-[#12a36b] animate-pulse [animation-delay:300ms]" />
        </span>
        Getting real Python ready…
      </p>
    </div>
  ) : null;

  if (py.mine && !py.locked) {
    return (
      <div className="h-full flex flex-col min-h-0">
        {status}
        {busy}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-paper-2 border-b border-line">
          <button type="button" className="btn btn-primary min-h-[48px] px-4 text-[16px]" disabled={py.locked || !py.consented} onClick={() => void py.run()}>
            Run my Python
          </button>
          <p className="m-0 flex-1 min-w-[200px] text-[14px] font-bold text-ink-2">Your Python stays on this device. Share and Save keep your Logo.</p>
        </div>
        {py.tooBig && <p className="m-0 px-4 py-2 text-[14px] font-bold text-[#b4236b]">That is more Python than I can keep on this device, so the last changes are not saved.</p>}
        {py.logoChanged && (
          <div className="px-4 py-2 border-b border-line bg-[#fff8e1] flex flex-wrap items-center gap-2">
            <p className="m-0 flex-1 min-w-[200px] text-[14px] font-bold text-ink-2">Your Logo has changed since you made this Python yours. Nothing was overwritten.</p>
            {confirming ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary min-h-[48px] px-4 text-[15px]"
                  onClick={() => {
                    py.startAgain();
                    setConfirming(false);
                  }}
                >
                  Yes, replace my Python
                </button>
                <button type="button" className="btn btn-quiet min-h-[48px] px-4 text-[15px]" onClick={() => setConfirming(false)}>
                  Keep mine
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-quiet min-h-[48px] px-4 text-[15px]" disabled={!py.generated.ok} onClick={() => setConfirming(true)}>
                Start again from my Logo
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0">
          <Suspense fallback={<p className={`${NOTE} p-4`}>Opening the Python editor…</p>}>
            <PythonEditor ref={py.editorRef} initialCode={py.mine.code} onChange={py.editMine} onRunShortcut={() => void py.run()} />
          </Suspense>
        </div>
        <p className="m-0 px-4 py-2 border-t border-line bg-paper-2 text-[14px] font-semibold text-ink-3">Python can&rsquo;t turn back into Logo.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {status}
      {busy}
      {!py.locked && py.generated.ok && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-paper-2 border-b border-line">
          <button type="button" className="btn btn-primary min-h-[48px] px-4 text-[16px]" disabled={!py.consented} onClick={() => void py.run()}>
            Run this Python
          </button>
          <button type="button" className="btn btn-quiet min-h-[48px] px-4 text-[16px]" onClick={py.makeMine}>
            Make it mine
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <TranslatedCode language="python" logo={logo} runningLine={logoRunningLine} pythonLine={py.active ? py.runningLine : null} onCopied={onCopied} />
      </div>
    </div>
  );
}
