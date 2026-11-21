import { lazy } from 'react';
/**
 * The studio's overlays, loaded on first use so the first paint on low-cost tablets carries less
 * script. They are all fixed-position, so loading them never shifts the page.
 */
const loadMap = () => import('./AdventureMap');
export const AdventureMap = lazy(() => loadMap().then((m) => ({ default: m.AdventureMap })));
export const GardenSheet = lazy(() => import('./GardenSheet').then((m) => ({ default: m.GardenSheet })));
export const GardenContent = lazy(() => import('./GardenContent').then((m) => ({ default: m.GardenContent })));
export const FriendDialog = lazy(() => import('./FriendDialog').then((m) => ({ default: m.FriendDialog })));
export const MasteryMoment = lazy(() => import('./MasteryMoment').then((m) => ({ default: m.MasteryMoment })));
let preloaded = false;
/** Fetch the map chunk once the browser is idle after the first paint, so the Map button opens at once. */
export function preloadMapWhenIdle(): void {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  const run = () => void loadMap().catch(() => undefined);
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 1500);
}
