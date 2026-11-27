import { useState } from 'react';
import type { DailyMode } from '../../logo/daily.js';
import { shareDaily, shareText, type DailyResult, type ShareOutcome, type TodaysPuzzle } from '../daily';
import { pluralIn } from '../../i18n/index.js';
import { useLang, useT } from '../lang';
import { CloseIcon, ShareIcon, StarIcon, TrophyIcon } from './icons';
import { Sheet } from './Sheet';
import { TargetPreview } from './TargetPreview';

interface DailyDialogProps {
  today: TodaysPuzzle;
  mode: DailyMode;
  /** Set once today's puzzle is solved on this device. */
  result: DailyResult | null;
  onPlay(): void;
  onClose(): void;
}

const SHARE_MESSAGE: Record<Exclude<ShareOutcome, 'cancelled'>, string> = {
  shared: 'fun.daily.shared',
  copied: 'fun.daily.copied',
  failed: 'fun.daily.shareFailed',
};

/** Today's puzzle: what to draw, and once it is solved, the result to share. Everything here works offline. */
export default function DailyDialog({ today, result, onPlay, onClose }: DailyDialogProps) {
  const t = useT();
  const { lang } = useLang();
  const [note, setNote] = useState<string | null>(null);
  const share = async () => {
    if (!result) return;
    const outcome = await shareDaily(shareText(today.number, result, lang), window.location.origin);
    setNote(outcome === 'cancelled' ? null : t(SHARE_MESSAGE[outcome]));
  };
  return (
    <Sheet open variant="sheet" labelledBy="daily-title" onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-2 pt-1 sm:p-5">
        <div className="flex items-center justify-between gap-3" data-sheet-header>
          <div className="min-w-0">
            <p className="m-0 eyebrow" style={{ color: '#44554c' }}>
              {result ? `${t('fun.daily.number', { n: today.number })} \u00b7 ${today.puzzle.title}` : t('fun.daily.number', { n: today.number })}
            </p>
            <h2 id="daily-title" className="m-0 text-[24px] font-black leading-tight">
              {result ? t('fun.daily.solvedTitle') : t('fun.daily.title')}
            </h2>
          </div>
          <button type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={onClose} aria-label={t('btn.close')}>
            <CloseIcon />
          </button>
        </div>
        <div className={result ? 'daily-body daily-body-one' : 'daily-body'}>
          {!result && (
            <div className="daily-card">
              <span className="daily-badge" aria-hidden="true">
                <TrophyIcon size={26} />
              </span>
              <div className="min-w-0">
                <h3 className="m-0 text-[20px] font-black leading-tight">{today.puzzle.title}</h3>
                <p className="m-0 mt-1 text-[16px] font-semibold text-ink-2">{today.puzzle.goal}</p>
              </div>
              <TargetPreview quest={today.puzzle} />
            </div>
          )}
          {result ? (
            <div className="flex flex-col gap-3">
              <div className="daily-result" role="group" aria-label={t('fun.daily.resultAria', { commands: pluralIn(lang, 'fun.daily.result', result.commands), stars: result.stars })}>
                <span className="daily-stars" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <StarIcon key={n} size={40} className={n <= result.stars ? 'text-[#f5a700] daily-star' : 'text-[#d3d9dd]'} style={{ animationDelay: `${n * 120}ms` }} />
                  ))}
                </span>
                <span className="text-[20px] font-black">{pluralIn(lang, 'fun.daily.result', result.commands)}</span>
              </div>
              <p className="daily-share-text" aria-label={shareText(today.number, result, lang)}>
                {shareText(today.number, result, lang)}
              </p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => void share()}>
                <ShareIcon size={22} /> {t('fun.daily.share')}
              </button>
              <p className="m-0 min-h-[24px] text-[15px] font-extrabold text-[#08603e]" role="status" aria-live="polite">
                {note}
              </p>
              {result.stars < 3 && <p className="m-0 text-[15px] font-bold text-ink-2">{t('fun.daily.starsHelp')}</p>}
              <div className="flex flex-wrap gap-2">
                {result.stars < 3 && (
                  <button type="button" className="btn btn-quiet btn-lg" onClick={onPlay}>
                    {t('fun.daily.playAgain')}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>
                  {t('btn.close')}
                </button>
              </div>
              <p className="m-0 text-[15px] font-bold text-ink-2">{t('fun.daily.tomorrow')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="daily-intro m-0 text-[15px] font-bold text-ink-2">{t('fun.daily.intro')}</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={onPlay}>
                {t('fun.daily.play')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
