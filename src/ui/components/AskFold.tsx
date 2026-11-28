import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { LayoutMode, WidthClass } from '../responsive/window-class';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { useDialog } from '../useDialog';
import { useT } from '../lang';
import { CloseIcon, SparkleIcon } from './icons';

interface AskFoldProps {
  widthClass: WidthClass;
  layout: LayoutMode;
  shortLandscape?: boolean;
  open: boolean;
  onOpen(open: boolean): void;
  /** What the box says while it is folded, for the bar. */
  label: string;
  children: ReactNode;
}

function PopoverTrap({ bodyRef, closeRef, onClose }: { bodyRef: RefObject<HTMLDivElement>; closeRef: RefObject<HTMLButtonElement>; onClose(): void }) {
  useDialog(bodyRef, closeRef, onClose);
  return null;
}

/**
 * Folds the Ask Gio box so the stage and code get the room. Large screens always show it. Phones open
 * it as a bottom sheet from the action bar, tablets in portrait unfold it in place, tablets in
 * landscape drop it down from a slim bar, and short-landscape phones open it from the header icon.
 * The box stays mounted while folded, so what a child was typing is kept when the screen rotates or closes.
 */
export function AskFold({ widthClass, layout, shortLandscape = false, open, onOpen, label, children }: AskFoldProps) {
  const t = useT();
  const barRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mode = shortLandscape && widthClass !== 'compact'
    ? 'header-popover'
    : widthClass === 'large'
      ? 'always'
      : widthClass === 'compact'
        ? 'sheet'
        : layout === 'split'
          ? 'popover'
          : 'inline';
  const shown = mode === 'always' || open;
  const modalMode = mode === 'sheet' || mode === 'header-popover';
  useSheetDrag(bodyRef, () => onOpen(false), mode === 'sheet' && open);

  useEffect(() => {
    if (!open || mode === 'always' || mode === 'header-popover') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onOpen(false);
      barRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mode, onOpen]);

  if (mode === 'always') return <div className="ask-fold" data-mode="always">{children}</div>;

  return (
    <div className="ask-fold" data-mode={mode} data-open={open}>
      {mode !== 'sheet' && mode !== 'header-popover' && (
        <button ref={barRef} type="button" className="ask-bar" aria-expanded={open} aria-controls="ask-fold-body" onClick={() => onOpen(!open)}>
          <SparkleIcon size={22} />
          <span className="ask-bar-text">{label}</span>
          <span className="ask-bar-cta">{open ? t('btn.close') : t('tutor.askGio')}</span>
        </button>
      )}
      {modalMode && open && <div className="sheet-backdrop save-fade" onClick={() => onOpen(false)} aria-hidden="true" />}
      {mode === 'header-popover' && open && <PopoverTrap bodyRef={bodyRef} closeRef={closeRef} onClose={() => onOpen(false)} />}
      <div
        id="ask-fold-body"
        ref={bodyRef}
        className="ask-fold-body"
        hidden={!shown}
        role={modalMode ? 'dialog' : undefined}
        aria-modal={modalMode ? true : undefined}
        aria-label={modalMode ? t('tutor.askGio') : undefined}
      >
        {mode === 'sheet' && (
          <div className="bottom-sheet-head">
            <div className="bottom-sheet-grip" aria-hidden="true" />
            <button type="button" className="btn btn-quiet sheet-close" onClick={() => onOpen(false)}>
              {t('btn.close')}
            </button>
          </div>
        )}
        {mode === 'header-popover' && (
          <div className="flex items-center justify-end pb-2">
            <button ref={closeRef} type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px]" onClick={() => onOpen(false)} aria-label={t('btn.close')}>
              <CloseIcon />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
