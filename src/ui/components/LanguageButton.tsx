import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LANGS } from '../../i18n/index.js';
import { useLang, useT } from '../lang';
import { Sheet } from './Sheet';

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  );
}

/** The sheet that lists the four languages in their own names. Choosing applies at once. Portalled: the studio header's backdrop blur would otherwise trap the fixed sheet inside the header. */
export function LanguageSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const titleId = useId();
  const currentRef = useRef<HTMLButtonElement>(null);
  if (!open) return null;
  return createPortal(
    <Sheet open={open} onClose={onClose} variant="dialog" labelledBy={titleId} initialFocus={currentRef}>
      <div className="flex flex-col gap-3 p-4" data-testid="language-sheet">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 text-[18px] font-black">
            {t('lang.choose')}
          </h2>
          <button type="button" className="btn btn-ghost min-h-[48px]" onClick={onClose}>
            {t('btn.close')}
          </button>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('lang.row')}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              ref={l.id === lang ? currentRef : undefined}
              type="button"
              role="radio"
              aria-checked={l.id === lang}
              lang={l.id}
              className="save-row min-h-[56px]"
              onClick={() => {
                setLang(l.id);
                onClose();
              }}
            >
              <span className="text-[18px] font-black flex-1 text-left">{l.name}</span>
              {l.id === lang && (
                <span className="text-[20px] font-black" aria-label={t('lang.selected')}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Sheet>,
    document.body,
  );
}

/** A globe and the two-letter code of the current language. Opens the language sheet. */
export function LanguageButton({ className = 'btn btn-quiet px-3 min-h-[48px] min-w-[48px]', codeClass = 'text-[14px] font-black' }: { className?: string; codeClass?: string }) {
  const { lang } = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const info = LANGS.find((l) => l.id === lang)!;
  return (
    <>
      <button type="button" data-lang-button className={className} aria-haspopup="dialog" aria-label={t('lang.button', { name: info.name })} onClick={() => setOpen(true)}>
        <GlobeIcon /> <span className={codeClass}>{info.code}</span>
      </button>
      <LanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The four languages as one row of big buttons, for the first screen. */
export function LanguageRow() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[860px]" role="radiogroup" aria-label={t('lang.choose')}>
      <p className="m-0 text-[16px] font-extrabold text-ink-2">{t('lang.choose')}</p>
      <div className="flex flex-wrap justify-center gap-2 w-full">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={l.id === lang}
            lang={l.id}
            className={`btn min-h-[48px] px-4 text-[16px] font-black ${l.id === lang ? 'btn-primary' : 'btn-quiet'}`}
            onClick={() => setLang(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}
