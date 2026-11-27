import { useEffect, useRef, useState } from 'react';
import type { Hint } from '../api';
import type { HintLadder, HintStep } from '../tutor/ladder';
import type { TutorError } from '../tutor/useTutor';
import { useT } from '../lang';
import { CloseIcon, HelpIcon, SpeakerIcon } from './icons';

const STEPS: { level: HintStep; key: string }[] = [
  { level: 1, key: 'tutor.step.think' },
  { level: 2, key: 'tutor.step.look' },
  { level: 3, key: 'tutor.step.fix' },
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
  const t = useT();
  if (!hint.changes?.length) return null;
  return (
    <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5" aria-label={t('tutor.whatChanges')}>
      {hint.changes.map((c, k) => (
        <li key={k} className="rounded-[14px] bg-white/70 px-3 py-2 font-mono text-[14px] font-bold leading-snug break-words">
          <span className="eyebrow mr-2">{t('tutor.line', { line: c.line })}</span>
          {c.was !== null && (
            <span className="block whitespace-pre-wrap break-words text-[#9b2419] line-through decoration-2" aria-label={t('tutor.was', { text: c.was || t('tutor.emptyLine') })}>
              {c.was || ' '}
            </span>
          )}
          {c.now !== null && (
            <span className="block whitespace-pre-wrap break-words rounded-md bg-[#d3f3e1] px-1 text-[#08603e]" aria-label={t('tutor.now', { text: c.now || t('tutor.emptyLine') })}>
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
  const t = useT();
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
      aria-label={t('tutor.helpFromTurtle')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center gap-2">
        <span className="hint-icon text-[#b86e00] shrink-0" aria-hidden="true">
          <HelpIcon size={26} />
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label={t('tutor.hintSteps')}>
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
                aria-label={t('tutor.stepAria', { label: t(s.key), n: s.level }) + (fetched ? '' : t('tutor.notAsked'))}
                onClick={() => onShow(s.level)}
              >
                {t(s.key)}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-ghost min-h-[48px] min-w-[48px] px-0" onClick={onClose} aria-label={t('tutor.closeHint')}>
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
            {t('tutor.thinkingHint')}
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
              {t('tutor.tryAgain')}
            </button>
            {questTip && !tip && (
              <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => setTip(true)}>
                {t('tutor.showQuestTip')}
              </button>
            )}
          </>
        ) : notice ? (
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={onClose}>
            {t('tutor.okay')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={last ? onClose : onMore} disabled={loading || !hint}>
            {last ? t('tutor.gotIt') : t('tutor.showMore')}
          </button>
        )}
        {canSpeak && text && !loading && (
          <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => onHear(text)}>
            <SpeakerIcon /> {t('tutor.hearIt')}
          </button>
        )}
      </div>
    </section>
  );
}
