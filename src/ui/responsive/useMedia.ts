import { useSyncExternalStore } from 'react';
import { WIDTH_BREAKPOINTS } from './window-class';
/** Follows one media query without polling. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
/** Phones in portrait and narrow Split View: overlays become bottom sheets. */
export const COMPACT_QUERY = `(max-width: ${WIDTH_BREAKPOINTS.medium - 1}px)`;
/** Tablets in landscape and desktop windows: room for two panes. */
export const TWO_PANE_QUERY = `(min-width: ${WIDTH_BREAKPOINTS.expanded}px) and (orientation: landscape)`;
export function useIsCompact(): boolean {
  return useMedia(COMPACT_QUERY);
}
export function useTwoPane(): boolean {
  return useMedia(TWO_PANE_QUERY);
}
