import { useEffect, useRef } from 'react';
import { CONCEPTS, type Quest } from '../../logo/quests.js';
import type { Badge } from '../progress';
import { useVoice } from '../voice';
import { CheckIcon, CloseIcon, MicIcon, TrophyIcon } from './icons';

interface QuestMapProps {
  open: boolean;
  quests: Quest[];
  completed: string[];
  badges: Badge[];
  showPython: boolean;
  onPick(quest: Quest): void;
  onClose(): void;
}

/** The list of quests, grouped by programming idea, with the badge for each idea. */
export function QuestMap({ open, quests, completed, badges, showPython, onPick, onClose }: QuestMapProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const nextId = quests.find((q) => !completed.includes(q.id))?.id;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="quests-title">
      <div className="absolute inset-0 bg-[rgba(23,38,31,0.35)] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full w-full max-w-[520px] bg-[var(--bg)] shadow-[var(--shadow-3)] overflow-y-auto sheet-in">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-5 bg-[rgba(245,242,234,0.92)] backdrop-blur-xl border-b border-line">
          <h2 id="quests-title" className="m-0 flex items-center gap-2.5 text-[26px] font-black">
            <TrophyIcon size={28} className="text-[#f4a72c]" /> Quests
          </h2>
          <button ref={closeRef} type="button" className="btn btn-quiet btn-icon" onClick={onClose} aria-label="Close quests">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2.5" aria-label="Badges">
            {badges.map((b) => {
              const c = CONCEPTS[b.concept];
              return (
                <div
                  key={b.concept}
                  className={`rounded-[20px] p-3 text-center flex flex-col items-center gap-1 ${b.earned ? 'bg-white shadow-[var(--shadow-2)]' : 'bg-paper-3'}`}
                  title={b.earned ? `${c.badge} badge earned!` : `${b.done} of ${b.total} ${c.name} quests done`}
                >
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ background: b.earned ? c.color : '#d6cebd', boxShadow: b.earned ? `0 4px 0 ${c.color}55` : 'none' }}
                    aria-hidden="true"
                  >
                    {b.earned ? <CheckIcon size={24} /> : <span className="text-[15px] font-black">{b.done}/{b.total}</span>}
                  </span>
                  <span className={`text-[13px] font-black leading-tight ${b.earned ? 'text-ink' : 'text-ink-3'}`}>{c.badge}</span>
                </div>
              );
            })}
          </div>

          {[...new Set(quests.map((q) => q.concept))].map((concept) => {
            const c = CONCEPTS[concept];
            return (
              <section key={concept} className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 text-[18px] font-black" style={{ color: c.color }}>
                    {c.name}
                  </h3>
                  {showPython && <code className="text-[13px] font-mono font-bold text-ink-3">Python: {c.python}</code>}
                </div>
                {quests
                  .filter((q) => q.concept === concept)
                  .map((q) => {
                    const done = completed.includes(q.id);
                    const isNext = q.id === nextId;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => onPick(q)}
                        className={`text-left flex items-center gap-4 rounded-[22px] px-4 py-3.5 border-2 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98] ${
                          isNext ? 'border-[#12a36b] bg-white shadow-[var(--shadow-2)]' : 'border-transparent bg-white/70'
                        }`}
                      >
                        <span
                          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-[16px] font-black"
                          style={{ background: done ? '#12a36b' : isNext ? c.color : '#d6cebd' }}
                          aria-hidden="true"
                        >
                          {done ? <CheckIcon size={20} /> : '★'}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[17px] font-black text-ink">{q.title}</span>
                          <span className="block text-[14px] font-semibold text-ink-2">{q.goal}</span>
                        </span>
                        {isNext && <span className="rounded-full bg-[#e1f7ec] px-2.5 py-1 text-[12px] font-black text-[#08603e]">Next</span>}
                        {done && <span className="sr-only">Done</span>}
                      </button>
                    );
                  })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  done: boolean;
  feedback: string | null;
  onHint(): void;
  onNext(): void;
  onLeave(): void;
  /** Spoken commands during a quest (run, hint, explain...). */
  onVoice(text: string): void;
}

/** Shown above the studio while a quest is active. */
export function QuestCard({ quest, done, feedback, onHint, onNext, onLeave, onVoice }: QuestCardProps) {
  const c = CONCEPTS[quest.concept];
  const voice = useVoice(onVoice);
  return (
    <section className="panel px-5 py-5 sm:px-7 flex flex-col sm:flex-row sm:items-center gap-4" aria-labelledby="quest-title" style={{ borderColor: c.color, borderWidth: 2 }}>
      <span className="w-14 h-14 shrink-0 rounded-[18px] flex items-center justify-center text-white" style={{ background: c.color }} aria-hidden="true">
        {done ? <CheckIcon size={30} /> : <TrophyIcon size={30} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="m-0 eyebrow" style={{ color: c.color }}>
          {c.name} quest
        </p>
        <h2 id="quest-title" className="m-0 text-[22px] font-black leading-tight">
          {quest.title}
        </h2>
        <p className="m-0 mt-0.5 text-[16px] font-semibold text-ink-2">{quest.goal}</p>
        {quest.target && !done && <p className="m-0 mt-1 text-[14px] font-bold text-[#0b6fc2]">Copy the faint blue drawing on the stage.</p>}
        {feedback && <p className={`m-0 mt-2 text-[15px] font-extrabold ${done ? 'text-[#08603e]' : 'text-[#9b2419]'}`}>{feedback}</p>}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {voice.supported && (
          <button
            type="button"
            className={`btn btn-icon bg-[#ffc93c] text-[#5a3b00] shadow-[0_4px_0_#c99a1a] ${voice.listening ? 'mic-live' : ''}`}
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? 'Stop listening' : 'Say a command, like run or hint'}
            title="Say run, hint, explain or step"
          >
            <MicIcon />
          </button>
        )}
        {done ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Next quest
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={onHint}>
            Hint
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onLeave}>
          Leave quest
        </button>
      </div>
    </section>
  );
}
