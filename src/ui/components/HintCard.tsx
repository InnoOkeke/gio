import { useEffect, useRef, useState } from 'react';
import type { Hint } from '../api';
import type { HintLadder, HintStep } from '../tutor/ladder';
import type { TutorError } from '../tutor/useTutor';
import { CloseIcon, HelpIcon, SpeakerIcon } from './icons';

const STEPS: { level: HintStep; label: string }[] = [
  { level: 1, label: 'Think' },
  { level: 2, label: 'Look' },
  { level: 3, label: 'Fix' },
];

interface HintCardProps {
  open: boolean;
  loading: boolean;
  error: TutorError | null;
  notice: string | null;
  ladder: HintLadder | null;
  shown: HintStep;
  /** Little Turtles: bigger words, no code. */
  little: boolean;
  /** The quest's own authored tip, offered when the AI cannot help. */
  questTip?: string;
  canSpeak: boolean;
  onMore(): void;
  onShow(level: HintStep): void;
  onRetry(): void;
  onHear(text: string): void;
  onClose(): void;
}

function Changes({ hint }: { hint: Hint }) {
  if (!hint.changes?.length) return null;
  return (
    <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5" aria-label="What changes">
      {hint.changes.map((c, k) => (
        <li key={k} className="rounded-[14px] bg-white/70 px-3 py-2 font-mono text-[14px] font-bold leading-snug break-words">
          <span className="eyebrow mr-2">Line {c.line}</span>
          {c.was !== null && (
            <span className="block whitespace-pre-wrap break-words text-[#9b2419] line-through decoration-2" aria-label={`was: ${c.was || 'empty line'}`}>
              {c.was || ' '}
            </span>
          )}
          {c.now !== null && (
            <span className="block whitespace-pre-wrap break-words rounded-md bg-[#d3f3e1] px-1 text-[#08603e]" aria-label={`now: ${c.now || 'empty line'}`}>
              {c.now || ' '}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The "I'm stuck" card: one hint at a time, Think, then Look, then Fix. */
export function HintCard({ open, loading, error, notice, ladder, shown, little, questTip, canSpeak, onMore, onShow, onRetry, onHear, onClose }: HintCardProps) {
  const regionRef = useRef<HTMLElement>(null);
  const [tip, setTip] = useState(false);

  // Move focus into the card when it opens, so keyboard and screen reader users land on the hint.
  useEffect(() => {
    if (open) regionRef.current?.focus({ preventScroll: false });
  }, [open]);

  useEffect(() => {
    if (!error) setTip(false);
  }, [error]);

  if (!open) return null;

  const hint = ladder?.hints[shown];
  const last = shown === 3;
  const text = tip && questTip ? questTip : (notice ?? error?.text ?? hint?.text ?? '');
  const showingHint = !tip && !notice && !error && !!hint;
  const textSize = little ? 'text-[20px] font-black leading-snug' : 'text-[17px] font-bold leading-snug';

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      className="hint-card rounded-[24px] border-2 border-[#f2d674] bg-[#fff6d6] p-4 text-[#4a3000] outline-none focus-visible:ring-4 focus-visible:ring-[#ffc93c]"
      aria-label="Help from the turtle"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center gap-2">
        <span className="hint-icon text-[#b86e00] shrink-0" aria-hidden="true">
          <HelpIcon size={26} />
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Hint steps">
          {STEPS.map((s) => {
            const fetched = !!ladder?.hints[s.level];
            const current = showingHint ? shown === s.level : false;
            return (
              <button
                key={s.level}
                type="button"
                className={`hint-chip ${current ? 'hint-chip-on' : ''}`}
                disabled={!fetched}
                aria-current={current ? 'step' : undefined}
                aria-label={`${s.label}, step ${s.level} of 3${fetched ? '' : ', not asked yet'}`}
                onClick={() => onShow(s.level)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-ghost min-h-[48px] min-w-[48px] px-0" onClick={onClose} aria-label="Close hint">
          <CloseIcon />
        </button>
      </div>

      {/* The height is reserved so the page does not jump while the turtle thinks. */}
      <div className="mt-3" style={{ minHeight: little ? 96 : 72 }}>
        {loading ? (
          <p className="m-0 flex items-center gap-2 text-[17px] font-extrabold text-[#8a5200]" role="status">
            <span className="thinking-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Thinking of a hint…
          </p>
        ) : (
          <div key={`${shown}-${text}`} className="hint-text" aria-live="polite">
            <p className={`m-0 ${textSize}`}>{text}</p>
            {showingHint && !little && shown === 3 && hint && <Changes hint={hint} />}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {error ? (
          <>
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={onRetry} disabled={loading}>
              Try again
            </button>
            {questTip && !tip && (
              <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => setTip(true)}>
                Show the quest tip
              </button>
            )}
          </>
        ) : notice ? (
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={onClose}>
            Okay
          </button>
        ) : (
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={last ? onClose : onMore} disabled={loading || !hint}>
            {last ? "I've got it" : 'Show me more'}
          </button>
        )}
        {canSpeak && text && !loading && (
          <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => onHear(text)}>
            <SpeakerIcon /> Hear it
          </button>
        )}
      </div>
    </section>
  );
}
