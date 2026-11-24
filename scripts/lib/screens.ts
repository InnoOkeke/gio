/**
 * The screens check:devices visits. Each one seeds localStorage like a returning child and then
 * opens the screen through the real UI. No screen calls the AI. A screen with open === null is an
 * empty slot that a later feature fills in: the runner reports it and moves on.
 */
import { ISLANDS } from '../../src/ui/path/islands';
import type { Cdp } from './cdp';
import { sleep } from './cdp';

export interface Screen {
  id: string;
  label: string;
  /** null = not built yet; the feature that adds it registers it here. */
  open: ((c: Cdp) => Promise<void>) | null;
  /** Where to look for the page to be ready; defaults to the studio title. */
  ready?: string;
}

const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const LITTLE_PROGRESS = ['l-walk', 'l-corner', 'l-square'];

function day(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface PathSeed {
  v: 1;
  quests: Record<string, { s: 'clean' | 'helped'; d: string }>;
  sailed: Record<string, string>;
  kept: string[];
  reviews: Record<string, never>;
  reviewedOn: null;
  tested: Record<string, string>;
  master: { little?: string; coder?: string };
}

function pathWith(quests: [string, 'clean' | 'helped', number][] = [], extra: Partial<PathSeed> = {}): { progress: string[]; path: PathSeed } {
  const q: PathSeed['quests'] = {};
  for (const [id, s, ago] of quests) q[id] = { s, d: day(-ago) };
  return { progress: quests.map(([id]) => id), path: { v: 1, quests: q, sailed: {}, kept: [], reviews: {}, reviewedOn: null, tested: {}, master: {}, ...extra } };
}

const draft = (code: string) => ({ title: 'My drawing', code });
const run = (c: Cdp) => c.click('button', 'Run');
const coder = { 'gio.mode': 'coder' };
const little = { 'gio.mode': 'little' };

/** Open the quest map from the studio header. */
async function openMap(c: Cdp): Promise<void> {
  await c.click('button', 'Quest map');
  await c.waitFor(`!!document.querySelector('#map-title')`);
  await sleep(500);
}

async function runAndWait(c: Cdp, selector: string): Promise<void> {
  await run(c);
  await c.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 8000);
  await sleep(500);
}

/** Gio's Adventure progress for a child who has already won some Maze Meadow levels. */
function adventureSeed(mode: 'coder' | 'little', won: string[], intros: string[] = ['maze']): Record<string, unknown> {
  const levels: Record<string, { stars: number; best: number; d: string }> = {};
  for (const id of won) levels[`${mode}:${id}`] = { stars: 3, best: 1, d: day(-2) };
  return { ...(mode === 'coder' ? coder : little), 'gio.adventure': { v: 1, levels, intros, bosses: [], critters: 0 } };
}
const MAZE_WON = ['maze-01', 'maze-02', 'maze-03', 'maze-04', 'maze-05', 'maze-06', 'maze-07'];
/** Every Maze level a mode plays is won, so the Woods and the River are open. */
const WAVE_A = ['maze', 'woods', 'river'];
const CODER_MAZE = [...MAZE_WON, 'maze-08'];
const LITTLE_MAZE = MAZE_WON.slice(0, 6);
const CODER_WOODS = [...CODER_MAZE, 'woods-01', 'woods-02', 'woods-03', 'woods-04', 'woods-06'];
const LITTLE_WOODS = [...LITTLE_MAZE, 'woods-01', 'woods-02', 'woods-03', 'woods-05', 'woods-06', 'woods-07'];
const RIVER_LOOK = 'REPEAT 6 [IFELSE AHEAD = "water [SWIM] [FD 50]]';
/** Press Go on an adventure level (the dock's Go on phones, the big Go button elsewhere). */
const adventureGo = (c: Cdp) => c.click('.adv-go, .dock-run', 'Go');
/** Type a plan and run it, then wait for the result card and let its stars finish popping. */
async function adventureRun(c: Cdp, plan: string): Promise<void> {
  await c.type(plan);
  await adventureGo(c);
  if (!(await c.waitFor(`!!document.querySelector('.adv-result')`, 20000))) throw new Error('the result card did not open');
  await sleep(1300);
}
const GAME = 'WHEN "up [FD 20]\nWHEN "right [RT 90]\nWHEN "space [FD 5]';

/** A first run can bring a new friend to say hello: send them off so the stage is what is on screen. */
async function dismissFriends(c: Cdp): Promise<void> {
  for (let k = 0; k < 4; k++) {
    // Friends arrive a moment after the drawing finishes.
    if (!(await c.waitFor(`!!document.querySelector('[aria-labelledby="friend-title"] button')`, k === 0 ? 2500 : 1200))) return;
    await c.evaluate(`document.querySelector('[aria-labelledby="friend-title"] button')?.click()`);
    await sleep(400);
  }
}

/** Waits until nothing (a friend saying hello, a toast) covers the middle of the stage. */
async function stageOnTop(c: Cdp): Promise<void> {
  const free = `(() => { const g = document.querySelector('.stage-gesture'); if (!g) return false; const r = g.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && g.contains(e); })()`;
  for (let k = 0; k < 20; k++) {
    if (await c.evaluate<boolean>(free)) return;
    await c.evaluate(`document.querySelector('[aria-labelledby="friend-title"] button')?.click()`);
    await sleep(400);
  }
  const what = await c.evaluate<string>(`(() => { const g = document.querySelector('.stage-gesture'); if (!g) return 'no stage'; const r = g.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? e.tagName + '.' + e.className + ' at ' + Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2) + ' of ' + innerWidth + 'x' + innerHeight : 'nothing'; })()`);
  throw new Error(`something stays on top of the stage: ${what}`);
}

/** Open the stage in full screen and check the overlay is on. */
async function openFocus(c: Cdp): Promise<void> {
  await dismissFriends(c);
  await c.click('button', 'Full screen');
  if (!(await c.waitFor(`!!document.querySelector('.studio-stage-pane[data-focus="true"]')`, 4000))) throw new Error('full screen did not open');
  await sleep(500);
  // Opening full screen is a deliberate jump, not a layout shift from loading.
  await c.evaluate(`window.__cls = 0`);
}

