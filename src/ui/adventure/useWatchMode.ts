import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { enterFullscreen, exitFullscreen, isNativeFullscreen, type FullscreenDoc, type FullscreenTarget } from '../responsive/fullscreen';

export interface WatchMode {
  /** The scene fills the screen and the plan is hidden. */
  active: boolean;
  toggle(): void;
  exit(): void;
  buttonRef: RefObject<HTMLButtonElement>;
}

/**
 * Watch mode for a level: the page becomes a CSS overlay (so nothing remounts and the run carries
 * on), and native full screen is asked for on top where the browser allows it (not iPhone Safari).
 * Escape or the browser's own exit gesture leaves it.
 */
export function useWatchMode(rootRef: RefObject<HTMLElement>): WatchMode {
  const [active, setActive] = useState(false);
  const native = useRef(false);
  const wasActive = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const exit = useCallback(() => {
    setActive(false);
    native.current = false;
    void exitFullscreen(document as unknown as FullscreenDoc);
  }, []);
  const toggle = useCallback(() => {
    if (active) {
      exit();
      return;
    }
    setActive(true);
    const root = rootRef.current as unknown as FullscreenTarget | null;
    if (root) {
      void enterFullscreen(root, document as unknown as FullscreenDoc).then((ok) => {
        native.current = ok;
      });
    }
  }, [active, exit, rootRef]);
  useEffect(() => {
    if (wasActive.current && !active) buttonRef.current?.focus();
    wasActive.current = active;
  }, [active]);
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exit();
      }
    };
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
  // Leaving the level while watching also leaves full screen.
  useEffect(
    () => () => {
      void exitFullscreen(document as unknown as FullscreenDoc);
    },
    [],
  );
  return { active, toggle, exit, buttonRef };
}