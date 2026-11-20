import type { RefObject } from 'react';
import type { PlayerStatus } from '../runtime/player';
import { HelpIcon, PauseIcon, PlayIcon, SaveIcon, SparkleIcon, StepIcon } from './icons';

interface ActionDockProps {
  status: PlayerStatus;
  onRun(): void;
  onStep(): void;
  onAsk(): void;
  askOpen: boolean;
  onStuck(): void;
  stuckRef: RefObject<HTMLButtonElement>;
  stuckDisabled: boolean;
  onSave(): void;
  saveDisabled: boolean;
}

/**
 * The thumb-reach action bar for phones in portrait. It calls the same handlers as the buttons in
 * the stage panel, which are not shown on a phone, so nothing is done twice.
 */
export function ActionDock({ status, onRun, onStep, onAsk, askOpen, onStuck, stuckRef, stuckDisabled, onSave, saveDisabled }: ActionDockProps) {
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
      <button type="button" className="btn btn-quiet dock-btn" onClick={onSave} disabled={saveDisabled} aria-label="Save">
        <SaveIcon size={22} />
        <span>Save</span>
      </button>
    </nav>
  );
}