interface View {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const READ_VIEW = `(() => {
  const v = document.querySelector('.stage-view');
  const g = document.querySelector('.stage-gesture');
  if (!v || !g) return null;
  const m = new DOMMatrixReadOnly(getComputedStyle(v).transform);
  const r = g.getBoundingClientRect();
  return { scale: m.a, x: m.e, y: m.f, width: g.clientWidth, height: g.clientHeight, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2 };
})()`;

async function readView(c: Cdp): Promise<View> {
  const v = await c.evaluate<View>(READ_VIEW);
  if (!v) throw new Error('no stage view on the page');
  return v;
}

function expect(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

const GARDEN_OPEN = `!!document.querySelector('#garden-title')`;
const FOCUS_ON_GARDEN_BUTTON = `document.activeElement?.getAttribute('aria-label') === "Gio's garden"`;

async function openGarden(c: Cdp): Promise<void> {
  // A tap or click focuses the button in Chrome; element.click() alone would not, so focus it first.
  await c.evaluate(`[...document.querySelectorAll('button[aria-label="Gio\\'s garden"]')].find((b) => b.getBoundingClientRect().width > 0)?.focus()`);
  await c.click('button', "Gio's garden");
  expect(await c.waitFor(GARDEN_OPEN, 6000), 'the garden did not open');
  await sleep(700);
}

/**
 * (f) for sheets: on a phone the garden is anchored to the bottom and a real touch drag on its header
 * closes it; on every device a tap on the dark scrim and Escape close it; focus goes back to the button.
 */
async function sheetGestureChecks(c: Cdp): Promise<void> {
  await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS }, '?mode=coder');
  const facts = await c.evaluate<{ compact: boolean; coarse: boolean }>(`({ compact: document.documentElement.dataset.width === 'compact', coarse: matchMedia('(pointer: coarse)').matches })`);
  if (facts?.compact && facts.coarse) {
    await openGarden(c);
    const box = await c.evaluate<{ top: number; bottom: number; h: number; hx: number; hy: number }>(`(() => {
      const p = document.querySelector('.sheet-panel').getBoundingClientRect();
      const h = document.querySelector('.sheet-panel [data-sheet-header]').getBoundingClientRect();
      return { top: p.top, bottom: p.bottom, h: innerHeight, hx: h.left + 40, hy: h.top + h.height / 2 };
    })()`);
    expect(!!box && Math.abs(box.bottom - box.h) <= 2, `the garden sheet should be anchored to the bottom, it ends at ${box?.bottom} of ${box?.h}`);
    // Headless Edge can drop the first touch sequence after a load, so the drag is sent up to 3 times.
    for (let k = 0; k < 3 && (await c.evaluate<boolean>(GARDEN_OPEN)); k++) {
      await c.drag({ x: box!.hx, y: box!.hy }, { x: box!.hx, y: box!.hy + 260 }, 14);
      await sleep(700);
    }
    expect(!(await c.evaluate<boolean>(GARDEN_OPEN)), 'a swipe down on the sheet header did not close the garden');
    expect((await c.evaluate<boolean>(FOCUS_ON_GARDEN_BUTTON)) === true, 'focus did not return to the garden button after the swipe');
  }
  await openGarden(c);
  // The scrim shows to the left of the drawer on tablets and above the sheet on phones.
  const spot = await c.evaluate<{ x: number; y: number }>(`(() => { const p = document.querySelector('.sheet-panel').getBoundingClientRect(); return p.left > 40 ? { x: 20, y: innerHeight / 2 } : { x: innerWidth / 2, y: Math.max(4, p.top / 2) }; })()`);
  if (facts?.coarse) await c.tap(spot!.x, spot!.y);
  else {
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: spot!.x, y: spot!.y, button: 'left', clickCount: 1 });
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: spot!.x, y: spot!.y, button: 'left', clickCount: 1 });
  }
  await sleep(500);
  expect(!(await c.evaluate<boolean>(GARDEN_OPEN)), `a tap on the scrim at ${Math.round(spot!.x)},${Math.round(spot!.y)} did not close the garden`);
  await openGarden(c);
  await c.key('Escape', 'Escape', 27);
  await sleep(400);
  expect(!(await c.evaluate<boolean>(GARDEN_OPEN)), 'Escape did not close the garden');
  expect((await c.evaluate<boolean>(FOCUS_ON_GARDEN_BUTTON)) === true, 'focus did not return to the garden button after Escape');
  // Leave the sheet open so its layout is measured too.
  await openGarden(c);
  await c.evaluate(`window.__cls = 0`);
}

/** Master hotfix 30cbafa: long code scrolls inside the editor at every size and never covers the shelf or key row. */
async function longCodeChecks(c: Cdp): Promise<void> {
  const lines = Array.from({ length: 40 }, (_, i) => (i % 2 ? 'RT 9' : `FD ${10 + i}`)).join('\n');
  await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(lines) }, '?mode=coder');
  expect(await c.waitFor(`document.querySelectorAll('.cm-line').length > 0`, 8000), 'the editor did not load');
  await sleep(500);
  const r = await c.evaluate<{ editor: number; vh: number; scrolls: boolean; fits: boolean; overlap: string }>(`(() => {
    const ed = document.querySelector('.cm-editor');
    const sc = document.querySelector('.cm-scroller');
    const e = ed.getBoundingClientRect();
    const hit = (sel) => [...document.querySelectorAll(sel)].some((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.left < e.right && b.right > e.left && b.top < e.bottom - 1 && b.bottom > e.top + 1; });
    const overlap = ['.command-shelf', '.key-row'].filter(hit).join(', ');
    return { editor: e.height, vh: innerHeight, scrolls: sc.scrollHeight > sc.clientHeight + 4, fits: sc.scrollHeight <= sc.clientHeight + 4, overlap };
  })()`);
  expect(!!r, 'could not measure the editor');
  expect(!r!.overlap, `the editor overlaps ${r!.overlap}`);
  expect(r!.editor <= r!.vh, `the editor is ${Math.round(r!.editor)}px tall, taller than the ${r!.vh}px screen, so long code is not scrolling inside it`);
  expect(r!.scrolls || r!.fits, 'the editor neither scrolls nor fits its code');
}

