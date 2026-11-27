import { useRef, useState } from 'react';
import { useT } from '../lang';
import { CloseIcon } from './icons';
import { Sheet } from './Sheet';

interface ShareDialogProps {
  /** The drawing's name. */
  title: string;
  /** The link a friend opens. */
  url: string;
  /** A picture of the drawing (data URL), or null when the stage could not make one. */
  picture: string | null;
  onClose(): void;
}

/** Shows what a friend will see, then lets the child copy the link or use the phone's share menu. */
export default function ShareDialog({ title, url, picture, onClose }: ShareDialogProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
    }
    setCopied(true);
  };

  const share = async () => {
    try {
      await navigator.share({ title: `${title} \u00B7 GIO`, text: t('studio.shareText'), url });
    } catch {
      // Closing the share menu is a choice, not an error.
    }
  };

  return (
    <Sheet open variant="sheet" labelledBy="share-title" onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-1 pt-1 sm:p-5">
        <div className="flex items-center justify-between gap-3" data-sheet-header>
          <h2 id="share-title" className="m-0 text-[24px] font-black">
            {t('share.heading')}
          </h2>
          <button type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={onClose} aria-label={t('btn.close')}>
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          {picture && <img src={picture} alt={t('share.alt')} className="mx-auto block aspect-square w-full max-w-[320px] bg-white" />}
          <div className="border-t border-line px-4 py-3">
            <p className="m-0 text-[18px] font-black">{title}</p>
            <p className="m-0 text-[15px] font-bold text-ink-2">{t('studio.shareText')}</p>
          </div>
        </div>
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label={t('share.link')}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-[14px] border border-line bg-white px-3 py-3 text-[16px] font-bold"
        />
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <button type="button" data-autofocus className="btn btn-primary btn-lg" onClick={() => void copy()}>
            {copied ? t('studio.linkCopied') : t('btn.copy')}
          </button>
          {canShare && (
            <button type="button" className="btn btn-quiet btn-lg" onClick={() => void share()}>
              {t('btn.share')}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}