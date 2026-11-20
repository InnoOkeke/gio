/** The offline state of the installed app, as a pure reducer so it can be tested without a browser. */

export type OfflineStatus = 'unsupported' | 'installing' | 'ready-offline' | 'update-waiting' | 'failed';
export type FailedReason = 'quota' | 'network';

export interface OfflineState {
  supported: boolean;
  state: OfflineStatus;
  failedReason: FailedReason | null;
}

export type OfflineEvent =
  | { type: 'unsupported' }
  /** A worker started installing. */
  | { type: 'installing' }
  /** A worker finished installing. updateAvailable is true when another worker already controls the page. */
  | { type: 'installed'; updateAvailable: boolean }
  /** The page loaded with a worker that is already active and has its files. */
  | { type: 'active' }
  | { type: 'failed'; reason: FailedReason }
  | { type: 'apply-update' };

export const initialOfflineState: OfflineState = { supported: false, state: 'unsupported', failedReason: null };

export function transition(current: OfflineState, event: OfflineEvent): OfflineState {
  switch (event.type) {
    case 'unsupported':
      return initialOfflineState;
    case 'installing':
      // While an update installs, the files already kept still work, so the visible state does not change.
      if (current.state === 'ready-offline' || current.state === 'update-waiting') return current;
      return { supported: true, state: 'installing', failedReason: null };
    case 'installed':
      return { supported: true, state: event.updateAvailable ? 'update-waiting' : 'ready-offline', failedReason: null };
    case 'active':
      return current.state === 'update-waiting' ? current : { supported: true, state: 'ready-offline', failedReason: null };
    case 'failed':
      // A failed update leaves the old worker and its files working, so only a first install is reported as failed.
      if (current.state === 'ready-offline' || current.state === 'update-waiting') return current;
      return { supported: true, state: 'failed', failedReason: event.reason };
    case 'apply-update':
      return current.state === 'update-waiting' ? { supported: true, state: 'installing', failedReason: null } : current;
  }
}