/** Pinch out, pan, check the pan stays inside the frame, then double-tap back to the whole picture. */
async function pinchChecks(c: Cdp): Promise<void> {
  const coarse = (await c.evaluate<boolean>(`matchMedia('(pointer: coarse)').matches`)) === true;
  await stageOnTop(c);
  const start = await readView(c);
  expect(start.scale === 1, `the stage should start at scale 1, not ${start.scale}`);
  const center = { x: start.centerX, y: start.centerY };
  if (coarse) {
    // Headless Edge sometimes drops the first emulated touch sequence after a page load; the app
    // never sees a pointerdown then, so the pinch is sent again rather than judged.
    await c.evaluate(`window.__touches = 0; document.addEventListener('pointerdown', () => window.__touches++, true)`);
    for (let k = 0; k < 3; k++) {
      await c.pinch(center, Math.min(60, start.width / 5), Math.min(start.width * 0.8, 260));
      await sleep(400);
      if ((await readView(c)).scale > 1) break;
    }
  } else {
    await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: center.x, y: center.y, deltaX: 0, deltaY: -300, modifiers: 2 });
    await sleep(100);
  }
  await sleep(500);
  const zoomed = await readView(c);
  const seen = await c.evaluate<number>(`window.__touches ?? -1`);
  expect(zoomed.scale > 1.5, `pinch out should zoom past 1.5, got ${zoomed.scale.toFixed(2)} (${seen} pointers reached the page at ${Math.round(center.x)},${Math.round(center.y)})`);
  const first = { x: center.x + 20, y: center.y + 20 };
  if (coarse) {
    for (let k = 0; k < 3; k++) {
      await c.drag(first, { x: first.x - 60, y: first.y - 40 });
      await sleep(200);
      const v = await readView(c);
      if (v.x !== zoomed.x || v.y !== zoomed.y) break;
    }
  }
  else await dragMouse(c, first, { x: first.x - 60, y: first.y - 40 });
  await sleep(300);
  const panned = await readView(c);
  expect(panned.x !== zoomed.x || panned.y !== zoomed.y, 'one finger should pan once zoomed in');
  if (coarse) await c.drag({ x: center.x + 40, y: center.y + 40 }, { x: center.x - 2000, y: center.y - 2000 }, 8);
  else await dragMouse(c, { x: center.x + 40, y: center.y + 40 }, { x: center.x - 2000, y: center.y - 2000 });
  await sleep(300);
  const far = await readView(c);
  const minX = far.width * (1 - far.scale);
  const minY = far.height * (1 - far.scale);
  expect(far.x <= 0.5 && far.x >= minX - 0.5 && far.y <= 0.5 && far.y >= minY - 0.5, `pan left the frame: x ${far.x.toFixed(1)}, y ${far.y.toFixed(1)}, limits ${minX.toFixed(1)}`);
  if (coarse) {
    // Two quick taps; tried twice because a busy machine can stretch the gap past a double tap.
    for (let k = 0; k < 2 && (await readView(c)).scale !== 1; k++) {
      await sleep(400);
      await c.tap(center.x, center.y);
      await sleep(30);
      await c.tap(center.x, center.y);
      await sleep(200);
    }
  } else {
    for (let k = 0; k < 2; k++) {
      await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: center.x, y: center.y, button: 'left', clickCount: k + 1 });
      await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: center.x, y: center.y, button: 'left', clickCount: k + 1 });
      await sleep(60);
    }
  }
  await sleep(300);
  const reset = await readView(c);
  expect(reset.scale === 1, `double-tap should go back to the whole picture, scale is ${reset.scale.toFixed(2)}`);
  // The zoom buttons work with a mouse or keyboard.
  await c.click('button', 'Zoom in');
  await sleep(150);
  expect((await readView(c)).scale > 1, 'the + button should zoom in');
  await c.click('button', 'Fit the whole drawing');
  await sleep(150);
  expect((await readView(c)).scale === 1, 'Fit should go back to the whole picture');
}

async function dragMouse(c: Cdp, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 8; i++) {
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8, button: 'left', buttons: 1 });
    await sleep(16);
  }
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 });
}

/** A game keeps answering the arrow keys while the stage is zoomed, and one finger never pans it. */
async function gameWhileZoomed(c: Cdp): Promise<void> {
  // Small screens offer full screen when a game starts; say "Not now" like a child who wants to stay.
  await c.evaluate(`document.querySelector('.focus-offer button[aria-label="Not now"]')?.click()`);
  await sleep(200);
  await stageOnTop(c);
  const start = await readView(c);
  await c.click('button', 'Zoom in');
  await c.click('button', 'Zoom in');
  await sleep(300);
  const zoomed = await readView(c);
  expect(zoomed.scale > 1.5, `zoom in should work during a game, scale is ${zoomed.scale.toFixed(2)}`);
  const turtle = () => c.evaluate<string>(`document.querySelector('.turtle')?.style.transform ?? ''`);
  const before = await turtle();
  await c.key('ArrowUp', 'ArrowUp', 38);
  await sleep(700);
  const after = await turtle();
  expect(before !== after, 'the up arrow should still move the game turtle while zoomed');
  const coarse = (await c.evaluate<boolean>(`matchMedia('(pointer: coarse)').matches`)) === true;
  if (coarse) {
    await c.drag({ x: start.centerX + 30, y: start.centerY + 30 }, { x: start.centerX - 40, y: start.centerY - 40 });
    await sleep(300);
    const still = await readView(c);
    expect(still.x === zoomed.x && still.y === zoomed.y, 'one finger must not pan the stage while a game runs');
  }
}
/* ---- FEAT-003: block drag and drop, on-screen keyboard, hardware keys ---- */

