import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { onStorageFull, storageFull } from '../api';
import { getActivity, subscribeActivity } from '../offline/activity';
import { decideInstallOffer, pickCard, platformOf, readPwaState, writePwaState } from '../offline/install';
import { getSnapshot, subscribe } from '../offline/register';
import { GioMark } from './GioMark';

/** The event Chrome and Edge on Android fire when GIO can be installed. TypeScript's DOM library does not include it. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/* The prompt event can fire before React draws anything, so it is caught as soon as this file loads. */
let savedPrompt: InstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
function setPrompt(event: InstallPromptEvent | null): void {
  savedPrompt = event;
  for (const listener of promptListeners) listener();
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own mini-bar away; GIO offers it calmly at a better moment.
    event.preventDefault();
    setPrompt(event as InstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => setPrompt(null));
}
const subscribePrompt = (listener: () => void) => {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
};

const subscribeOnline = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

const subscribePhoneFull = (listener: () => void) => onStorageFull(listener);

/** Counted once per page load (React may mount twice in development). */
let visitCounted = false;
function countVisit(): number {
  if (visitCounted) return readPwaState().visits;
  visitCounted = true;
  return writePwaState({ visits: readPwaState().visits + 1 }).visits;
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** The share icon iPhone and iPad show in Safari: a box with an arrow pointing up. */
function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" className="inline-block align-[-5px] mx-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

const BUTTON = 'btn min-h-12 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b7a4f]';

function Card({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="panel pointer-events-auto w-full max-w-md p-4 flex gap-3 items-start motion-safe:transition-opacity">
      <GioMark size={40} className="shrink-0" />
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <p className="m-0 text-[17px] font-black text-ink">{title}</p>
        {children}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * GIO's quiet status layer, mounted once: the offline pill, the "new version" banner, the install tip (Android) or
 * guide (iPhone and iPad), and short notes about offline files. Nothing here is modal and nothing appears over a
 * running program.
 */
export function AppStatus() {
  const offline = useSyncExternalStore(subscribe, getSnapshot);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const activity = useSyncExternalStore(subscribeActivity, getActivity);
  const prompt = useSyncExternalStore(subscribePrompt, () => savedPrompt);
  const phoneFull = useSyncExternalStore(subscribePhoneFull, storageFull);

  const [visits] = useState(countVisit);
  const [pwa, setPwa] = useState(readPwaState);
  const [standalone] = useState(isStandalone);
  const [platform] = useState(() => platformOf(navigator.userAgent, navigator.maxTouchPoints ?? 0));
  const [updateLater, setUpdateLater] = useState(false);
  const [quotaDone, setQuotaDone] = useState(false);
  const [phoneFullDone, setPhoneFullDone] = useState(false);
  const [readyNote, setReadyNote] = useState(false);
  const sawInstalling = useRef(false);

  // "GIO works offline now" appears once, for 5 s, right after the first download of GIO's files finishes.
  useEffect(() => {
    if (offline.state === 'installing') sawInstalling.current = true;
    if (offline.state !== 'ready-offline' || !sawInstalling.current || pwa.seenReady) return;
    setPwa(writePwaState({ seenReady: true }));
    setReadyNote(true);
    const timer = window.setTimeout(() => setReadyNote(false), 5000);
    return () => window.clearTimeout(timer);
  }, [offline.state, pwa.seenReady]);

  const installOffer = decideInstallOffer({
    visits,
    finishedDrawing: activity.finishedDrawing,
    dismissedAt: pwa.installDismissedAt,
    now: Date.now(),
    standalone,
    platform,
    hasPrompt: prompt !== null,
  });
  const card = pickCard({
    updateWaiting: offline.state === 'update-waiting' && !updateLater,
    running: activity.running,
    quotaNote: offline.state === 'failed' && offline.failedReason === 'quota' && !quotaDone,
    phoneFullNote: phoneFull && !phoneFullDone,
    readyNote,
    installOffer,
  });

  const notNow = () => setPwa(writePwaState({ installDismissedAt: Date.now() }));
  const install = async () => {
    const event = savedPrompt;
    if (!event) return;
    setPrompt(null);
    await event.prompt();
    const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    if (choice.outcome === 'dismissed') notNow();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none flex flex-col items-center sm:items-start gap-2 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] [@media(max-height:479px)]:bottom-auto [@media(max-height:479px)]:top-0 [@media(max-height:479px)]:items-center [@media(max-height:479px)]:pt-[calc(env(safe-area-inset-top)+8px)]"
    >
      {!online && (
        <p className="pointer-events-auto m-0 rounded-full bg-ink text-white px-4 py-2 text-[15px] font-extrabold shadow-lg">No internet. Drawing and quests still work.</p>
      )}
      {card === 'update' && (
        <Card
          title="A new GIO is ready"
          actions={
            <>
              <button type="button" className={`${BUTTON} btn-primary`} onClick={offline.applyUpdate}>
                Update now
              </button>
              <button type="button" className={`${BUTTON} btn-quiet`} onClick={() => setUpdateLater(true)}>
                Later
              </button>
            </>
          }
        >
          <p className="m-0 text-[15px] font-semibold text-ink-2">Your code is kept.</p>
        </Card>
      )}
      {card === 'phone-full' && (
        <Card
          title="This phone is full"
          actions={
            <button type="button" className={`${BUTTON} btn-quiet`} onClick={() => setPhoneFullDone(true)}>
              OK
            </button>
          }
        >
          <p className="m-0 text-[15px] font-semibold text-ink-2">GIO can&rsquo;t keep your code on this phone right now. Save your drawing to keep it.</p>
        </Card>
      )}
      {card === 'quota' && (
        <Card
          title="Not enough space for offline on this phone"
          actions={
            <button type="button" className={`${BUTTON} btn-quiet`} onClick={() => setQuotaDone(true)}>
              OK
            </button>
          }
        >
          <p className="m-0 text-[15px] font-semibold text-ink-2">GIO still works while you have internet.</p>
        </Card>
      )}
      {card === 'ready' && <Card title="GIO works offline now" />}
      {card === 'android' && (
        <Card
          title="Put GIO on this phone"
          actions={
            <>
              <button type="button" className={`${BUTTON} btn-primary`} onClick={() => void install()}>
                Add to home screen
              </button>
              <button type="button" className={`${BUTTON} btn-quiet`} onClick={notNow}>
                Not now
              </button>
            </>
          }
        >
          <p className="m-0 text-[15px] font-semibold text-ink-2">Draw and do quests with no internet.</p>
        </Card>
      )}
      {card === 'ios' && (
        <Card
          title="Put GIO on this phone"
          actions={
            <button type="button" className={`${BUTTON} btn-quiet`} onClick={notNow}>
              Got it
            </button>
          }
        >
          <ol className="m-0 pl-5 text-[15px] font-semibold text-ink-2 flex flex-col gap-1">
            <li>
              Tap the Share button <ShareIcon /> in Safari.
            </li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;.</li>
            <li>Tap &ldquo;Add&rdquo;. GIO then opens from its own icon.</li>
          </ol>
        </Card>
      )}
    </div>
  );
}
