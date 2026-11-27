import { useT } from '../lang';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { CrayonIcon, DownloadIcon, MovieIcon, ShapesIcon, StickerIcon, TrophyIcon } from './icons';

interface ExportMenuProps {
  /** Nothing has been drawn yet. */
  empty: boolean;
  /** Little Turtles get simpler words. */
  little: boolean;
  onPicture(): void;
  onMovie(): void;
  onDrawingFile(): void;
  /** Open the printable colouring page. */
  onColouring(): void;
  /** Make a WhatsApp sticker of the drawing and share or save it. */
  onSticker(): void;
  /** Open today's Daily Turtle Puzzle. */
  onDaily(): void;
  /** Today's puzzle is already solved on this device. */
  dailySolved: boolean;
}

interface Row {
  id: string;
  title: string;
  help: string;
  tile: string;
  icon: ReactNode;
  run(): void;
  /** Works with nothing drawn yet. */
  always?: boolean;
}

/** One "Picture" button that opens the ways to keep a drawing: picture, movie, drawing file and colouring page. */
export function ExportMenu({ empty, little, onPicture, onMovie, onDrawingFile, onColouring, onSticker, onDaily, dailySolved }: ExportMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  /** Tablets: the menu opens above the button, or below it when there is no room above. */
  const [below, setBelow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);
  // A bottom sheet on phones (under 640 px): swipe the handle down to close it.
  useSheetDrag(panelRef, close, open);
  useLayoutEffect(() => {
    if (!open) return setBelow(false);
    const button = buttonRef.current?.getBoundingClientRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (button && panel && window.innerWidth >= 640) setBelow(button.top - panel.height - 10 < 8 && button.bottom + panel.height + 10 <= window.innerHeight);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('.save-row')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      const rows = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button') ?? []).filter((b) => b.offsetParent !== null);
      if (!rows.length) return;
      const at = rows.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Tab') {
        // Keep focus inside the menu while it is open.
        const next = e.shiftKey ? at - 1 : at + 1;
        e.preventDefault();
        rows[(next + rows.length) % rows.length]!.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
        rows[(next + rows.length) % rows.length]!.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const reason = t('export.reason');
  const rows: Row[] = [
    {
      id: 'picture',
      title: t('btn.picture'),
      help: t('export.picture.help'),
      tile: 'bg-[var(--sky-soft)] text-[#0b4f86]',
      icon: <DownloadIcon size={24} />,
      run: onPicture,
    },
    {
      id: 'movie',
      title: t('export.movie.title'),
      help: t('export.movie.help'),
      tile: 'bg-[var(--sun-soft)] text-[#8a5a00]',
      icon: <MovieIcon size={24} />,
      run: onMovie,
    },
    {
      id: 'file',
      title: t('export.file.title'),
      help: little ? t('export.file.helpLittle') : t('export.file.help'),
      tile: 'bg-[var(--green-soft)] text-[var(--green-ink)]',
      icon: <ShapesIcon size={24} />,
      run: onDrawingFile,
    },
    {
      id: 'colouring',
      title: t('fun.colouring.row'),
      help: little ? t('fun.colouring.rowHelpLittle') : t('fun.colouring.rowHelp'),
      tile: 'bg-[#fde7f0] text-[#a3245a]',
      icon: <CrayonIcon size={24} />,
      run: onColouring,
    },
    {
      id: 'sticker',
      title: t('fun.sticker.row'),
      help: little ? t('fun.sticker.rowHelpLittle') : t('fun.sticker.rowHelp'),
      tile: 'bg-[#dcf7e3] text-[#12663a]',
      icon: <StickerIcon size={24} />,
      run: onSticker,
    },
    {
      id: 'daily',
      title: t('fun.daily.row'),
      help: dailySolved ? t('fun.daily.rowSolved') : little ? t('fun.daily.rowHelpLittle') : t('fun.daily.rowHelp'),
      tile: 'bg-[#ece6ff] text-[#5b36c4]',
      icon: <TrophyIcon size={24} />,
      run: onDaily,
      always: true,
    },
  ];

  const pick = (row: Row) => {
    if (empty && !row.always) return;
    close();
    row.run();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-quiet min-h-[48px]"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <DownloadIcon /> <span className="export-label">{t('btn.picture')}</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(23,38,31,0.35)] sm:bg-transparent save-fade"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`z-50 bg-[var(--surface)] shadow-[var(--shadow-3)] border border-line p-2
              max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-[28px] max-sm:rounded-b-none max-sm:pb-[max(16px,env(safe-area-inset-bottom))] save-panel
              sm:absolute sm:right-0 ${below ? 'sm:top-[calc(100%+10px)]' : 'sm:bottom-[calc(100%+10px)]'} sm:w-[340px] sm:rounded-[24px]`}
          >
            <div className="sm:hidden flex justify-center pt-1 pb-2" data-sheet-grab aria-hidden="true">
              <span className="h-[5px] w-10 rounded-full bg-[var(--line-strong)]" />
            </div>
            <div className="mb-2 flex items-center justify-between gap-2" data-sheet-header>
              <h2 id={titleId} className="m-0 px-3 pt-1 pb-1 text-[15px] font-black text-ink-2">
                {t('export.save')}
              </h2>
              <button type="button" className="btn btn-quiet min-h-[48px]" onClick={close}>
                {t('btn.close')}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="save-row"
                  aria-disabled={empty && !row.always}
                  onClick={() => pick(row)}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${row.tile}`}>{row.icon}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[17px] font-black leading-tight">{row.title}</span>
                    <span className="text-[14px] font-semibold leading-tight text-ink-2">{empty && !row.always ? reason : row.help}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
