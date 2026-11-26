import { useState } from 'react';
import type { DailyMode } from '../../logo/daily.js';
import { shareDaily, shareText, type DailyResult, type ShareOutcome, type TodaysPuzzle } from '../daily';
import { FUN_TEXT } from '../i18n-fun';
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
  shared: FUN_TEXT.dailyShared,
  copied: FUN_TEXT.dailyCopied,
  failed: FUN_TEXT.dailyShareFailed,
};

/** Today's puzzle: what to draw, and once it is solved, the result to share. Everything here works offline. */
export default function DailyDialog({ today, result, onPlay, onClose }: DailyDialogProps) {
  const [note, setNote] = useState<string | null>(null);
  const share = async () => {
    if (!result) return;
    const outcome = await shareDaily(shareText(today.number, result), window.location.origin);
    setNote(outcome === 'cancelled' ? null : SHARE_MESSAGE[outcome]);
  };
  return (
    <Sheet open variant="sheet" labelledBy="daily-title" onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-2 pt-1 sm:p-5">
        <div className="flex items-center justify-between gap-3" data-sheet-header>
          <div className="min-w-0">
            <p className="m-0 eyebrow" style={{ color: '#44554c' }}>
              {FUN_TEXT.dailyNumber(today.number)}
            </p>
            <h2 id="daily-title" className="m-0 text-[24px] font-black leading-tight">
              {result ? FUN_TEXT.dailySolvedTitle : FUN_TEXT.dailyTitle}
            </h2>
          </div>
          <button type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={onClose} aria-label={FUN_TEXT.dailyClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="daily-body">
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
          {result ? (
            <div className="flex flex-col gap-3">
              <div className="daily-result" role="group" aria-label={`${FUN_TEXT.dailyResult(result.commands)}, ${result.stars} of 3 stars`}>
                <span className="daily-stars" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <StarIcon key={n} size={40} className={n <= result.stars ? 'text-[#f5a700] daily-star' : 'text-[#d3d9dd]'} style={{ animationDelay: `${n * 120}ms` }} />
                  ))}
                </span>
                <span className="text-[20px] font-black">{FUN_TEXT.dailyResult(result.commands)}</span>
              </div>
              <p className="daily-share-text" aria-label={shareText(today.number, result)}>
                {shareText(today.number, result)}
              </p>
              <p className="m-0 text-[15px] font-bold text-ink-2">{FUN_TEXT.dailyShareHelp}</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => void share()}>
                <ShareIcon size={22} /> {FUN_TEXT.dailyShare}
              </button>
              <p className="m-0 min-h-[24px] text-[15px] font-extrabold text-[#08603e]" role="status" aria-live="polite">
                {note}
              </p>
              {result.stars < 3 && <p className="m-0 text-[15px] font-bold text-ink-2">{FUN_TEXT.dailyStarsHelp}</p>}
              <div className="flex flex-wrap gap-2">
                {result.stars < 3 && (
                  <button type="button" className="btn btn-quiet btn-lg" onClick={onPlay}>
                    {FUN_TEXT.dailyPlayAgain}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>
                  {FUN_TEXT.dailyClose}
                </button>
              </div>
              <p className="m-0 text-[15px] font-bold text-ink-2">{FUN_TEXT.dailyTomorrow}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[15px] font-bold text-ink-2">{FUN_TEXT.dailyIntro}</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={onPlay}>
                {FUN_TEXT.dailyPlay}
              </button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
