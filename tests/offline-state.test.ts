import { describe, it, expect } from 'vitest';
import { initialOfflineState, transition, type OfflineState } from '../src/ui/offline/state';

const ready: OfflineState = { supported: true, state: 'ready-offline', failedReason: null };
const installing: OfflineState = { supported: true, state: 'installing', failedReason: null };
const waiting: OfflineState = { supported: true, state: 'update-waiting', failedReason: null };

describe('offline state', () => {
  it('starts unsupported and stays so on an unsupported event', () => {
    expect(initialOfflineState).toEqual({ supported: false, state: 'unsupported', failedReason: null });
    expect(transition(ready, { type: 'unsupported' })).toEqual(initialOfflineState);
  });

  it('goes from installing to ready-offline on the first install', () => {
    const next = transition(transition(initialOfflineState, { type: 'installing' }), { type: 'installed', updateAvailable: false });
    expect(next).toEqual(ready);
  });

  it('reports update-waiting when a worker installs while another one controls the page', () => {
    expect(transition(ready, { type: 'installed', updateAvailable: true })).toEqual(waiting);
  });

  it('keeps showing ready-offline while an update installs in the background', () => {
    expect(transition(ready, { type: 'installing' })).toBe(ready);
    expect(transition(waiting, { type: 'installing' })).toBe(waiting);
  });

  it('is ready-offline when the page loads with an active worker, but keeps a waiting update', () => {
    expect(transition(initialOfflineState, { type: 'active' })).toEqual(ready);
    expect(transition(waiting, { type: 'active' })).toBe(waiting);
  });

  it('records a quota failure of the first install with its reason', () => {
    expect(transition(installing, { type: 'failed', reason: 'quota' })).toEqual({ supported: true, state: 'failed', failedReason: 'quota' });
    expect(transition(installing, { type: 'failed', reason: 'network' }).failedReason).toBe('network');
  });

  it('does not report a failed update as a failure, because the old files still work', () => {
    expect(transition(ready, { type: 'failed', reason: 'quota' })).toBe(ready);
    expect(transition(waiting, { type: 'failed', reason: 'network' })).toBe(waiting);
  });

  it('clears a failure when a later install succeeds', () => {
    const failed = transition(installing, { type: 'failed', reason: 'quota' });
    expect(transition(failed, { type: 'installed', updateAvailable: false })).toEqual(ready);
    expect(transition(failed, { type: 'installing' })).toEqual(installing);
  });

  it('applies an update only when one is waiting', () => {
    expect(transition(waiting, { type: 'apply-update' })).toEqual(installing);
    expect(transition(ready, { type: 'apply-update' })).toBe(ready);
  });
});
