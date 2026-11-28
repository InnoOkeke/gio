import { createContext, createElement, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { classifyWidth, isLitePerf, isShortLandscape, layoutFor, WIDTH_BREAKPOINTS, SHORT_HEIGHT, type LayoutMode, type PerfHints, type WidthClass } from './window-class';

export interface WindowClassState {
  widthClass: WidthClass;
  layout: LayoutMode;
  landscape: boolean;
  shortLandscape: boolean;
  coarse: boolean;
  reducedMotion: boolean;
  lite: boolean;
}

const QUERIES = {
  medium: `(min-width: ${WIDTH_BREAKPOINTS.medium}px)`,
  expanded: `(min-width: ${WIDTH_BREAKPOINTS.expanded}px)`,
  large: `(min-width: ${WIDTH_BREAKPOINTS.large}px)`,
  landscape: '(orientation: landscape)',
  short: `(max-height: ${SHORT_HEIGHT}px)`,
  coarse: '(pointer: coarse)',
  reduced: '(prefers-reduced-motion: reduce)',
};

function readPerf(): PerfHints {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return { hardwareConcurrency: nav.hardwareConcurrency, deviceMemory: nav.deviceMemory, saveData: nav.connection?.saveData };
}

function read(): WindowClassState {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    widthClass: classifyWidth(w),
    layout: layoutFor(w, h),
    landscape: w > h,
    shortLandscape: isShortLandscape(w, h),
    coarse: window.matchMedia(QUERIES.coarse).matches,
    reducedMotion: window.matchMedia(QUERIES.reduced).matches,
    lite: isLitePerf(readPerf()),
  };
}

function same(a: WindowClassState, b: WindowClassState): boolean {
  return (
    a.widthClass === b.widthClass &&
    a.layout === b.layout &&
    a.landscape === b.landscape &&
    a.shortLandscape === b.shortLandscape &&
    a.coarse === b.coarse &&
    a.reducedMotion === b.reducedMotion &&
    a.lite === b.lite
  );
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const WindowClassContext = createContext<WindowClassState | null>(null);

function useWindowClassInternal(enabled = true): WindowClassState {
  const [state, setState] = useState<WindowClassState>(read);

  useEffect(() => {
    if (!enabled) return;
    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
    const update = () =>
      setState((prev) => {
        const next = read();
        return same(prev, next) ? prev : next;
      });
    for (const l of lists) l.addEventListener('change', update);
    update();
    return () => {
      for (const l of lists) l.removeEventListener('change', update);
    };
  }, [enabled]);

  useIsoLayoutEffect(() => {
    if (!enabled) return;
    const el = document.documentElement;
    el.dataset['width'] = state.widthClass;
    el.dataset['layout'] = state.layout;
    el.dataset['pointer'] = state.coarse ? 'coarse' : 'fine';
    el.dataset['perf'] = state.lite ? 'lite' : 'full';
  }, [enabled, state]);

  return state;
}

/**
 * Provides the window size class once at the root so components share one set of matchMedia
 * listeners and one <html> dataset sync.
 */
export function WindowClassProvider({ children }: { children: ReactNode }) {
  const state = useWindowClassInternal(true);
  return createElement(WindowClassContext.Provider, { value: state }, children);
}

/**
 * Tracks the window size class with matchMedia listeners (no resize polling) and mirrors it on
 * <html> as data-width, data-layout, data-pointer and data-perf so CSS can switch layouts on one
 * fixed DOM tree.
 */
export function useWindowClass(): WindowClassState {
  const ctx = useContext(WindowClassContext);
  const fallback = useWindowClassInternal(ctx === null);
  return ctx ?? fallback;
}
