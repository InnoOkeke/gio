import { useRef } from 'react';
import { GardenContent, type GardenContentProps } from './GardenContent';
import { CloseIcon, LeafIcon } from './icons';
import { Sheet } from './Sheet';
import { useT } from '../lang';
interface GardenSheetProps extends GardenContentProps {
  open: boolean;
  onClose(): void;
}
/** Gio's garden: a bottom sheet on phones, a drawer from the right on tablets (two columns when wide). */
export function GardenSheet({ open, onClose, ...content }: GardenSheetProps) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Sheet open={open} variant="drawer" labelledBy="garden-title" onClose={onClose} initialFocus={closeRef}>
      <div data-sheet-header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 bg-[rgba(245,242,234,0.92)] backdrop-blur-xl border-b border-line">
        <h2 id="garden-title" className="m-0 flex items-center gap-2.5 text-[26px] font-black">
          <LeafIcon size={28} className="text-[#12a36b]" /> {t('garden.title')}
        </h2>
        <button ref={closeRef} type="button" className="btn btn-quiet btn-icon" onClick={onClose} aria-label={t('garden.close')}>
          <CloseIcon />
        </button>
      </div>
      <div className="px-4 py-5 sm:px-6">
        <GardenContent {...content} />
      </div>
    </Sheet>
  );
}
