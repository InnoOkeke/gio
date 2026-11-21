import { useCallback, useEffect, useRef, useState } from 'react';
import type { TurtleEvent } from '../../logo/index.js';
import { encodeGif } from '../export/gif';
import { planReplay, renderReplayFrames, REPLAY_LIMITS } from '../export/replay';
import { CloseIcon, DownloadIcon } from './icons';
import { Sheet } from './Sheet';
import { TurtleSprite } from './TurtleSprite';

interface ReplayDialogProps {
  events: readonly TurtleEvent[];
  background: string;
  /** The drawing's name, used for the file and the share sheet. */
  title: string;
  /** File name ending in .gif. */
  fileName: string;
  onSaved(): void;
  onClose(): void;
}

const SIZE = 400;

type Phase =
  | { kind: 'working'; progress: number }
  | { kind: 'done'; blob: Blob; file: File; preview: string }
  | { kind: 'error'; message: string };

function readableSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the movie.'));
    reader.readAsDataURL(blob);
  });
}

/** Makes the "watch me draw" movie on this device and offers to save or share it. */
export default function ReplayDialog({ events, background, title, fileName, onSaved, onClose }: ReplayDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'working', progress: 0 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setPhase({ kind: 'working', progress: 0 });
    const frames = planReplay(events, REPLAY_LIMITS);
    if (frames.length === 0) {
      setPhase({ kind: 'error', message: 'There is nothing to put in a movie yet. Draw something first.' });
      return;
    }
    void (async () => {
      try {
        const blob = await encodeGif({
          frames: renderReplayFrames(events, background, SIZE, frames),
          total: frames.length,
          size: SIZE,
          signal: controller.signal,
          onProgress: (progress) => setPhase({ kind: 'working', progress }),
        });
        const preview = await toDataUrl(blob);
        if (controller.signal.aborted) return;
        setPhase({ kind: 'done', blob, file: new File([blob], fileName, { type: 'image/gif' }), preview });
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
        setPhase({ kind: 'error', message: 'The movie did not work this time. Let\u2019s try again.' });
      }
    })();
    return () => controller.abort();
  }, [events, background, fileName, attempt]);

  // Move focus to the first button whenever the content changes (cancel, then save, or try again).
  const kind = phase.kind;
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [kind]);

  const save = useCallback(() => {
    if (phase.kind !== 'done') return;
    const url = URL.createObjectURL(phase.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    onSaved();
  }, [phase, fileName, onSaved]);

  const share = useCallback(async () => {
    if (phase.kind !== 'done') return;
    try {
      await navigator.share({ files: [phase.file], title });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setPhase({ kind: 'error', message: 'Sharing did not work. You can still save the movie.' });
      }
    }
  }, [phase, title]);

  const canShare = phase.kind === 'done' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [phase.file] });
  const percent = phase.kind === 'working' ? Math.min(100, Math.round(phase.progress * 100)) : 100;

  return (
    <Sheet open variant="sheet" labelledBy="replay-title" onClose={onClose}>
      {/* The same height in every phase, so the panel does not jump when the movie is ready. */}
      <div ref={panelRef} className="replay-body flex flex-col gap-4 px-5 pb-1 pt-1 sm:p-5">
        <div className="flex items-center justify-between gap-3" data-sheet-header>
          <h2 id="replay-title" className="m-0 text-[24px] font-black">
            {phase.kind === 'done' ? 'Your movie is ready!' : phase.kind === 'error' ? 'Oh no' : 'Making your movie'}
          </h2>
          <button type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {phase.kind === 'working' && (
          <>
            <div className="relative pt-11" role="progressbar" aria-label="Making your movie" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="crawl-track">
                <div className="crawl-fill" style={{ width: `${percent}%` }} />
                <div className="crawl-gio" style={{ left: `${percent}%` }}>
                  <div className="turtle is-moving">
                    <TurtleSprite mood="happy" />
                  </div>
                </div>
              </div>
            </div>
            <p className="m-0 text-[17px] font-bold text-ink-2" role="status" aria-live="polite">
              Making your movie&hellip; {percent}%
            </p>
            <button type="button" data-autofocus className="btn btn-quiet btn-lg" onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {phase.kind === 'done' && (
          <>
            <img
              src={phase.preview}
              alt="Your drawing being drawn, as a moving picture"
              width={SIZE}
              height={SIZE}
              className="mx-auto aspect-square w-full max-w-[400px] rounded-[20px] border border-line bg-white"
            />
            <p className="m-0 text-center text-[15px] font-bold text-ink-2">
              {readableSize(phase.blob.size)}. It plays again and again.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" data-autofocus className="btn btn-primary btn-lg" onClick={save}>
                <DownloadIcon size={22} /> Save movie
              </button>
              {canShare && (
                <button type="button" className="btn btn-quiet btn-lg" onClick={() => void share()}>
                  Share
                </button>
              )}
            </div>
          </>
        )}

        {phase.kind === 'error' && (
          <>
            <p className="m-0 text-[17px] font-bold text-ink-2" role="alert">
              {phase.message}
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" data-autofocus className="btn btn-primary btn-lg" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
