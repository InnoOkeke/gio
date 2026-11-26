import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { TurtleEvent } from '../../logo/index.js';
import { toSVG } from '../export/svg';
import { FUN_TEXT } from '../i18n-fun';
import { CloseIcon, PrintIcon } from './icons';
import { Sheet } from './Sheet';

interface ColouringDialogProps {
  events: readonly TurtleEvent[];
  /** The drawing's name, printed at the top of the page. */
  title: string;
  onClose(): void;
}

/**
 * Shows the drawing as a colouring sheet (black lines, no fill colour) and prints it on one page.
 * The printed page is a separate element on <body>; while this dialog is open, print CSS hides everything else.
 */
export default function ColouringDialog({ events, title, onClose }: ColouringDialogProps) {
  const src = useMemo(() => {
    const svg = toSVG(events, { title, outline: true });
    return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
  }, [events, title]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset['print'] = 'colouring';
    return () => {
      delete root.dataset['print'];
    };
  }, []);

  return (
    <>
      <Sheet open variant="sheet" labelledBy="colouring-title" onClose={onClose}>
        <div className="flex flex-col gap-4 px-5 pb-1 pt-1 sm:p-5">
          <div className="flex items-center justify-between gap-3" data-sheet-header>
            <h2 id="colouring-title" className="m-0 text-[24px] font-black">
              {FUN_TEXT.colouringTitle}
            </h2>
            <button type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={onClose} aria-label={FUN_TEXT.colouringClose}>
              <CloseIcon />
            </button>
          </div>
          {src ? (
            <div className="colouring-body">
              <div className="colouring-preview">
                <p className="colouring-preview-title">{title}</p>
                <img src={src} alt={FUN_TEXT.colouringPreviewAlt(title)} className="colouring-preview-art" />
              </div>
              <div className="flex flex-col gap-4">
                <p className="m-0 text-[15px] font-bold text-ink-2">{FUN_TEXT.colouringIntro}</p>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => window.print()}>
                  <PrintIcon size={22} /> {FUN_TEXT.colouringPrint}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="m-0 text-[17px] font-bold text-ink-2" role="alert">
                {FUN_TEXT.colouringNothing}
              </p>
              <button type="button" className="btn btn-quiet btn-lg" onClick={onClose}>
                {FUN_TEXT.colouringClose}
              </button>
            </>
          )}
        </div>
      </Sheet>
      {src &&
        createPortal(
          <div className="colouring-print" aria-hidden="true">
            <h1 className="colouring-print-title">{title}</h1>
            <img src={src} alt="" className="colouring-print-art" />
            <p className="colouring-print-footer">{FUN_TEXT.colouringFooter}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
