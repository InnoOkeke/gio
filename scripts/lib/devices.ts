/**
 * The devices the layout checks run on. Sizes are CSS pixels in portrait; landscape swaps them.
 * Safe-area insets are the notch and home-indicator space the page must keep clear.
 */
import type { Cdp } from './cdp';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export type Orientation = 'portrait' | 'landscape';

export interface Device {
  id: string;
  label: string;
  /** CSS pixels, portrait */
  width: number;
  height: number;
  deviceScaleFactor: number;
  /** Phones and tablets: touch input, coarse pointer, 48px targets expected. */
  touch: boolean;
  portraitInsets: Insets;
  landscapeInsets: Insets;
  /** Which orientations to run. */
  orientations: Orientation[];
}

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export const DEVICES: Device[] = [
  { id: 'android-small', label: 'Small Android phone', width: 360, height: 800, deviceScaleFactor: 3, touch: true, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait', 'landscape'] },
  {
    id: 'iphone',
    label: 'iPhone 14',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    touch: true,
    portraitInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    landscapeInsets: { top: 0, right: 47, bottom: 21, left: 47 },
    orientations: ['portrait', 'landscape'],
  },
  { id: 'ipad-mini', label: 'iPad mini', width: 744, height: 1133, deviceScaleFactor: 2, touch: true, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait', 'landscape'] },
  { id: 'ipad', label: 'iPad', width: 820, height: 1180, deviceScaleFactor: 2, touch: true, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait', 'landscape'] },
  { id: 'ipad-pro', label: 'iPad Pro 12.9', width: 1024, height: 1366, deviceScaleFactor: 2, touch: true, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait', 'landscape'] },
  { id: 'android-tablet', label: 'Android tablet', width: 800, height: 1280, deviceScaleFactor: 2, touch: true, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait', 'landscape'] },
  // A regression device: the desktop look must not change. Fine pointer, no touch, one orientation.
  { id: 'desktop', label: 'Desktop 1440x900', width: 1440, height: 900, deviceScaleFactor: 1, touch: false, portraitInsets: NONE, landscapeInsets: NONE, orientations: ['portrait'] },
];

/**
 * Controls allowed to be smaller than 48px on touch (but never under 44px). Keep this list under
 * six entries; every entry needs a reason.
 */
export const TOUCH_ALLOWLIST: { match: RegExp; reason: string }[] = [
  { match: /^privacy$/i, reason: 'Inline footer link in a line of text; 44px tall is the Apple minimum and a larger box would break the line' },
];

export function viewportFor(device: Device, orientation: Orientation): { width: number; height: number; insets: Insets } {
  const landscape = orientation === 'landscape';
  return {
    width: landscape ? device.height : device.width,
    height: landscape ? device.width : device.height,
    insets: landscape ? device.landscapeInsets : device.portraitInsets,
  };
}

let warnedSafeArea = false;

/** Put the browser into the device's shape. Safe-area emulation is optional: older builds lack it. */
export async function applyDevice(cdp: Cdp, device: Device, orientation: Orientation): Promise<{ width: number; height: number; insets: Insets }> {
  const v = viewportFor(device, orientation);
  const landscape = orientation === 'landscape';
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: v.width,
    height: v.height,
    deviceScaleFactor: device.deviceScaleFactor,
    mobile: device.touch,
    screenOrientation: { type: landscape ? 'landscapePrimary' : 'portraitPrimary', angle: landscape ? 90 : 0 },
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: device.touch, maxTouchPoints: device.touch ? 5 : 0 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: device.touch, configuration: 'mobile' });
  try {
    const r = await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: v.insets.top, left: v.insets.left, bottom: v.insets.bottom, right: v.insets.right } });
    if (r.error) throw new Error(r.error.message ?? 'unsupported');
  } catch (e) {
    if (!warnedSafeArea) {
      warnedSafeArea = true;
      console.warn(`Safe-area emulation is not available in this browser build (${(e as Error).message}); safe-area assertions are skipped.`);
    }
    return { ...v, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
  }
  return v;
}
