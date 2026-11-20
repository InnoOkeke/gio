/**
 * Registers GIO's service worker (production builds only) and exposes its state as a tiny store that React can read
 * with useSyncExternalStore. Nothing here shows UI.
 */
import { initialOfflineState, transition, type FailedReason, type OfflineEvent, type OfflineState } from './state';

export interface OfflineSnapshot extends OfflineState {
  /** Asks the waiting worker to take over, then reloads this tab only. */
  applyUpdate: () => void;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

let state: OfflineState = initialOfflineState;
let waiting: ServiceWorker | null = null;
let applying = false;
let snapshot: OfflineSnapshot = { ...state, applyUpdate };
const listeners = new Set<() => void>();

function dispatch(event: OfflineEvent): void {
  const next = transition(state, event);
  if (next === state) return;
  state = next;
  snapshot = { ...state, applyUpdate };
  for (const listener of listeners) listener();
}

function applyUpdate(): void {
  if (!waiting) return;
  applying = true;
  dispatch({ type: 'apply-update' });
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function getSnapshot(): OfflineSnapshot {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function track(registration: ServiceWorkerRegistration, worker: ServiceWorker): void {
  dispatch({ type: 'installing' });
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      const updateAvailable = !!navigator.serviceWorker.controller;
      if (updateAvailable) waiting = registration.waiting ?? worker;
      dispatch({ type: 'installed', updateAvailable });
      if (!updateAvailable) void navigator.storage?.persist?.().catch(() => false);
    } else if (worker.state === 'redundant') {
      dispatch({ type: 'failed', reason: lastFailure });
    }
  });
}

let lastFailure: FailedReason = 'network';

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const container = navigator.serviceWorker;

  container.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; reason?: FailedReason } | null;
    if (data?.type === 'precache-failed') {
      lastFailure = data.reason === 'quota' ? 'quota' : 'network';
      dispatch({ type: 'failed', reason: lastFailure });
    }
  });
  container.addEventListener('controllerchange', () => {
    // Only the tab that asked for the update reloads, so no other open tab loses its work.
    if (applying) window.location.reload();
  });

  window.addEventListener('load', () => {
    container
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting && container.controller) {
          waiting = registration.waiting;
          dispatch({ type: 'installed', updateAvailable: true });
        } else if (registration.active && !registration.installing) {
          dispatch({ type: 'active' });
        }
        if (registration.installing) track(registration, registration.installing);
        registration.addEventListener('updatefound', () => {
          if (registration.installing) track(registration, registration.installing);
        });
        const check = (): void => {
          void registration.update().catch(() => undefined);
        };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        window.setInterval(check, SIX_HOURS);
      })
      .catch(() => dispatch({ type: 'failed', reason: 'network' }));
  });
}
