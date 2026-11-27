import { useRef } from 'react';
import { CloseIcon, SpeakerIcon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { describeRows, describeScene } from './describe';
import type { SceneState } from './scene-state';
import { useLang, useT } from '../lang';

interface DescribeSheetProps {
  scene: SceneState;
  /** Read a sentence aloud with the browser's voice. Absent when the browser has none. */
  speak?(text: string, force?: boolean): void;
  onClose(): void;
}

/** "Describe the map": the scene as a table, row by row, with a button that reads it aloud. */
export function DescribeSheet({ scene, speak, onClose }: DescribeSheetProps) {
  const t = useT();
  const { lang } = useLang();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rows = describeRows(scene, lang);
  return (
    <Sheet open variant="dialog" labelledBy="adv-describe-title" onClose={onClose} initialFocus={closeRef} className="sheet-white adv-describe">
      <div className="adv-describe-body" data-sheet-header>
        <div className="adv-hint-head">
          <h2 id="adv-describe-title" className="adv-hint-title">
            {t('adv.describe.title')}
          </h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('btn.close')}>
            <CloseIcon />
          </button>
        </div>
        <p className="adv-hint-text">{describeScene(scene, lang)}</p>
        {speak && (
          <button type="button" className="btn btn-quiet btn-lg" onClick={() => speak(`${describeScene(scene, lang)} ${rows.map((r) => r.spoken).join(' ')}`, true)}>
            <SpeakerIcon size={22} /> {t('adv.describe.read')}
          </button>
        )}
        <div className="adv-describe-scroll">
          <table className="adv-describe-table">
            <caption className="sr-only">{t('adv.describe.caption')}</caption>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.cells.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Sheet>
  );
}
