import { useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { AgeMode } from '../mode';
import { LANGS } from '../../i18n/index.js';
import { useLang, useT } from '../lang';
import { Wordmark } from './GioMark';
import { LanguageButton, LanguageSheet } from './LanguageButton';
import { Sheet } from './Sheet';
import { CloseIcon, GamepadIcon, LeafIcon, MapIcon, PlusIcon, SaveIcon, ShareIcon, SparkleIcon } from './icons';

export interface StudioHeaderProps {
  /** Phones in portrait: icon buttons, a More menu, and the drawing name on its own row. */
  compact: boolean;
  /** Phones in landscape (600px+ wide, <=500px tall): compact controls with Ask Gio in the bar. */
  shortLandscape: boolean;
  showAsk?: boolean;
  askOpen?: boolean;
  onToggleAsk?(): void;
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
  const t = useT();
  return (
    <>
      <label htmlFor="title" className="sr-only">
        {t('studio.titleLabel')}
      </label>
      <input id="title" value={title} onChange={(e) => onTitle(e.target.value)} maxLength={80} className={className} />
    </>
  );
}

/** Save, Share, New, Language and Switch mode in a sheet, when the header hides secondary actions. */
function MoreMenu({ p, className = '' }: { p: StudioHeaderProps; className?: string }) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const t = useT();
  const buttonRef = useRef<HTMLButtonElement>(null);
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
      <button ref={buttonRef} type="button" className={`btn btn-quiet px-3 studio-icon-btn ${className}`} aria-haspopup="dialog" aria-expanded={open} aria-label={t('btn.more')} onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
        </svg>
      </button>
      {/* Portalled: the header's backdrop blur would otherwise trap the fixed sheet inside the header. */}
      {open && createPortal(<MoreSheet p={p} firstRef={firstRef} titleId={titleId} close={close} pick={pick} onLanguage={() => setLangOpen(true)} />, document.body)}
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

function MoreSheet({ p, firstRef, titleId, close, pick, onLanguage }: { p: StudioHeaderProps; firstRef: RefObject<HTMLButtonElement>; titleId: string; close(): void; pick(action: () => void): () => void; onLanguage(): void }) {
  const t = useT();
  const { lang } = useLang();
  const langName = LANGS.find((l) => l.id === lang)!.name;
  return (
    <Sheet open variant="sheet" labelledBy={titleId} onClose={close} initialFocus={firstRef} className="bottom-sheet save-panel">
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between gap-3 px-2" data-sheet-header>
          <h2 id={titleId} className="m-0 text-[18px] font-black">
            {t('btn.more')}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon min-h-[48px] min-w-[48px]" onClick={close} aria-label={t('btn.close')}>
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button ref={firstRef} type="button" className="save-row" onClick={pick(p.onSave)} disabled={p.saveDisabled}>
            <SaveIcon /> <span className="text-[17px] font-black">{p.saveLabel}</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onShare)} disabled={p.sharing}>
            <ShareIcon /> <span className="text-[17px] font-black">{t('btn.share')}</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onNew)}>
            <PlusIcon /> <span className="text-[17px] font-black">{t('btn.newDrawing')}</span>
          </button>
          <button type="button" className="save-row" onClick={pick(p.onChooseAgain)}>
            <span className="text-[17px] font-black">{t('more.switchMode', { mode: t(`mode.${p.mode}`) })}</span>
          </button>
          <button type="button" className="save-row" data-lang-button onClick={pick(onLanguage)}>
            <span className="text-[17px] font-black">{t('lang.button', { name: langName })}</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** The studio header. Phones get icon buttons and a More menu, tablets and up get labelled buttons. */
