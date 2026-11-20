/**
 * When to offer "Put GIO on this phone". Pure rules plus the one localStorage key (gio.pwa) that remembers
 * how many times GIO was opened and when the tip was dismissed. Nothing here is sent anywhere.
 */
export const PWA_KEY = 'gio.pwa';
/** "Not now" keeps the tip away for this long. */
export const QUIET_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InstallOffer = 'none' | 'android' | 'ios';
export type Platform = 'android' | 'ios-safari' | 'other';

export interface PwaState {
  /** How many separate times GIO was opened in this browser. */
  visits: number;
  /** When "Not now" or "Got it" was tapped (ms since 1970), or null. */
  installDismissedAt: number | null;
  /** True once the one-time "GIO works offline now" note was shown. */
  seenReady: boolean;
}

export interface InstallInputs {
  visits: number;
  finishedDrawing: boolean;
  dismissedAt: number | null;
  now: number;
  /** Already opened from the home screen. */
  standalone: boolean;
  platform: Platform;
  /** The browser fired beforeinstallprompt, so it can install GIO itself. */
  hasPrompt: boolean;
}

/** Offer the tip from the 2nd visit, or once a drawing is finished; never in the quiet period or when already installed. */
export function decideInstallOffer(i: InstallInputs): InstallOffer {
  if (i.standalone) return 'none';
  if (i.dismissedAt !== null && i.now - i.dismissedAt < QUIET_DAYS * DAY_MS) return 'none';
  if (i.visits < 2 && !i.finishedDrawing) return 'none';
  if (i.platform === 'ios-safari') return 'ios';
  // The tip talks about "this phone", so a desktop browser that can install apps is left alone.
  if (i.platform === 'android' && i.hasPrompt) return 'android';
  return 'none';
}

/**
 * Safari on iPhone and iPad is the only iOS browser that can add a web app to the home screen with a usable icon.
 * Other iOS browsers (CriOS, FxiOS, EdgiOS) and in-app views are left out. iPadOS reports a Mac with touch.
 */
export function platformOf(userAgent: string, maxTouchPoints = 0): Platform {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (ios) return /Safari\//.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent) ? 'ios-safari' : 'other';
  return /Android/.test(userAgent) ? 'android' : 'other';
}

export type StatusCard = 'none' | 'update' | 'quota' | 'phone-full' | 'ready' | 'android' | 'ios';

export interface CardInputs {
  /** A new version installed and is waiting, and the child did not tap Later in this visit. */
  updateWaiting: boolean;
  /** The turtle is drawing. Nothing new appears over a running program. */
  running: boolean;
  /** The offline files did not fit on the phone (shown once per visit until OK). */
  quotaNote: boolean;
  /** The browser refused to keep the child's code (shown once per visit until OK). */
  phoneFullNote: boolean;
  /** The 5 s "GIO works offline now" note is on. */
  readyNote: boolean;
  installOffer: InstallOffer;
}

/** At most one card at a time, most useful first. The offline pill is separate and may show with any card. */
export function pickCard(i: CardInputs): StatusCard {
  if (i.running) return 'none';
  if (i.updateWaiting) return 'update';
  if (i.phoneFullNote) return 'phone-full';
  if (i.quotaNote) return 'quota';
  if (i.readyNote) return 'ready';
  return i.installOffer;
}

const EMPTY: PwaState = { visits: 0, installDismissedAt: null, seenReady: false };

export function readPwaState(storage: Pick<Storage, 'getItem'> = localStorage): PwaState {
  try {
    const raw = JSON.parse(storage.getItem(PWA_KEY) ?? '{}') as Partial<PwaState> | null;
    return {
      visits: typeof raw?.visits === 'number' && raw.visits >= 0 ? Math.floor(raw.visits) : 0,
      installDismissedAt: typeof raw?.installDismissedAt === 'number' ? raw.installDismissedAt : null,
      seenReady: raw?.seenReady === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Saves a change to gio.pwa and returns the new state. A full phone is ignored: GIO keeps working and the tip may show again. */
export function writePwaState(change: Partial<PwaState>, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): PwaState {
  const next = { ...readPwaState(storage), ...change };
  try {
    storage.setItem(PWA_KEY, JSON.stringify(next));
  } catch {
    /* nothing to do: the tip may simply show again */
  }
  return next;
}
