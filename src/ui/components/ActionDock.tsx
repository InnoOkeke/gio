import type { RefObject } from 'react';
import type { PlayerStatus } from '../runtime/player';
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
  const playing = status === 'playing';
  return (
    <nav className="action-dock" aria-label="Actions">
      <button type="button" className={`btn dock-run ${playing ? 'btn-stop' : 'btn-primary'}`} onClick={onRun}>
        {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        {playing ? 'Pause' : status === 'paused' ? 'Keep going' : 'Run'}
      </button>
      <button type="button" className="btn btn-quiet dock-btn" onClick={onStep} disabled={playing}>
        <StepIcon size={22} />
        <span>Step</span>
      </button>
      <button type="button" className="btn btn-quiet dock-btn" onClick={onAsk} aria-label="Ask Gio" aria-haspopup="dialog" aria-expanded={askOpen}>
        <SparkleIcon size={22} />
        <span>Ask</span>
      </button>
      <button ref={stuckRef} type="button" className="btn btn-quiet dock-btn" onClick={onStuck} disabled={stuckDisabled} aria-label="I'm stuck">
        <HelpIcon size={22} className="text-[#e0861a]" />
        <span>Stuck</span>
      </button>
    </nav>
  );
}