export function StudioHeader(p: StudioHeaderProps) {
  const t = useT();
  const count = (
    <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[14px] font-black tabular-nums">
      {p.sailed}/{p.islands}
    </span>
  );
  const dot = p.reviewDue && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[#ffc93c] ring-2 ring-white" aria-hidden="true" />;
  const mapLabel = t('studio.map.aria', { sailed: p.sailed, islands: p.islands }) + (p.reviewDue ? t('studio.map.review') : '');
  return (
    <>
      <header className="studio-header sticky top-0 z-30 backdrop-blur-xl bg-[rgba(245,242,234,0.82)] border-b border-line">
        <div className="studio-header-bar mx-auto max-w-[1360px] px-3 medium:px-6 flex items-center gap-2 medium:gap-3">
          <a href="/" onClick={(e) => (e.preventDefault(), p.onHome())} aria-label={t('nav.home')} className="studio-logo shrink-0 rounded-2xl">
            <Wordmark />
          </a>
          <div className="flex-1 flex justify-center min-w-0">
            {!p.compact && (
              <TitleInput
                title={p.title}
                onTitle={p.onTitle}
                className="w-full min-w-[64px] max-w-[320px] min-h-[44px] px-3 medium:px-4 rounded-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-line focus:border-line text-center text-[18px] font-extrabold text-ink outline-none transition-colors"
              />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {p.compact ? (
              <>
                <button type="button" className="btn btn-quiet px-3 studio-icon-btn" onClick={p.onGarden} aria-label={t('nav.garden.aria')}>
                  <LeafIcon className="text-[#12a36b]" />
                </button>
                <button type="button" className="btn btn-quiet px-3 relative" onClick={p.onMap} aria-label={mapLabel}>
                  <MapIcon className="text-[#0f8fa6]" /> {count}
                  {dot}
                </button>
                <button type="button" className="btn btn-quiet px-3 studio-icon-btn" onClick={p.onPlay} aria-label={t('nav.play.aria')}>
                  <GamepadIcon className="text-[#7a4cf0]" />
                </button>
                <MoreMenu p={p} />
              </>
            ) : (
              <>
                {p.shortLandscape && p.showAsk && p.onToggleAsk && (
                  <button
                    type="button"
                    className="btn btn-quiet px-3 studio-icon-btn"
                    aria-expanded={p.askOpen}
                    aria-controls="ask-fold-body"
                    aria-label={t('tutor.askGio')}
                    onClick={p.onToggleAsk}
                  >
                    <SparkleIcon size={22} className="text-[#0b7a4f]" />
                  </button>
                )}
                <LanguageButton className="btn btn-quiet min-w-[48px] px-0 xl:px-3" codeClass="hidden xl:inline text-[14px] font-black" />
                <button type="button" className="btn btn-ghost hidden xl:inline-flex" onClick={p.onChooseAgain} title={t('studio.switchMode.title')}>
                  {t(`mode.${p.mode}`)}
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] px-3 xl:px-[18px]" onClick={p.onGarden} aria-label={t('nav.garden.aria')}>
                  <LeafIcon className="text-[#12a36b]" /> <span className={p.shortLandscape ? 'hidden' : 'hidden xl:inline'}>{t('nav.garden')}</span>
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] px-3 xl:px-[18px] relative" onClick={p.onMap} aria-label={mapLabel}>
                  <MapIcon className="text-[#0f8fa6]" /> <span className={p.shortLandscape ? 'hidden' : 'hidden xl:inline'}>{t('nav.map')}</span>
                  {count}
                  {dot}
                </button>
                <button type="button" className="btn btn-quiet min-w-[48px] px-3 xl:px-[18px]" onClick={p.onPlay} aria-label={t('nav.play.aria')}>
                  <GamepadIcon className="text-[#7a4cf0]" /> <span className={p.shortLandscape ? 'hidden' : 'hidden xl:inline'}>{t('nav.play')}</span>
                </button>
                {!p.shortLandscape && (
                  <button type="button" className="btn btn-ghost hidden xl:inline-flex" onClick={p.onNew}>
                    <PlusIcon /> {t('btn.new')}
                  </button>
                )}
                {!p.shortLandscape && (
                  <button type="button" className="btn btn-quiet min-w-[48px] px-3 expanded:px-[18px]" onClick={p.onSave} disabled={p.saveDisabled} aria-label={p.saveLabel}>
                    <SaveIcon /> <span className="hidden expanded:inline">{p.saveLabel}</span>
                  </button>
                )}
                <button type="button" className="btn btn-primary min-w-[48px] px-3 expanded:px-[18px]" onClick={p.onShare} disabled={p.sharing} aria-label={t('btn.share')}>
                  <ShareIcon /> <span className={p.shortLandscape ? 'hidden' : 'hidden expanded:inline'}>{t('btn.share')}</span>
                </button>
                <MoreMenu p={p} className={p.shortLandscape ? '' : 'xl:hidden'} />
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
