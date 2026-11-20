/**
 * Native full screen, best effort. iPad Safari supports it on any element, iPhone Safari does not,
 * so the full-screen mode of the stage is a CSS overlay first and this only adds the real thing.
 */
export interface FullscreenDoc {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  exitFullscreen?(): Promise<void>;
  webkitExitFullscreen?(): void | Promise<void>;
}

export interface FullscreenTarget {
  requestFullscreen?(): Promise<void>;
  webkitRequestFullscreen?(): void | Promise<void>;
}

/** True when the browser can show an element in native full screen. */
export function fullscreenSupported(doc: FullscreenDoc, target?: FullscreenTarget): boolean {
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  if (!enabled) return false;
  if (!target) return true;
  return typeof target.requestFullscreen === 'function' || typeof target.webkitRequestFullscreen === 'function';
}

/** True while some element is in native full screen. */
export function isNativeFullscreen(doc: FullscreenDoc): boolean {
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/** Asks for native full screen. Resolves false instead of throwing when it is missing or refused. */
export async function enterFullscreen(target: FullscreenTarget, doc: FullscreenDoc): Promise<boolean> {
  if (!fullscreenSupported(doc, target)) return false;
  try {
    if (typeof target.requestFullscreen === 'function') await target.requestFullscreen();
    else await target.webkitRequestFullscreen?.();
    return true;
  } catch {
    return false;
  }
}

/** Leaves native full screen if it is on. Never throws. */
export async function exitFullscreen(doc: FullscreenDoc): Promise<void> {
  if (!isNativeFullscreen(doc)) return;
  try {
    if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
  } catch {
    /* already out */
  }
}
