import { useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MODE_LABEL, type AgeMode } from '../mode';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { useDialog } from '../useDialog';
import { Wordmark } from './GioMark';
import { CloseIcon, GamepadIcon, LeafIcon, MapIcon, PlusIcon, SaveIcon, ShareIcon } from './icons';

export interface StudioHeaderProps {
  /** Phones in portrait: icon buttons, a More menu, and the drawing name on its own row. */
  compact: boolean;
  mode: AgeMode;
  title: string;
  onTitle(value: string): void;
  /** The GIO logo: start a new drawing. */
  onHome(): void;
  onChooseAgain(): void;
  onGarden(): void;
  onMap(): void;
  /** Open Gio's Adventure. */
  onPlay(): void;
  sailed: number;
  islands: number;
  reviewDue: boolean;
  saveLabel: string;
  saveDisabled: boolean;
  onSave(): void;
  sharing: boolean;
  onShare(): void;
  onNew(): void;
}

function TitleInput({ title, onTitle, className }: Pick<StudioHeaderProps, 'title' | 'onTitle'> & { className: string }) {
  return (
    <>
      <label htmlFor="title" className="sr-only">
        Drawing name
      </label>
      <input id="title" value={title} onChange={(e) => onTitle(e.target.value)} maxLength={80} className={className} />
    </>
  );
}

/** Save, Share, New and Switch mode in a bottom sheet, for phones where the header has no room. */
function MoreMenu({ p }: { p: StudioHeaderProps }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = () => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  };
  const pick = (action: () => void) => () => {
    close();
    action();
  };
  return (
    <>
      <button ref={buttonRef} type="button" className="btn btn-quiet px-3 studio-icon-btn" aria-haspopup="dialog" aria-expanded={open} aria-label="More" onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
        </svg>
      </button>
      {/* Portalled: the header's backdrop blur would otherwise trap the fixed sheet inside the header. */}
      {open && createPortal(<MoreSheet p={p} panelRef={panelRef} firstRef={firstRef} titleId={titleId} close={close} pick={pick} />, document.body)}
    </>
  );
}

function MoreSheet({ p, panelRef, firstRef, titleId, close, pick }: { p: StudioHeaderProps; panelRef: RefObject<HTMLDivElement>; firstRef: RefObject<HTMLButtonElement>; titleId: string; close(): void; pick(action: () => void): () => void }) {
  useDialog(panelRef, firstRef, close);
  useSheetDrag(panelRef, close);
  return (
    <>
      <div className="sheet-backdrop save-fade" onClick={close} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bottom-sheet save-panel">
        <div className="bottom-sheet-grip" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-3" data-sheet-header>
          <h2 id={titleId} className="m-0 text-[18px] font-black">
            More
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button ref={firstRef} type="button" className="save-row" onClick={pick(p.onSave)} disabled={p.saveDisabled}>
            <SaveIcon /> <span className="text-[17px] font-black">{p.saveLabel}</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onShare)} disabled={p.sharing}>
            <ShareIcon /> <span className="text-[17px] font-black">Share</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onNew)}>
            <PlusIcon /> <span className="text-[17px] font-black">New drawing</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onChooseAgain)}>
            <span className="text-[17px] font-black">Switch mode ({MODE_LABEL[p.mode]})</span>
          </button>
        </div>
      </div>
    </>
  );
}

/** The studio header. Phones get icon buttons and a More menu, tablets and up get labelled buttons. */
export function StudioHeader(p: StudioHeaderProps) {
  const count = (
    <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[14px] font-black tabular-nums">
      {p.sailed}/{p.islands}
    </span>
  );
  const dot = p.reviewDue && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[#ffc93c] ring-2 ring-white" aria-hidden="true" />;
  const mapLabel = `Quest map, ${p.sailed} of ${p.islands} islands sailed${p.reviewDue ? ', a review is waiting' : ''}`;
  return (
    <>
      <header className="studio-header sticky top-0 z-30 backdrop-blur-xl bg-[rgba(245,242,234,0.82)] border-b border-line">
        <div className="studio-header-bar mx-auto max-w-[1360px] px-4 sm:px-6 flex items-center gap-2 sm:gap-3">
          <a href="/" onClick={(e) => (e.preventDefault(), p.onHome())} aria-label="GIO home" className="studio-logo shrink-0 rounded-2xl">
            <Wordmark />
          </a>
          <div className="flex-1 flex justify-center min-w-0">
            {!p.compact && (
              <TitleInput
                title={p.title}
                onTitle={p.onTitle}
                className="w-full max-w-[320px] min-h-[44px] px-4 rounded-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-line focus:border-line text-center text-[18px] font-extrabold text-ink outline-none transition-colors"
              />
            )}
          </div>
          <div className={`flex items-center ${p.compact ? 'gap-2' : 'gap-1 sm:gap-2'} shrink-0`}>
            {p.compact ? (
              <>
                <button type="button" className="btn btn-quiet px-3 studio-icon-btn" onClick={p.onGarden} aria-label="Gio's garden">
                  <LeafIcon className="text-[#12a36b]" />
                </button>
                <button type="button" className="btn btn-quiet px-3 relative" onClick={p.onMap} aria-label={mapLabel}>
                  <MapIcon className="text-[#0f8fa6]" /> {count}
                  {dot}
                </button>
                <button type="button" className="btn btn-quiet px-3 studio-icon-btn" onClick={p.onPlay} aria-label="Play Gio's Adventure">
                  <GamepadIcon className="text-[#7a4cf0]" />
                </button>
                <MoreMenu p={p} />
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost hidden xl:inline-flex" onClick={p.onChooseAgain} title="Switch age mode">
                  {MODE_LABEL[p.mode]}
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] max-sm:px-3" onClick={p.onGarden} aria-label="Gio's garden">
                  <LeafIcon className="text-[#12a36b]" /> <span className="hidden md:inline">Garden</span>
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] max-sm:px-3 relative" onClick={p.onMap} aria-label={mapLabel}>
                  <MapIcon className="text-[#0f8fa6]" /> <span className="hidden md:inline">Map</span>
                  {count}
                  {dot}
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] max-sm:px-3" onClick={p.onPlay} aria-label="Play Gio's Adventure">
                  <GamepadIcon className="text-[#7a4cf0]" /> <span className="hidden sm:inline">Play</span>
                </button>
                <button type="button" className="btn btn-ghost hidden lg:inline-flex" onClick={p.onNew}>
                  <PlusIcon /> New
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] max-sm:px-3" onClick={p.onSave} disabled={p.saveDisabled} aria-label={p.saveLabel}>
                  <SaveIcon /> <span className="hidden sm:inline">{p.saveLabel}</span>
                </button>
                <button type="button" className="btn btn-primary min-w-[48px] max-sm:px-3" onClick={p.onShare} disabled={p.sharing} aria-label="Share">
                  <ShareIcon /> <span className="hidden sm:inline">Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {p.compact && (
        <div className="studio-title-row">
          <TitleInput
            title={p.title}
            onTitle={p.onTitle}
            className="w-full min-h-[48px] px-4 rounded-full bg-white border border-line text-center text-[18px] font-extrabold text-ink outline-none"
          />
        </div>
      )}
    </>
  );
}