type Pt = { x: number; y: number };
const center = (r: { x: number; y: number; width: number; height: number }): Pt => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
async function rectOf(c: Cdp, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const r = await c.evaluate<{ x: number; y: number; width: number; height: number } | null>(
    `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
  );
  if (!r) throw new Error(`nothing matches ${selector}`);
  return r;
}
const touchAt = (c: Cdp, type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Pt) =>
  c.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });

/**
 * A real touch drag: press, hold past the 150ms long-press, move a little so the drag starts, wait
 * for the drop zones to grow, then glide to wherever `target` says the zone is now.
 */
async function touchDrag(c: Cdp, from: Pt, target: () => Promise<Pt>): Promise<void> {
  const coarse = (await c.evaluate<boolean>(`matchMedia('(pointer: coarse)').matches`)) === true;
  if (!coarse) {
    // Desktop: a mouse drag (the pointer sensor starts after 6px).
    const to0 = await target();
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 });
    let at = from;
    for (let i = 1; i <= 14; i++) {
      const to = i === 1 ? to0 : await target();
      at = { x: at.x + (to.x - at.x) / (15 - i), y: at.y + (to.y - at.y) / (15 - i) };
      await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'left', buttons: 1 });
      await sleep(24);
    }
    await sleep(250);
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    await sleep(500);
    return;
  }
  await touchAt(c, 'touchStart', from);
  await sleep(260);
  for (let i = 1; i <= 4; i++) {
    await touchAt(c, 'touchMove', { x: from.x, y: from.y - i * 4 });
    await sleep(30);
  }
  await sleep(300);
  // The list may autoscroll while the finger moves, so the target is read again on every step
  // and the finger rests on it until it stops moving.
  let at = { x: from.x, y: from.y - 16 };
  for (let i = 1; i <= 14; i++) {
    const to = await target();
    at = { x: at.x + (to.x - at.x) / (15 - i), y: at.y + (to.y - at.y) / (15 - i) };
    await touchAt(c, 'touchMove', at);
    await sleep(24);
  }
  for (let k = 0; k < 8; k++) {
    const to = await target();
    if (Math.abs(to.x - at.x) < 2 && Math.abs(to.y - at.y) < 2) break;
    at = to;
    await touchAt(c, 'touchMove', at);
    await sleep(80);
  }
  await sleep(250);
  await touchAt(c, 'touchEnd');
  await sleep(500);
}

const blocksLogo = (c: Cdp) =>
  c.evaluate<string>(`(document.querySelector('pre[aria-label="Your blocks as Logo code"]')?.textContent ?? '').replace(/\\[/g, '[ ').replace(/\\]/g, ' ]').replace(/\\s+/g, ' ').trim()`);

/** Scroll an element to the middle of the screen (or of its scroller) and give back its centre. */
async function reveal(c: Cdp, selector: string): Promise<Pt> {
  await c.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center', inline: 'nearest' })`);
  await sleep(200);
  return center(await rectOf(c, selector));
}

async function dropInto(c: Cdp, from: string, slot: string, expect_: string, what: string): Promise<void> {
  const before = await blocksLogo(c);
  await c.evaluate(`window.__dragTouches = 0; document.addEventListener('touchstart', () => window.__dragTouches++, true)`);
  // Headless Edge sometimes drops the first emulated touch sequence after a page load (see the
  // pinch check). When the program did not change at all, the drag is sent once more.
  for (let attempt = 0; attempt < 2; attempt++) {
    const start = await reveal(c, from);
    let first = true;
    await touchDrag(c, start, async () => {
      if (!first) return center(await rectOf(c, slot));
      first = false;
      return reveal(c, slot);
    });
    if ((await blocksLogo(c)) !== before) break;
  }
  const got = await blocksLogo(c);
  if (got !== expect_) {
    const where = await c.evaluate<string>(`(() => { const p = document.querySelector('.blocks-program')?.getBoundingClientRect(); return 'program ' + (p ? Math.round(p.top) + '-' + Math.round(p.bottom) : '?') + ', viewport ' + innerWidth + 'x' + innerHeight + ', touches seen ' + (window.__dragTouches ?? '?') + ', scrollY ' + Math.round(scrollY); })()`);
    throw new Error(`${what}: expected "${expect_}", got "${got}" (${where})`);
  }
}

/** Drag from the palette into a Repeat, reorder with a handle, and drop into a nested Repeat. */
async function blockDragChecks(c: Cdp): Promise<void> {
  await c.waitFor(`!!document.querySelector('.palette-tile')`, 10000);
  // Earlier screens (pinch, double-tap) can leave the emulated touch input in a half-finished
  // state; switch it off and on and tap an empty spot so the drags start from a clean slate.
  const coarse = (await c.evaluate<boolean>(`matchMedia('(pointer: coarse)').matches`)) === true;
  if (coarse) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const blank = await rectOf(c, '.panel-header h2');
    await c.tap(blank.x + 4, blank.y + 4);
    await sleep(400);
  }
  await c.click('button', 'See the code');
  await sleep(300);
  const start = await blocksLogo(c);
  expect(start === 'REPEAT 4 [ FD 50 REPEAT 3 [ RT 10 ] ] FD 5', `the seeded program changed shape: "${start}"`);
  // A quick vertical swipe on a palette tile scrolls; it must not add a block.
  const tile = await reveal(c, '.palette-tile');
  await c.swipe(tile, { x: tile.x, y: tile.y - 60 });
  await sleep(300);
  const swiped = await blocksLogo(c);
  expect(swiped === start, `a quick swipe on the palette added or moved a block: ${swiped} (tile at ${Math.round(tile.x)},${Math.round(tile.y)})`);
  // 1. Palette tile into the end of the outer Repeat.
  await c.evaluate(`[...document.querySelectorAll('.palette-tile')].find((e) => e.textContent.includes('Turn left'))?.setAttribute('data-test', 'turn-left')`);
  await dropInto(c, '[data-test="turn-left"]', '[data-slot="0:2"]', 'REPEAT 4 [ FD 50 REPEAT 3 [ RT 10 ] LT 90 ] FD 5', 'palette tile into the Repeat');
  // 2. Reorder: the new block's handle to the start of the same Repeat.
  await dropInto(c, '[data-block-path="0.2"]', '[data-slot="0:0"]', 'REPEAT 4 [ LT 90 FD 50 REPEAT 3 [ RT 10 ] ] FD 5', 'reordering with the handle');
  // 3. A top-level block into the nested Repeat.
  await dropInto(c, '[data-block-path="1"]', '[data-slot="0.2:1"]', 'REPEAT 4 [ LT 90 FD 50 REPEAT 3 [ RT 10 FD 5 ] ]', 'dropping into the nested Repeat');
  await c.evaluate(`window.scrollTo(0, 0); document.querySelector('.blocks-program')?.scrollTo(0, 0)`);
  await sleep(300);
  await c.evaluate(`window.__cls = 0`);
}

