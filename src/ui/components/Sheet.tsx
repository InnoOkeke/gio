import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import '../responsive/overlays.css';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { useDialog } from '../useDialog';
/**
 * sheet:  bottom sheet on phones, centred panel on tablets
 * dialog: same, for short cards
 * drawer: bottom sheet on phones, side drawer on tablets
 * page:   full screen on phones, large centred panel on tablets (the adventure map)
 */
export type SheetVariant = 'sheet' | 'drawer' | 'dialog' | 'page';
export interface SheetProps {
  open: boolean;
  onClose(): void;
  /** Escape. Defaults to onClose. */
  onEscape?(): void;
  /** The id of the heading that names the dialog. */
  labelledBy: string;
  variant: SheetVariant;
  /** Gets focus when the sheet opens. Defaults to the first button. */
  initialFocus?: RefObject<HTMLElement>;
  /** False when the children scroll on their own (a header, a scroller and a footer). */
  scroll?: boolean;
  /** Extra classes for the panel. */
  className?: string;
  /** Tapping the dark area closes the sheet. Defaults to true. */
  scrimCloses?: boolean;
  /** Drawn over the whole screen above the panel, like confetti. Must not take pointer events. */
  overlay?: ReactNode;
  children: ReactNode;
}
let locks = 0;
let saved = '';
function lockScroll(): () => void {
  if (locks++ === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  return () => {
    if (--locks === 0) document.body.style.overflow = saved;
  };
}
/** One modal surface for every overlay: focus trap, Escape, scrim, scroll lock and swipe-down on phones. */
export function Sheet(props: SheetProps) {
  return props.open ? <OpenSheet {...props} /> : null;
}
function OpenSheet({ onClose, onEscape, labelledBy, variant, initialFocus, scroll = true, className = '', scrimCloses = true, overlay, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useLayoutEffect(() => {
    (fallback as { current: HTMLElement | null }).current = panelRef.current?.querySelector<HTMLElement>('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])') ?? panelRef.current;
  }, []);
  useEffect(() => lockScroll(), []);
  useDialog(panelRef, initialFocus ?? fallback, () => (escapeRef.current ?? closeRef.current)());
  useSheetDrag(panelRef, () => closeRef.current(), variant !== 'page');
  return (
    <div className="sheet-root" data-variant={variant} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="sheet-scrim" onClick={scrimCloses ? () => closeRef.current() : undefined} aria-hidden="true" />
      <div ref={panelRef} className={`sheet-panel ${scroll ? 'overflow-y-auto' : ''} ${className}`} data-scroll={scroll}>
        <div className="sheet-grab" data-sheet-grab aria-hidden="true">
          <span className="sheet-handle" />
        </div>
        {children}
      </div>
      {overlay}
    </div>
  );
}
