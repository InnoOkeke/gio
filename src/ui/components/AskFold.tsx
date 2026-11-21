import { useEffect, useRef, type ReactNode } from 'react';
import type { LayoutMode, WidthClass } from '../responsive/window-class';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { SparkleIcon } from './icons';

interface AskFoldProps {
  widthClass: WidthClass;
  layout: LayoutMode;
  open: boolean;
  onOpen(open: boolean): void;
  /** What the box says while it is folded, for the bar. */
  label: string;
  children: ReactNode;
}

/**
 * Folds the Ask Gio box so the stage and code get the room. Large screens always show it. Phones open
 * it as a bottom sheet from the action bar, tablets in portrait unfold it in place, and tablets in
 * landscape drop it down from a slim bar. The box stays mounted while folded, so what a child was
 * typing is kept when the screen rotates or the box is closed.
 */
export function AskFold({ widthClass, layout, open, onOpen, label, children }: AskFoldProps) {
  const barRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mode = widthClass === 'large' ? 'always' : widthClass === 'compact' ? 'sheet' : layout === 'split' ? 'popover' : 'inline';
  const shown = mode === 'always' || open;
  useSheetDrag(bodyRef, () => onOpen(false), mode === 'sheet' && open);

  useEffect(() => {
    if (!open || mode === 'always') return;
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
      {mode !== 'sheet' && (
        <button ref={barRef} type="button" className="ask-bar" aria-expanded={open} aria-controls="ask-fold-body" onClick={() => onOpen(!open)}>
          <SparkleIcon size={22} />
          <span className="ask-bar-text">{label}</span>
          <span className="ask-bar-cta">{open ? 'Close' : 'Ask Gio'}</span>
        </button>
      )}
      {mode === 'sheet' && open && <div className="sheet-backdrop save-fade" onClick={() => onOpen(false)} aria-hidden="true" />}
      <div
        id="ask-fold-body"
        ref={bodyRef}
        className="ask-fold-body"
        hidden={!shown}
        role={mode === 'sheet' ? 'dialog' : undefined}
        aria-modal={mode === 'sheet' ? true : undefined}
        aria-label={mode === 'sheet' ? 'Ask Gio' : undefined}
      >
        {mode === 'sheet' && (
          <div className="bottom-sheet-head">
            <div className="bottom-sheet-grip" aria-hidden="true" />
            <button type="button" className="btn btn-quiet sheet-close" onClick={() => onOpen(false)}>
              Close
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
