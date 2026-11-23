import { useRef } from 'react';
import { CloseIcon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { TurtleSprite } from '../components/TurtleSprite';
import type { HintStep } from './hints';

interface HintSheetProps {
  steps: HintStep[];
  /** How many steps the child has opened, from 1. */
  shown: number;
  onMore(): void;
  /** Put the revealed start of the plan into the editor. */
  onInsert(reveal: string): void;
  onClose(): void;
}

/** The hint ladder, one step at a time: a nudge in words, then the path on the map, then the first commands. All from level data. */
export function HintSheet({ steps, shown, onMore, onInsert, onClose }: HintSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = steps.slice(0, Math.max(1, shown));
  const last = open[open.length - 1]!;
  const canMore = shown < steps.length;
  return (
    <Sheet open variant="dialog" labelledBy="adv-hint-title" onClose={onClose} initialFocus={closeRef} className="sheet-white adv-hint">
      <div className="adv-hint-body" data-sheet-header>
        <div className="adv-hint-head">
          <div className="adv-hint-gio" aria-hidden="true">
            <TurtleSprite mood="thinking" />
          </div>
          <h2 id="adv-hint-title" className="adv-hint-title">
            A hint from Gio
          </h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <ol className="adv-hint-list">
          {open.map((h) => (
            <li key={h.step} className="adv-hint-step">
              <span className="eyebrow">
                Hint {h.step} of {steps.length}
              </span>
              <p className="adv-hint-text">{h.text}</p>
              {h.trail.length > 0 && <p className="adv-hint-note">The dotted trail on the map shows the first part of the way.</p>}
            </li>
          ))}
        </ol>
        <div className="adv-hint-actions">
          {last.reveal && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => onInsert(last.reveal!)}>
              Put it in my plan
            </button>
          )}
          {canMore && (
            <button type="button" className="btn btn-quiet btn-lg" onClick={onMore}>
              Another hint
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
