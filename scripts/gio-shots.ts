/**
 * Takes screenshots of Gio's moods, a friend unlock, the shell and the garden in a real browser
 * (Microsoft Edge or Chrome, headless) at desktop and phone width. Starts nothing itself: run the
 * production server first (npm run build && npm start), then:
 *   npm run check:shots
 * It seeds only gio.mode, gio.progress and gio.draft, like a returning child, and reads the
 * rendered page. Pictures are saved in a gio-shots folder inside the system temp folder.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = path.join(os.tmpdir(), 'gio-shots');
fs.mkdirSync(outDir, { recursive: true });

const browsers = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = browsers.find((b) => fs.existsSync(b));
if (!exe) throw new Error('No Edge or Chrome found');

const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-cdp-'));
const browser = spawn(exe, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const LITTLE_PROGRESS = ['l-walk', 'l-corner', 'l-square'];
const SQUARE = 'REPEAT 4 [FD 100 RT 90]';

async function main() {
  let wsUrl = '';
  for (let k = 0; k < 50 && !wsUrl; k++) {
    await sleep(200);
    try {
      const pages = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      wsUrl = pages.find((p) => p.type === 'page')?.webSocketDebuggerUrl ?? '';
    } catch {
      /* browser still starting */
    }
  }
  if (!wsUrl) throw new Error('Could not connect to the browser');

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map<number, (v: unknown) => void>();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(String(m.data)) as { id?: number; result?: unknown };
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)!(msg.result);
  });
  interface CdpResult {
    result?: { value?: unknown };
    data?: string;
  }
  const send = (method: string, params: object = {}) =>
    new Promise<CdpResult>((resolve) => {
      const n = ++id;
      pending.set(n, resolve as (v: unknown) => void);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  // While a page is navigating the browser answers with an error and no result; treat that as "not yet".
  const evaluate = async (expr: string) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true }))?.result?.value;
  const waitFor = async (expr: string, ms = 8000) => {
    for (let t = 0; t < ms; t += 150) {
      if (await evaluate(expr)) return true;
      await sleep(150);
    }
    return false;
  };

  /** Click the first element matching a selector whose text contains the given text. */
  const click = async (selector: string, text = '') => {
    const ok = await evaluate(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.getAttribute('aria-label') ?? '').includes(${JSON.stringify(text)}) || (e.textContent ?? '').includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Nothing to click: ${selector} ${text}`);
  };

  const seed = async (entries: Record<string, unknown>, query: string) => {
    await send('Page.navigate', { url: `${base}/?x=${Date.now()}` });
    await sleep(1200);
    await evaluate(`(() => { localStorage.clear(); const e = ${JSON.stringify(entries)}; for (const k of Object.keys(e)) localStorage.setItem(k, typeof e[k] === 'string' ? e[k] : JSON.stringify(e[k])); })()`);
    await send('Page.navigate', { url: `${base}/${query}` });
    await waitFor(`!!document.querySelector('#title')`, 15000);
    await sleep(600);
  };

  const type = async (code: string) => {
    await evaluate(`document.querySelector('.cm-content')?.focus()`);
    await send('Input.insertText', { text: code });
    await sleep(250);
  };

  const shot = async (name: string) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(r.data ?? '', 'base64'));
    console.log(file);
  };

  /** Gio's mood on the stage and next to his speech bubble. */
  const moodNow = async () =>
    evaluate(`['.turtle .gio-pose', '[role=status] .gio-pose'].map((s) => document.querySelector(s)?.getAttribute('data-mood') ?? 'none').join(',')`);
  const pressRun = async () => click('button', 'Run');
  const sheetScroll = (top: number) => evaluate(`(() => { const s = document.querySelector('[role=dialog] .overflow-y-auto'); if (s) s.scrollTop = ${top}; return !!s; })()`);

  /** Close any friend dialogs so the studio is visible. Escape does not change Gio's mood or bubble. */
  const closeDialogs = async () => {
    for (let k = 0; k < 4 && (await evaluate(`!!document.querySelector('[aria-labelledby="friend-title"]')`)); k++) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await sleep(250);
    }
  };

  /** A close-up of Gio on the stage and next to his bubble, so his face can be read. */
  const shotGio = async (name: string) => {
    for (const [part, sel] of [['stage', '.turtle'], ['bubble', '[role=status] > div']] as const) {
      const box = (await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + scrollX - 12, y: r.y + scrollY - 12, width: r.width + 24, height: r.height + 24 }; })()`)) as { x: number; y: number; width: number; height: number } | null;
      if (!box) continue;
      await sleep(150);
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 5 } });
      const file = path.join(outDir, `${name}-${part}.png`);
      fs.writeFileSync(file, Buffer.from(r.data ?? '', 'base64'));
      console.log(file);
    }
  };
  await send('Page.enable');
  await send('Network.enable');

  const sizes = [
    { name: 'desktop', width: 1440, height: 1000, mobile: false },
    { name: 'phone', width: 390, height: 844, mobile: true },
  ];

  for (const v of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
    const n = (s: string) => `${v.name}-${s}`;

    // Turtle Coders: a correct run, then a run with an error.
    await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
    await type(SQUARE);
    await pressRun();
    await waitFor(`!!document.querySelector('.bubble-success')`, 8000);
    await sleep(500);
    console.log(n('coder-happy'), 'mood:', await moodNow());
    await closeDialogs();
    await shot(n('coder-happy'));
    await shotGio(n('coder-happy-close'));

    await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
    await type('FD 100 FOO');
    await pressRun();
    await waitFor(`!!document.querySelector('.bubble-problem')`, 5000);
    await sleep(400);
    console.log(n('coder-curious'), 'mood:', await moodNow());
    await closeDialogs();
    await shot(n('coder-curious'));
    await shotGio(n('coder-curious-close'));

    // A new friend: complete c-repeat by typing the answer.
    await seed({ 'gio.mode': 'coder', 'gio.progress': ['c-line', 'c-square', 'c-rectangle', 'c-triangle'] }, '?mode=coder');
    await click('button', 'Quest map');
    await sleep(500);
    await click('button', 'Loop Lagoon');
    await sleep(400);
    await click('button', 'Loop it');
    await sleep(400);
    await type(SQUARE);
    await pressRun();
    const opened = await waitFor(`!!document.querySelector('[aria-labelledby="friend-title"]')`, 12000);
    await sleep(500);
    console.log(n('friend'), 'dialog:', opened, 'focus:', await evaluate(`document.activeElement?.textContent`));
    await shot(n('friend-olly'));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(500);
    await shot(n('friend-after-dialog'));

    // The garden, empty and then full.
    await seed({ 'gio.mode': 'coder' }, '?mode=coder');
    await click('button', "Gio's garden");
    await sleep(700);
    await shot(n('garden-empty'));

    await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
    await click('button', "Gio's garden");
    await sleep(700);
    await shot(n('garden-top'));
    await click('button', 'Shell spot 3');
    await sleep(200);
    await sheetScroll(520);
    await sleep(300);
    await shot(n('garden-stickers'));
    await sheetScroll(1100);
    await sleep(300);
    await shot(n('garden-friends'));
    await sheetScroll(1700);
    await sleep(300);
    await shot(n('garden-scene'));
    await sheetScroll(9999);
    await sleep(300);
    await shot(n('garden-week'));

    // Little Turtles: blocks come from a saved draft, then run for real.
    await seed({ 'gio.mode': 'little', 'gio.progress': LITTLE_PROGRESS, 'gio.draft': { title: 'My drawing', code: SQUARE } }, '?mode=little');
    await pressRun();
    await waitFor(`!!document.querySelector('.bubble-success')`, 12000);
    await sleep(500);
    console.log(n('little-happy'), 'mood:', await moodNow());
    await closeDialogs();
    await shot(n('little-happy'));
    await shotGio(n('little-happy-close'));
    await click('button', "Gio's garden");
    await sleep(700);
    await shot(n('little-garden'));

    await seed({ 'gio.mode': 'little', 'gio.progress': LITTLE_PROGRESS, 'gio.draft': { title: 'My drawing', code: 'FD 100 FOO' } }, '?mode=little');
    await pressRun();
    await waitFor(`!!document.querySelector('.bubble-problem')`, 5000);
    await sleep(400);
    console.log(n('little-curious'), 'mood:', await moodNow());
    await closeDialogs();
    await shot(n('little-curious'));
    await shotGio(n('little-curious-close'));
  }
  ws.close();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    browser.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* the browser may still hold its profile for a moment; the OS cleans temp files */
      }
    }, 1500);
  });
