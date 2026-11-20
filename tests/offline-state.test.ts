import { describe, it, expect } from 'vitest';
import { initialOfflineState, transition, type OfflineState } from '../src/ui/offline/state';
import { decideInstallOffer, pickCard, platformOf, PWA_KEY, QUIET_DAYS, readPwaState, writePwaState, type CardInputs, type InstallInputs } from '../src/ui/offline/install';
import { getActivity, reportPlayerStatus, subscribeActivity } from '../src/ui/offline/activity';

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

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 20);
const base: InstallInputs = { visits: 2, finishedDrawing: false, dismissedAt: null, now: NOW, standalone: false, platform: 'android', hasPrompt: true };

describe('install offer', () => {
  it('stays away on the first visit unless a drawing is finished', () => {
    expect(decideInstallOffer({ ...base, visits: 1 })).toBe('none');
    expect(decideInstallOffer({ ...base, visits: 1, finishedDrawing: true })).toBe('android');
    expect(decideInstallOffer({ ...base, visits: 2 })).toBe('android');
  });
  it('keeps quiet for 14 days after Not now', () => {
    expect(decideInstallOffer({ ...base, dismissedAt: NOW - (QUIET_DAYS * DAY - 1) })).toBe('none');
    expect(decideInstallOffer({ ...base, dismissedAt: NOW - QUIET_DAYS * DAY })).toBe('android');
  });
  it('is hidden when GIO already runs from the home screen', () => {
    expect(decideInstallOffer({ ...base, standalone: true })).toBe('none');
    expect(decideInstallOffer({ ...base, platform: 'ios-safari', standalone: true })).toBe('none');
  });
  it('offers the Android button only if the browser fired beforeinstallprompt, and never on a desktop', () => {
    expect(decideInstallOffer({ ...base, hasPrompt: false })).toBe('none');
    expect(decideInstallOffer({ ...base, platform: 'other' })).toBe('none');
  });
  it('offers the iOS guide on Safari-like browsers without a prompt event', () => {
    expect(decideInstallOffer({ ...base, platform: 'ios-safari', hasPrompt: false })).toBe('ios');
  });
});

describe('platform', () => {
  const safariPhone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  it('recognises Safari on iPhone and iPadOS (a Mac with touch)', () => {
    expect(platformOf(safariPhone)).toBe('ios-safari');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 5)).toBe('ios-safari');
  });
  it('leaves out other iOS browsers and a desktop Mac', () => {
    expect(platformOf(safariPhone.replace('Version/17.5', 'CriOS/126.0'))).toBe('other');
    expect(platformOf(safariPhone.replace('Version/17.5', 'FxiOS/127.0'))).toBe('other');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 0)).toBe('other');
  });
  it('recognises Android', () => {
    expect(platformOf('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36')).toBe('android');
  });
});

describe('gio.pwa storage', () => {
  function memory(): Storage & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage & { data: Map<string, string> };
  }
  it('reads defaults from nothing or from junk', () => {
    const s = memory();
    expect(readPwaState(s)).toEqual({ visits: 0, installDismissedAt: null, seenReady: false });
    s.data.set(PWA_KEY, '{not json');
    expect(readPwaState(s)).toEqual({ visits: 0, installDismissedAt: null, seenReady: false });
    s.data.set(PWA_KEY, JSON.stringify({ visits: -3, installDismissedAt: 'soon', seenReady: 'yes' }));
    expect(readPwaState(s)).toEqual({ visits: 0, installDismissedAt: null, seenReady: false });
  });
  it('merges a change into what is stored', () => {
    const s = memory();
    writePwaState({ visits: 3 }, s);
    expect(writePwaState({ installDismissedAt: NOW }, s)).toEqual({ visits: 3, installDismissedAt: NOW, seenReady: false });
    expect(JSON.parse(s.data.get(PWA_KEY)!)).toEqual({ visits: 3, installDismissedAt: NOW, seenReady: false });
  });
  it('does not throw when the phone is full', () => {
    const full = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(() => writePwaState({ visits: 1 }, full)).not.toThrow();
  });
});

describe('status card', () => {
  const quiet: CardInputs = { updateWaiting: false, running: false, quotaNote: false, phoneFullNote: false, readyNote: false, installOffer: 'none' };
  it('shows nothing by default', () => {
    expect(pickCard(quiet)).toBe('none');
  });
  it('never shows a card over a running program', () => {
    expect(pickCard({ ...quiet, running: true, updateWaiting: true, installOffer: 'android' })).toBe('none');
  });
  it('puts the update first, then notes, then the install tip', () => {
    const all: CardInputs = { ...quiet, updateWaiting: true, quotaNote: true, phoneFullNote: true, readyNote: true, installOffer: 'ios' };
    expect(pickCard(all)).toBe('update');
    expect(pickCard({ ...all, updateWaiting: false })).toBe('phone-full');
    expect(pickCard({ ...all, updateWaiting: false, phoneFullNote: false })).toBe('quota');
    expect(pickCard({ ...all, updateWaiting: false, phoneFullNote: false, quotaNote: false })).toBe('ready');
    expect(pickCard({ ...quiet, installOffer: 'ios' })).toBe('ios');
  });
});

describe('studio activity', () => {
  it('tracks running and remembers a finished drawing', () => {
    let calls = 0;
    const off = subscribeActivity(() => (calls += 1));
    reportPlayerStatus('playing');
    expect(getActivity()).toEqual({ running: true, finishedDrawing: false });
    reportPlayerStatus('done');
    expect(getActivity()).toEqual({ running: false, finishedDrawing: true });
    reportPlayerStatus('idle');
    expect(getActivity()).toEqual({ running: false, finishedDrawing: true });
    expect(calls).toBe(2);
    off();
  });
});