/** Make the layout viewport as tall as the page is with the keyboard up (the Android Chrome way). */
async function pressKeyboardUp(c: Cdp): Promise<{ full: number; kept: number }> {
  const m = await c.evaluate<{ w: number; h: number; dpr: number; touch: boolean }>(`({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touch: matchMedia('(pointer: coarse)').matches })`);
  if (!m) throw new Error('no viewport');
  const tablet = m.w >= 600 && m.h >= 700;
  const shrink = tablet ? 380 : m.h > m.w ? 300 : Math.round(m.h * 0.45);
  const landscape = m.w > m.h;
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: m.w,
    height: m.h - shrink,
    deviceScaleFactor: m.dpr,
    mobile: m.touch,
    screenOrientation: { type: landscape ? 'landscapePrimary' : 'portraitPrimary', angle: landscape ? 90 : 0 },
  });
  return { full: m.h, kept: m.h - shrink };
}

interface KeyboardFacts {
  keyboard: string;
  keyRow: { top: number; bottom: number } | null;
  caretBottom: number | null;
  stageHeight: number;
  vvh: number;
  visibleLines: number;
  focused: boolean;
  text: string;
}
const KEYBOARD_FACTS = `(() => {
  const kr = document.querySelector('.key-row')?.getBoundingClientRect();
  const line = document.querySelector('.cm-activeLine')?.getBoundingClientRect();
  const scroller = document.querySelector('.cm-scroller')?.getBoundingClientRect();
  const lines = [...document.querySelectorAll('.cm-line')].filter((l) => { const r = l.getBoundingClientRect(); return scroller && r.top >= scroller.top - 1 && r.bottom <= Math.min(scroller.bottom, (kr ? kr.top : innerHeight)) + 1; }).length;
  const stage = document.querySelector('.studio-stage-box')?.getBoundingClientRect();
  return {
    keyboard: document.documentElement.dataset.keyboard ?? '',
    keyRow: kr ? { top: kr.top, bottom: kr.bottom } : null,
    caretBottom: line ? line.bottom : null,
    stageHeight: stage ? stage.height : 0,
    vvh: window.visualViewport ? window.visualViewport.height : innerHeight,
    visibleLines: lines,
    focused: !!document.activeElement && document.activeElement.classList.contains('cm-content'),
    text: document.querySelector('.cm-content')?.textContent ?? '',
  };
})()`;
const readKeyboard = (c: Cdp) => c.evaluate<KeyboardFacts>(KEYBOARD_FACTS).then((f) => f as KeyboardFacts);

/** Leaves the browser at the keyboard-up height so the layout facts are read with the keyboard open; the runner re-applies the device before the next screen. */
async function keyboardChecks(c: Cdp): Promise<void> {
  await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('') }, '?mode=coder');
  await c.waitFor(`!!document.querySelector('.cm-content')`, 10000);
  const coarse = (await c.evaluate<boolean>(`matchMedia('(pointer: coarse)').matches`)) === true;
  if (!coarse) return; // The key row and the collapsed stage are for touch screens.

  // An overlay keyboard (iOS Safari) shrinks only the visual viewport. Headless Edge may not
  // support that; when the visual viewport does not move, say so and rely on the unit tests.
  const probe = await c.send('Emulation.setVisibleSize', { width: await c.evaluate<number>('innerWidth'), height: Math.round(((await c.evaluate<number>('innerHeight')) ?? 600) * 0.6) });
  const shrunk = (await c.evaluate<boolean>(`!!window.visualViewport && window.visualViewport.height < innerHeight - 50`)) === true;
  // setVisibleSize resizes the headless window; put it back so later touches land inside it.
  await c.send('Emulation.setVisibleSize', { width: 1600, height: 1600 });
  if (probe.error || !shrunk) console.warn('  keyboard-editor: this browser cannot shrink only the visual viewport; the iOS overlay case is covered by the keyboardInset unit tests.');
  else {
    await c.evaluate(`document.querySelector('.cm-content')?.focus()`);
    await sleep(500);
    const o = await readKeyboard(c);
    const vvBottom = await c.evaluate<number>(`window.visualViewport.offsetTop + window.visualViewport.height`);
    expect(o.keyRow !== null && o.keyRow.bottom <= (vvBottom ?? 0) + 1, `overlay keyboard: the key row sits below the visible area (bottom ${o.keyRow?.bottom}, visible ${vvBottom})`);
  }

  const { full, kept } = await pressKeyboardUp(c);
  await sleep(700);
  await c.evaluate(`document.querySelector('.cm-content')?.focus()`);
  for (let i = 1; i <= 8; i++) {
    await c.type(`FD ${i * 10}`);
    await c.key('Enter', 'Enter', 13);
  }
  await sleep(600);
  const f = await readKeyboard(c);
  const where = `(layout ${full} -> ${kept}px)`;
  expect(f.keyboard === 'open', `the page should know the keyboard is open ${where}`);
  expect(f.keyRow !== null, `the command key row should be showing ${where}`);
  expect(f.keyRow!.bottom <= kept + 1, `the key row is below the viewport ${where}: bottom ${f.keyRow!.bottom}`);
  expect(f.caretBottom !== null && f.caretBottom <= f.keyRow!.top + 1, `the caret line (bottom ${f.caretBottom}) is under the key row (top ${f.keyRow!.top}) ${where}`);
  expect(f.stageHeight <= f.vvh * 0.3 + 6, `the stage should shrink to 30% of the visible height ${where}: ${Math.round(f.stageHeight)}px of ${Math.round(f.vvh)}px`);
  // Phones in landscape have almost no height left: two lines is the honest floor there.
  const needLines = kept >= 400 ? 4 : 2;
  expect(f.visibleLines >= needLines, `only ${f.visibleLines} editor lines are visible, need ${needLines} ${where}`);
  // Tapping a key types, and the editor keeps focus (so the keyboard stays up).
  const before = f.text.length;
  for (let k = 0; k < 2; k++) {
    const key = await rectOf(c, '.key-row-key[aria-label^="Type FD"]');
    await c.tap(key.x + key.width / 2, key.y + key.height / 2);
    await sleep(300);
    if ((await readKeyboard(c)).text.length > before) break;
  }
  const after = await readKeyboard(c);
  expect(after.text.length > before, 'tapping the FD key did not type anything');
  expect(after.focused, 'the editor lost focus when a key was tapped, so the keyboard would close');
}

