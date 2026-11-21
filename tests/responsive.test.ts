import { describe, it, expect, vi } from 'vitest';
import { classifyWidth, isLitePerf, layoutFor, isShortLandscape } from '../src/ui/responsive/window-class';
import { isKeyboardOpen, keyboardInset, nextBaseline } from '../src/ui/responsive/keyboard-inset';
import { clampPan, clampZoom, pinchCenter, pinchDistance, renderRatio, zoomAbout } from '../src/ui/responsive/zoom';
import { enterFullscreen, exitFullscreen, fullscreenSupported, isNativeFullscreen } from '../src/ui/responsive/fullscreen';
import { haptic, HAPTIC_PATTERNS } from '../src/ui/haptics';
import { dragOffset, dragVelocity, shouldDismiss } from '../src/ui/responsive/sheet-drag';

describe('classifyWidth', () => {
  it.each([
    [359, 'compact'],
    [360, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [839, 'medium'],
    [840, 'expanded'],
    [1199, 'expanded'],
    [1200, 'large'],
  ])('%i px is %s', (w, cls) => {
    expect(classifyWidth(w)).toBe(cls);
  });
});

describe('layoutFor', () => {
  const devices: [string, number, number][] = [
    ['android-small', 360, 800],
    ['iphone', 390, 844],
    ['ipad-mini', 744, 1133],
    ['ipad', 820, 1180],
    ['ipad-pro', 1024, 1366],
    ['android-tablet', 800, 1280],
    ['desktop', 1440, 900],
  ];
  it('stacks every portrait device except the wide desktop', () => {
    for (const [name, w, h] of devices) expect(layoutFor(w, h), name).toBe(w > h ? 'split' : 'stack');
  });
  it('splits tablets in landscape', () => {
    expect(layoutFor(1133, 744)).toBe('split');
    expect(layoutFor(1180, 820)).toBe('split');
    expect(layoutFor(1366, 1024)).toBe('split');
    expect(layoutFor(1280, 800)).toBe('split');
  });
  it('splits phones in landscape (short and wide) but not phones in portrait', () => {
    expect(layoutFor(800, 360)).toBe('split');
    expect(layoutFor(844, 390)).toBe('split');
    expect(layoutFor(390, 844)).toBe('stack');
    expect(layoutFor(360, 800)).toBe('stack');
  });
  it('stacks a narrow Split View pane and a tall medium window', () => {
    expect(layoutFor(500, 400)).toBe('stack');
    expect(layoutFor(700, 900)).toBe('stack');
  });
  it('knows a short landscape window', () => {
    expect(isShortLandscape(844, 390)).toBe(true);
    expect(isShortLandscape(500, 390)).toBe(false);
    expect(isShortLandscape(900, 600)).toBe(false);
  });
});

describe('isLitePerf', () => {
  it('is lite on few cores, little memory or Save-Data', () => {
    expect(isLitePerf({ hardwareConcurrency: 4 })).toBe(true);
    expect(isLitePerf({ deviceMemory: 2 })).toBe(true);
    expect(isLitePerf({ saveData: true })).toBe(true);
    expect(isLitePerf({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(isLitePerf({})).toBe(false);
  });
});

describe('keyboard inset', () => {
  it('iOS: the keyboard overlays and the visual viewport shrinks', () => {
    const inset = keyboardInset({ layoutHeight: 844, visualHeight: 500, visualOffsetTop: 0 });
    expect(inset).toBe(344);
    expect(isKeyboardOpen(inset, 844)).toBe(true);
  });
  it('iOS: the page is scrolled inside the shrunken viewport', () => {
    expect(keyboardInset({ layoutHeight: 844, visualHeight: 500, visualOffsetTop: 100 })).toBe(244);
  });
  it('Android: the layout viewport shrinks with the keyboard, so there is no inset', () => {
    const inset = keyboardInset({ layoutHeight: 500, visualHeight: 500, visualOffsetTop: 0 });
    expect(inset).toBe(0);
    expect(isKeyboardOpen(inset, 500)).toBe(false);
  });
  it('no keyboard', () => {
    expect(keyboardInset({ layoutHeight: 844, visualHeight: 844, visualOffsetTop: 0 })).toBe(0);
    expect(isKeyboardOpen(0, 844)).toBe(false);
  });
  it('never goes negative (pinch zoom makes the visual viewport smaller than the layout one)', () => {
    expect(keyboardInset({ layoutHeight: 800, visualHeight: 400, visualOffsetTop: 500 })).toBe(0);
  });
  it('a browser toolbar change is not a keyboard', () => {
    expect(isKeyboardOpen(80, 844)).toBe(false);
    expect(isKeyboardOpen(130, 1000)).toBe(false);
  });
});

describe('zoom', () => {
  const size = { width: 400, height: 400 };
  it('clamps the scale to 1 to 4', () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(9)).toBe(4);
    expect(clampZoom(Number.NaN)).toBe(1);
  });
  it('keeps the point under the fingers fixed', () => {
    const start = { scale: 1, x: 0, y: 0 };
    const next = zoomAbout(start, { scale: 2, anchorX: 300, anchorY: 100, size });
    // content point (300,100) maps to anchorX*... screen = x + content * scale
    expect(next.x + 300 * next.scale).toBeCloseTo(300);
    expect(next.y + 100 * next.scale).toBeCloseTo(100);
  });
  it('keeps the anchor fixed from an already zoomed view', () => {
    const start = { scale: 2, x: -120, y: -60 };
    const content = { x: (200 - start.x) / start.scale, y: (150 - start.y) / start.scale };
    const next = zoomAbout(start, { scale: 3, anchorX: 200, anchorY: 150, size });
    expect(next.x + content.x * next.scale).toBeCloseTo(200);
    expect(next.y + content.y * next.scale).toBeCloseTo(150);
  });
  it('zooming out to 1 returns to the origin', () => {
    expect(zoomAbout({ scale: 3, x: -300, y: -200 }, { scale: 1, anchorX: 100, anchorY: 100, size })).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it('clampPan keeps the stage inside its frame', () => {
    expect(clampPan({ scale: 2, x: 50, y: 50 }, size)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(clampPan({ scale: 2, x: -999, y: -999 }, size)).toEqual({ scale: 2, x: -400, y: -400 });
    expect(clampPan({ scale: 2, x: -100, y: -200 }, size)).toEqual({ scale: 2, x: -100, y: -200 });
  });
  it('measures a pinch', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(pinchCenter({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe('haptic', () => {
  it('vibrates with the pattern for each kind', () => {
    const vibrate = vi.fn(() => true);
    expect(haptic('snap', { vibrate, reducedMotion: false })).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(12);
    haptic('win', { vibrate, reducedMotion: false });
    expect(vibrate).toHaveBeenLastCalledWith([20, 40, 20, 40, 80]);
    haptic('tap', { vibrate, reducedMotion: false });
    expect(vibrate).toHaveBeenLastCalledWith(8);
    expect(HAPTIC_PATTERNS.tap).toBe(8);
  });
  it('is silent where vibrate is missing (iOS)', () => {
    expect(haptic('snap', { reducedMotion: false })).toBe(false);
  });
  it('is silent when reduced motion is on', () => {
    const vibrate = vi.fn(() => true);
    expect(haptic('win', { vibrate, reducedMotion: true })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it('does not throw if vibrate throws', () => {
    expect(haptic('tap', { vibrate: () => { throw new Error('blocked'); }, reducedMotion: false })).toBe(false);
  });
});
describe('renderRatio', () => {
  it('is the device ratio, at most 3, when not zoomed', () => {
    expect(renderRatio(2, 1, 400)).toBe(2);
    expect(renderRatio(4, 1, 400)).toBe(3);
  });
  it('grows with the zoom but never passes 4', () => {
    expect(renderRatio(2, 1.5, 400)).toBe(3);
    expect(renderRatio(3, 4, 400)).toBe(4);
  });
  it('keeps the canvas under 4096 pixels a side', () => {
    expect(renderRatio(3, 4, 1500) * 1500).toBeLessThanOrEqual(4096);
  });
  it('copes with a missing device ratio and a zero size', () => {
    expect(renderRatio(Number.NaN, 2, 400)).toBe(2);
    expect(renderRatio(2, 1, 0)).toBe(2);
  });
});

describe('fullscreen', () => {
  it('is supported only when the document says it is enabled and the element can ask', () => {
    expect(fullscreenSupported({})).toBe(false);
    expect(fullscreenSupported({ fullscreenEnabled: true })).toBe(true);
    expect(fullscreenSupported({ webkitFullscreenEnabled: true }, {})).toBe(false);
    expect(fullscreenSupported({ webkitFullscreenEnabled: true }, { webkitRequestFullscreen: () => undefined })).toBe(true);
  });
  it('reads the native state with or without the webkit prefix', () => {
    expect(isNativeFullscreen({})).toBe(false);
    expect(isNativeFullscreen({ fullscreenElement: {} as Element })).toBe(true);
    expect(isNativeFullscreen({ webkitFullscreenElement: {} as Element })).toBe(true);
  });
  it('asks the element and reports whether it worked', async () => {
    const requestFullscreen = vi.fn(async () => undefined);
    expect(await enterFullscreen({ requestFullscreen }, { fullscreenEnabled: true })).toBe(true);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });
  it('falls back cleanly when the browser has no full screen or refuses', async () => {
    expect(await enterFullscreen({}, {})).toBe(false);
    expect(await enterFullscreen({ requestFullscreen: async () => { throw new Error('denied'); } }, { fullscreenEnabled: true })).toBe(false);
  });
  it('uses the webkit calls on iPad Safari', async () => {
    const webkitRequestFullscreen = vi.fn();
    expect(await enterFullscreen({ webkitRequestFullscreen }, { webkitFullscreenEnabled: true })).toBe(true);
    const webkitExitFullscreen = vi.fn();
    await exitFullscreen({ webkitFullscreenElement: {} as Element, webkitExitFullscreen });
    expect(webkitExitFullscreen).toHaveBeenCalledOnce();
  });
  it('does nothing when leaving while not in full screen', async () => {
    const exit = vi.fn(async () => undefined);
    await exitFullscreen({ exitFullscreen: exit });
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('nextBaseline', () => {
  it('keeps the tallest height at the same width, so a shrunk layout still reads as keyboard open', () => {
    const full = nextBaseline(null, 360, 800);
    const shrunk = nextBaseline(full, 360, 480);
    expect(shrunk.height).toBe(800);
    const inset = keyboardInset({ layoutHeight: shrunk.height, visualHeight: 480, visualOffsetTop: 0 });
    expect(isKeyboardOpen(inset, shrunk.height)).toBe(true);
  });
  it('starts over when the width changes (rotation)', () => {
    expect(nextBaseline({ width: 360, height: 800 }, 800, 360)).toEqual({ width: 800, height: 360 });
  });
});

describe('sheet drag rules', () => {
  it('follows the finger down and never above rest', () => {
    expect(dragOffset(-30)).toBe(0);
    expect(dragOffset(40)).toBe(40);
  });
  it('closes past 96 px, or on a fast fling, not on a small slow drag', () => {
    expect(shouldDismiss({ offset: 96, velocity: 0, height: 600 })).toBe(true);
    expect(shouldDismiss({ offset: 95, velocity: 0, height: 600 })).toBe(false);
    expect(shouldDismiss({ offset: 30, velocity: 0.8, height: 600 })).toBe(true);
    expect(shouldDismiss({ offset: 10, velocity: 2, height: 600 })).toBe(false);
    expect(shouldDismiss({ offset: 60, velocity: 0.1, height: 100 })).toBe(true);
  });
  it('measures speed over the last 100 ms only', () => {
    expect(dragVelocity([])).toBe(0);
    expect(dragVelocity([{ y: 0, t: 0 }, { y: 10, t: 500 }, { y: 70, t: 600 }])).toBeCloseTo(0.6);
    expect(dragVelocity([{ y: 0, t: 0 }, { y: 50, t: 0 }])).toBe(0);
  });
});