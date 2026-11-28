import type { RefObject } from 'react';
import type { PlayerStatus } from '../runtime/player';
import { useT } from '../lang';
import { HelpIcon, PauseIcon, PlayIcon, SparkleIcon, StepIcon } from './icons';

interface ActionDockProps {
  status: PlayerStatus;
  onRun(): void;
  onStep(): void;
  onAsk(): void;
  askOpen: boolean;
  onStuck(): void;
  stuckRef: RefObject<HTMLButtonElement>;
  stuckDisabled: boolean;
}

/**
 * The thumb-reach action bar for phones in portrait. It calls the same handlers as the buttons in
 * the stage panel, which are not shown on a phone, so nothing is done twice. Save is not here: the
 * stage panel keeps its Save menu for pictures and movies, and the project Save is in the header's More sheet.
 */
export function ActionDock({ status, onRun, onStep, onAsk, askOpen, onStuck, stuckRef, stuckDisabled }: ActionDockProps) {
  const t = useT();
  const playing = status === 'playing';
  return (
    <nav className="action-dock" aria-label={t('nav.actions')}>
      <button type="button" data-run className={`btn dock-run ${playing ? 'btn-stop' : 'btn-primary'}`} onClick={onRun}>
        {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        {playing ? t('btn.pause') : status === 'paused' ? t('btn.keepGoing') : t('btn.run')}
      </button>
      <button type="button" className="btn btn-quiet dock-btn" onClick={onStep} disabled={playing}>
        <StepIcon size={22} />
        <span>{t('btn.step')}</span>
      </button>
      <button type="button" className="btn btn-quiet dock-btn" onClick={onAsk} aria-label={t('tutor.askGio')} aria-haspopup="dialog" aria-expanded={askOpen}>
        <SparkleIcon size={22} />
        <span>{t('btn.ask')}</span>
      </button>
      <button ref={stuckRef} type="button" className="btn btn-quiet dock-btn" onClick={onStuck} disabled={stuckDisabled} aria-label={t('tutor.stuckAria')}>
        <HelpIcon size={22} className="text-[#e0861a]" />
        <span>{t('btn.stuck')}</span>
      </button>
    </nav>
  );
}