/** Tab, arrows and Escape in the editor with a hardware keyboard, while a game is listening for arrows. */
async function hardwareKeyChecks(c: Cdp): Promise<void> {
  await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(GAME) }, '?mode=coder');
  const m = await c.evaluate<{ w: number; coarse: boolean }>(`({ w: innerWidth, coarse: matchMedia('(pointer: coarse)').matches })`);
  if (!m?.coarse || m.w < 600) return; // iPad and Android tablets with a keyboard
  await runAndWait(c, '[aria-label="Game controls"]');
  await dismissFriends(c);
  await c.evaluate(`document.querySelector('.focus-offer button[aria-label="Not now"]')?.click(); document.querySelector('.cm-content')?.focus()`);
  await sleep(300);
  const line = () => c.evaluate<string>(`document.querySelector('.cm-activeLine')?.textContent ?? ''`);
  const turtle = () => c.evaluate<string>(`document.querySelector('.turtle')?.style.transform ?? ''`);
  const length = () => c.evaluate<number>(`document.querySelector('.cm-content')?.textContent.length ?? 0`);
  await c.key('ArrowUp', 'ArrowUp', 38);
  await c.key('ArrowUp', 'ArrowUp', 38);
  await c.key('ArrowUp', 'ArrowUp', 38);
  const top = await line();
  const turtleBefore = await turtle();
  await c.key('ArrowDown', 'ArrowDown', 40);
  await sleep(500);
  expect((await line()) !== top, 'the arrow keys should move the caret in the editor');
  expect((await turtle()) === turtleBefore, 'the game took the arrow keys that were meant for the editor');
  const len = await length();
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, text: '\t' });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(250);
  expect(((await length()) ?? 0) > (len ?? 0), 'Tab should indent in the editor');
  await c.key('Escape', 'Escape', 27);
  await sleep(250);
  expect((await c.evaluate<boolean>(`!document.activeElement?.closest('.cm-editor')`)) === true, 'Escape should leave the editor');
}
export const SCREENS: Screen[] = [
  { id: 'mode-picker', label: 'Mode picker', ready: 'h1', open: (c) => c.seed({}, '', 'h1') },
  { id: 'little-empty', label: 'Little studio, empty (first-win offer)', open: (c) => c.seed(little, '?mode=little') },
  {
    id: 'little-blocks',
    label: 'Little studio, six blocks with a nested Repeat',
    open: (c) => c.seed({ ...little, 'gio.progress': LITTLE_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 50 RT 90]\nFD 30\nRT 45\nFD 20') }, '?mode=little'),
  },
  {
    id: 'coder-logo',
    label: 'Coder studio, Logo tab with code',
    open: (c) => c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]\nPU\nFD 40\nPD') }, '?mode=coder'),
  },
  {
    id: 'coder-python',
    label: 'Coder studio, Python tab',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await c.click('[role=tab]', 'Python');
      await sleep(400);
    },
  },
  {
    id: 'coder-javascript',
    label: 'Coder studio, JavaScript tab',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await c.click('[role=tab]', 'JavaScript');
      await sleep(400);
    },
  },
  {
    id: 'music-blocks',
    label: 'Little studio, Music group open and a note block selected (note picker)',
    open: async (c) => {
      await c.seed({ ...little, 'gio.progress': LITTLE_PROGRESS, 'gio.draft': draft('PLAY [C D E]\nFRAME\nWAIT 60') }, '?mode=little');
      await dismissFriends(c);
      await c.click('[role=tab]', 'Music');
      await sleep(300);
      await c.click('.block-pill');
      await sleep(400);
    },
  },
  {
    id: 'coder-error',
    label: 'Coder studio with an error bubble',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('FD 100 FOO') }, '?mode=coder');
      await runAndWait(c, '.bubble-problem');
    },
  },
  {
    id: 'quest-active',
    label: 'Quest active with a target drawing',
    open: async (c) => {
      await c.seed({ ...coder }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(400);
      await c.click('button', 'Quest ');
      await sleep(900);
      await c.evaluate(`window.__cls = 0`);
      await sleep(700);
    },
  },
  {
    id: 'skill-check',
    label: 'Skill-check banner',
    open: async (c) => {
      await c.seed({ ...coder }, '?mode=coder');
      await openMap(c);
      await c.click('button', 'Skip ahead');
      await sleep(400);
      await c.click('button', 'Start the skill check');
      await sleep(900);
      // the map closing and the quest card arriving follow the tap; only movement after that is judged
      await c.evaluate(`window.__cls = 0`);
      await sleep(300);
    },
  },
  {
    id: 'game',
    label: 'A running game with the game pad',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(GAME) }, '?mode=coder');
      await runAndWait(c, '[aria-label="Game controls"]');
    },
  },
  {
    id: 'save-menu',
    label: 'Save menu open',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await c.click('button[aria-haspopup=dialog]', 'Picture');
      await sleep(600);
    },
  },
  {
    id: 'friend-dialog',
    label: 'Friend dialog',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': ['c-line', 'c-square', 'c-rectangle', 'c-triangle'] }, '?mode=coder');
      await openMap(c);
      await c.click('button', 'Loop Lagoon');
      await sleep(400);
      await c.click('button', 'Loop it');
      await sleep(400);
      await c.type('REPEAT 4 [FD 100 RT 90]');
      await run(c);
      if (!(await c.waitFor(`!!document.querySelector('[aria-labelledby="friend-title"]')`, 12000))) throw new Error('the friend dialog did not open'); // the quest card changes when the run ends; only the dialog's own movement is judged
      await sleep(900); // let the quest card and stage finish settling behind the dialog before the shift counter is reset
      await c.evaluate(`window.__cls = 0`);
      await sleep(700);
    },
  },
  {
    id: 'garden-sheet',
    label: "Gio's garden sheet",
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS }, '?mode=coder');
      await c.click('button', "Gio's garden");
      await c.waitFor(`!!document.querySelector('#garden-title')`);
      await sleep(700);
    },
  },
  {
    id: 'map-list',
    label: 'Adventure map list',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 5], ['c-ell', 'clean', 4]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
    },
  },
  {
    id: 'island-sheet',
    label: 'Island sheet with its unit list',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 5], ['c-ell', 'clean', 4]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(700);
    },
  },
  {
    id: 'mastery-moment',
    label: 'Mastery moment',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 2]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(400);
      await c.click('button', 'Quest 2: The letter L');
      await sleep(700);
      await c.type('FD 100 RT 90 FD 60');
      await c.click('[role=radio]', 'Fast');
      await run(c);
      if (!(await c.waitFor(`!!document.querySelector('[aria-labelledby="moment-title"]')`, 20000))) throw new Error('the mastery moment did not open'); // the quest card changes when the run ends; only the dialog's own movement is judged
      await sleep(900); // let the quest card and stage finish settling behind the dialog before the shift counter is reset
      await c.evaluate(`window.__cls = 0`);
      await sleep(900);
    },
  },
  {
    id: 'certificate',
    label: 'Certificate with a name',
    ready: '#cert-name',
    open: async (c) => {
      const s = pathWith([]);
      for (const island of ISLANDS.coder) s.path.sailed[island.key] = day(-30);
      s.path.master = { coder: day(-1) };
      await c.seed({ ...coder, 'gio.path': s.path, 'gio.certificate': { v: 1, name: 'Ada Lovelace' } }, 'certificate', '#cert-name');
    },
  },
  { id: 'privacy', label: 'Privacy', ready: 'h1', open: (c) => c.seed({ ...coder }, 'privacy', 'h1') },
  { id: 'not-found', label: 'Not found', ready: 'h1', open: (c) => c.seed({ ...coder }, 'nothing-here', 'h1') },
  {
    id: 'replay-dialog',
    label: 'Replay (movie) dialog',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await c.click('button[aria-haspopup=dialog]', 'Picture');
      await sleep(500);
      await c.click('[role=dialog] button', 'Movie');
      if (!(await c.waitFor(`!!document.querySelector('#replay-title')`, 10000))) throw new Error('the replay dialog did not open');
      // The dialog stacks its phases in one panel: judge the finished movie, not the progress bar that precedes it.
      await c.waitFor(`!!document.querySelector('#replay-title') && /ready|Oh no/.test(document.querySelector('#replay-title').textContent)`, 20000);
      await sleep(900);
    },
  },
  {
    id: 'more-menu',
    label: 'More menu (phones; tablets have no More button and show the Save menu instead)',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      const hasMore = await c.evaluate<boolean>(`!!document.querySelector('button[aria-label="More"]')`);
      if (hasMore) await c.click('button[aria-label="More"]');
      else await c.click('button[aria-haspopup=dialog]', 'Picture');
      if (!(await c.waitFor(`!!document.querySelector('[role=dialog][aria-modal=true]')`, 4000))) throw new Error('the menu did not open');
      await sleep(600);
    },
  },
  {
    id: 'ask-sheet',
    label: 'Ask Gio: a bottom sheet on phones, a fold on tablets, always open on large screens',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS }, '?mode=coder');
      const opener = await c.evaluate<boolean>(`[...document.querySelectorAll('button')].some((b) => /Ask Gio/.test((b.getAttribute('aria-label') ?? '') + (b.textContent ?? '')) && b.getBoundingClientRect().width > 0)`);
      if (opener) await c.click('button', 'Ask Gio');
      await sleep(600);
    },
  },
  { id: 'sheet-gestures', label: 'Sheets: swipe down, scrim tap and Escape close the garden and return focus', open: sheetGestureChecks },
  { id: 'long-code', label: 'A 40-line program scrolls inside the editor and never covers the command shelf', open: longCodeChecks },
  // Empty slots, filled in by the feature that builds them.
  {
    id: 'watch-mode',
    label: 'Full-screen watch mode',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await openFocus(c);
    },
  },
  {
    id: 'game-focus',
    label: 'A running game in full screen with the game pad',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(GAME) }, '?mode=coder');
      await runAndWait(c, '[aria-label="Game controls"]');
      await openFocus(c);
    },
  },
  // Before stage-pinch: headless Edge touch emulation misreads fast swipes after the pinch screen (FEAT-003).
  {
    id: 'block-drag',
    label: 'Little studio: drag from the palette, reorder with a handle, drop into a nested Repeat',
    open: async (c) => {
      await c.seed({ ...little, 'gio.progress': LITTLE_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 50 REPEAT 3 [RT 10]]\nFD 5') }, '?mode=little');
      await dismissFriends(c);
      await blockDragChecks(c);
    },
  },
  {
    id: 'stage-pinch',
    label: 'Pinch, pan and double-tap on the stage, game keys while zoomed',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await dismissFriends(c);
      await pinchChecks(c);
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(GAME) }, '?mode=coder');
      await runAndWait(c, '[aria-label="Game controls"]');
      await dismissFriends(c);
      await gameWhileZoomed(c);
      await c.evaluate(`window.__cls = 0`);
    },
  },
  // Gio's Adventure (FEAT-4). The world map, a level before and after Go, and the cards over it.
  { id: 'adventure-map', label: "Gio's Adventure: the world map", ready: '.adv-hero', open: (c) => c.seed(adventureSeed('coder', ['maze-01', 'maze-02', 'maze-03']), 'adventure', '.adv-hero') },
  {
    id: 'adventure-realm',
    label: 'Adventure map: the levels of a world (a sheet on phones, beside the trail on wide screens)',
    ready: '.adv-hero',
    open: async (c) => {
      await c.seed(adventureSeed('coder', ['maze-01', 'maze-02', 'maze-03']), 'adventure', '.adv-hero');
      await c.click('button.adv-realm', 'Maze Meadow');
      if (!(await c.waitFor(`!!document.querySelector('.adv-tile')`, 6000))) throw new Error('no level tiles');
      await sleep(600);
    },
  },
  { id: 'adventure-level', label: 'Adventure level before Go (Turtle Coders)', ready: '.adv-scene-box', open: (c) => c.seed(adventureSeed('coder', ['maze-01']), 'adventure/maze-02', '.adv-scene-box') },
  { id: 'adventure-intro', label: "Adventure: the first visit to a world", ready: '.adv-intro', open: (c) => c.seed(adventureSeed('coder', [], []), 'adventure/maze-01', '.adv-intro') },
  {
    id: 'adventure-win',
    label: 'Adventure: result card after a win',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', ['maze-01']), 'adventure/maze-02', '.adv-scene-box');
      await c.click('[role=radio], button[aria-label^="Speed"]', 'Speed');
      await adventureRun(c, 'FD 100\nRT 90\nFD 200');
    },
  },
  {
    id: 'adventure-lose',
    label: 'Adventure: result card after a plan that walks off the map',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', ['maze-01']), 'adventure/maze-02', '.adv-scene-box');
      await adventureRun(c, 'FD 100\nLT 90\nFD 200');
    },
  },
  {
    id: 'adventure-hint',
    label: 'Adventure: the hint ladder with its dotted trail',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', ['maze-01', 'maze-02']), 'adventure/maze-03', '.adv-scene-box');
      await c.click('button', 'Hint');
      await c.waitFor(`!!document.querySelector('#adv-hint-title')`, 6000);
      await c.click('[role=dialog] button', 'Another hint');
      await sleep(600);
    },
  },
  {
    id: 'adventure-describe',
    label: 'Adventure: the map described in words',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', ['maze-01']), 'adventure/maze-02', '.adv-scene-box');
      await c.click('button', 'Describe the map');
      await c.waitFor(`!!document.querySelector('#adv-describe-title')`, 6000);
      await sleep(500);
    },
  },
  { id: 'adventure-boss', label: 'Adventure: a boss level with the Hedge Giant (Turtle Coders)', ready: '.adv-scene-box', open: (c) => c.seed(adventureSeed('coder', MAZE_WON), 'adventure/maze-08', '.adv-scene-box') },
  { id: 'adventure-watch', label: 'Adventure: watch mode (the scene fills the screen)', ready: '.adv-scene-box', open: async (c) => {
    await c.seed(adventureSeed('coder', ['maze-01']), 'adventure/maze-02', '.adv-scene-box');
    await c.click('.adv-watch');
    if (!(await c.waitFor(`!!document.querySelector('.adv-root[data-watch=true]')`, 5000))) throw new Error('watch mode did not open');
  } },
  { id: 'adventure-little', label: 'Adventure: a level for Little Turtles', ready: '.adv-scene-box', open: (c) => c.seed(adventureSeed('little', ['maze-01', 'maze-02']), 'adventure/maze-03', '.adv-scene-box') },  {
    id: 'adventure-little-win',
    label: 'Adventure: Little Turtles build a plan from blocks and win',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('little', ['maze-01']), 'adventure/maze-02', '.adv-scene-box');
      const bump = `(() => { const b = [...document.querySelectorAll('button[aria-label="More Forward"]')].pop(); b && b.click(); })()`;
      await c.click('.palette-tile', 'Forward');
      await c.click('button[aria-label="More Forward"]');
      await c.click('.palette-tile', 'Turn right');
      await c.click('.palette-tile', 'Forward');
      for (let k = 0; k < 3; k++) await c.evaluate(bump);
      await adventureGo(c);
      if (!(await c.waitFor(`!!document.querySelector('.adv-result')`, 20000))) throw new Error('the result card did not open');
      await sleep(1300);
    },
  },
  // Content wave A (FEAT-7): Whispering Woods and Rolling River.
  {
    id: 'adventure-woods-run',
    label: 'Adventure: a Whispering Woods level while Gio climbs the stairs',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', CODER_MAZE, WAVE_A), 'adventure/woods-01', '.adv-scene-box');
      await c.type('REPEAT 5 [FD 50 RT 90 FD 50 LT 90]');
      await adventureGo(c);
      // Mid-run: Gio is on the stairs and the result card has not opened yet.
      await sleep(1500);
    },
  },
  { id: 'adventure-woods-boss', label: 'Adventure: Big Stump, the Woods boss, with a patrolling Grumble', ready: '.adv-scene-box', open: (c) => c.seed(adventureSeed('coder', CODER_WOODS, WAVE_A), 'adventure/woods-07', '.adv-scene-box') },
  {
    id: 'adventure-river-variants',
    label: 'Adventure: a River plan that looks ahead wins on every map (variant thumbnails)',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', [...CODER_WOODS, 'woods-07', 'river-01'], WAVE_A), 'adventure/river-02', '.adv-scene-box');
      await c.click('[role=radio], button[aria-label^="Speed"]', 'Speed');
      await adventureRun(c, RIVER_LOOK);
    },
  },
  {
    id: 'adventure-river-other-map',
    label: 'Adventure: a plan that remembers one river fails on another map',
    ready: '.adv-scene-box',
    open: async (c) => {
      await c.seed(adventureSeed('coder', [...CODER_WOODS, 'woods-07', 'river-01'], WAVE_A), 'adventure/river-02', '.adv-scene-box');
      await c.click('[role=radio], button[aria-label^="Speed"]', 'Speed');
      await adventureRun(c, 'FD 100\nSWIM\nFD 150');
    },
  },
  {
    id: 'adventure-little-river',
    label: 'Adventure: Little Turtles on the River with If blocks',
    ready: '.adv-scene-box',
    open: (c) =>
      c.seed(
        { ...adventureSeed('little', [...LITTLE_WOODS, 'river-01'], WAVE_A), 'gio.adventure.code': { 'little:river-02': 'REPEAT 6 [IF AHEAD = "water [SWIM] IF AHEAD <> "water [FD 50]]' } },
        'adventure/river-02',
        '.adv-scene-box',
      ),
  },
  { id: 'keyboard-editor', label: 'Keyboard-open editor with the command key row', open: keyboardChecks },
  { id: 'hardware-keys', label: 'Hardware keyboard on tablets: arrows, Tab and Escape in the editor', open: hardwareKeyChecks },
];
