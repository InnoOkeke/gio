import { useRef } from 'react';
import { CloseIcon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { TurtleSprite } from '../components/TurtleSprite';
import type { HintStep } from './hints';
import { useT } from '../lang';

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
  const t = useT();
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
            {t('adv.hint.title')}
          </h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('btn.close')}>
            <CloseIcon />
          </button>
        </div>
        <ol className="adv-hint-list">
          {open.map((h) => (
            <li key={h.step} className="adv-hint-step">
              <span className="eyebrow">
                {t('adv.hint.n', { n: h.step, total: steps.length })}
              </span>
              <p className="adv-hint-text">{h.text}</p>
              {h.trail.length > 0 && <p className="adv-hint-note">{t('adv.hint.trail')}</p>}
            </li>
          ))}
        </ol>
        <div className="adv-hint-actions">
          {last.reveal && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => onInsert(last.reveal!)}>
              {t('adv.hint.put')}
            </button>
          )}
          {canMore && (
            <button type="button" className="btn btn-quiet btn-lg" onClick={onMore}>
              {t('adv.hint.another')}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
