import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { enterFullscreen, exitFullscreen, fullscreenSupported, isNativeFullscreen, type FullscreenDoc, type FullscreenTarget } from '../responsive/fullscreen';
import type { WidthClass } from '../responsive/window-class';

export interface FocusMode {
  /** The stage pane fills the screen. */
  active: boolean;
  /** The browser can also make it real full screen (best effort on top of the overlay). */
  supported: boolean;
  /** A game just started on a small screen: suggest full screen, never force it. */
  offered: boolean;
  enter(): void;
  exit(): void;
  dismissOffer(): void;
  buttonRef: RefObject<HTMLButtonElement>;
  exitRef: RefObject<HTMLButtonElement>;
}

/**
 * Full-screen focus mode for the stage. The pane is turned into a fixed overlay with CSS, so the
 * Stage and its Player never remount and the drawing and running game carry on. Native full screen
 * is asked for on top, inside a try/catch, because iPhone Safari does not allow it.
 */
export function useFocusMode(paneRef: RefObject<HTMLElement>, gameActive: boolean, widthClass: WidthClass): FocusMode {
  const [active, setActive] = useState(false);
  const [offered, setOffered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const native = useRef(false);
  const wasActive = useRef(false);
  const dismissed = useRef(false);
  const supported = typeof document !== 'undefined' && fullscreenSupported(document as unknown as FullscreenDoc);

  const enter = useCallback(() => {
    setActive(true);
    setOffered(false);
    const pane = paneRef.current as unknown as FullscreenTarget | null;
    if (pane) {
      void enterFullscreen(pane, document as unknown as FullscreenDoc).then((ok) => {
        native.current = ok;
      });
    }
  }, [paneRef]);

  const exit = useCallback(() => {
    setActive(false);
    native.current = false;
    void exitFullscreen(document as unknown as FullscreenDoc);
  }, []);

  // The overlay is a page-level state, so the page behind it does not scroll.
  useEffect(() => {
    const root = document.documentElement;
    if (active) root.dataset['focus'] = 'stage';
    else delete root.dataset['focus'];
    return () => {
      delete root.dataset['focus'];
    };
  }, [active]);

  useEffect(() => {
    if (active) {
      exitRef.current?.focus();
    } else if (wasActive.current) {
      buttonRef.current?.focus();
    }
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exit();
      }
    };
    // Leaving native full screen with the browser's own gesture also leaves the mode.
    const onChange = () => {
      if (native.current && !isNativeFullscreen(document as unknown as FullscreenDoc)) {
        native.current = false;
        setActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [active, exit]);

  // Small screens get one gentle offer per game.
  useEffect(() => {
    if (!gameActive) {
      dismissed.current = false;
      setOffered(false);
      return;
    }
    if (!dismissed.current && !active && (widthClass === 'compact' || widthClass === 'medium')) setOffered(true);
  }, [gameActive, widthClass, active]);

  const dismissOffer = useCallback(() => {
    dismissed.current = true;
    setOffered(false);
  }, []);

  return { active, supported, offered, enter, exit, dismissOffer, buttonRef, exitRef };
}

/** The Full screen button on the stage, or the Exit button while the stage fills the screen. */
export function FocusToggle({ focus }: { focus: FocusMode }) {
  return focus.active ? (
    <button ref={focus.exitRef} type="button" className="focus-btn focus-exit" onClick={focus.exit} aria-label="Exit full screen">
      Exit
    </button>
  ) : (
    <button ref={focus.buttonRef} type="button" className="focus-btn" onClick={focus.enter} aria-label="Full screen">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
    </button>
  );
}

/** A small card that suggests full screen when a game starts on a phone or small tablet. */
export function FocusOffer({ focus }: { focus: FocusMode }) {
  if (!focus.offered || focus.active) return null;
  return (
    <div className="focus-offer" role="status">
      <span className="focus-offer-text">Play full screen?</span>
      <button type="button" className="btn btn-primary focus-offer-go" onClick={focus.enter}>
        Full screen
      </button>
      <button type="button" className="btn btn-quiet" onClick={focus.dismissOffer} aria-label="Not now">
        Not now
      </button>
    </div>
  );
}
