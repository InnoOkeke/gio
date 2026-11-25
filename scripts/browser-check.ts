/**
 * Plays a GIO game in a real browser (Microsoft Edge or Chrome, headless) and checks it responds.
 * Starts nothing itself: run the production server first (npm run build && npm start), then:
 *   npx tsx scripts/browser-check.ts <share-slug>
 * It counts drawn pixels before and after real key presses and game ticks, and reads the scoreboard.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const slug = process.argv[2];
if (!slug) throw new Error('Usage: tsx scripts/browser-check.ts <share-slug>');
const base = process.env['GIO_URL'] ?? 'http://localhost:3001';

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
const browser = spawn(exe, ['--headless=new', '--mute-audio', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const evaluate = async (expr: string) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;

  await send('Page.enable');
  await send('Page.navigate', { url: `${base}/p/${slug}?mode=coder` });
  await sleep(4000);

  const inked = `(() => {
    const c = document.querySelectorAll('.stage canvas')[1];
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  })()`;
  const score = `document.querySelector('.scoreboard')?.hidden === false ? document.querySelector('.scoreboard').textContent : null`;
  const bubble = `document.querySelector('.bubble')?.textContent ?? ''`;
  const pad = `!!document.querySelector('[aria-label="Game controls"]')`;

  const report: Record<string, unknown> = {};
  report['gamePadShown'] = await evaluate(pad);
  report['bubbleAtStart'] = await evaluate(bubble);
  const before = (await evaluate(inked)) as number;
  await sleep(1500);
  const afterTicks = (await evaluate(inked)) as number;
  report['pixelsAtStart'] = before;
  report['pixelsAfterTicks'] = afterTicks;

  const key = async (code: string, keyName: string, keyCode: number) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode });
    await sleep(120);
  };
  const turtleBefore = await evaluate(`document.querySelector('.turtle').style.transform`);
  // Steer onto the apple at (60, 60): up 60, turn right 90, then forward 60.
  for (let k = 0; k < 6; k++) await key('ArrowUp', 'ArrowUp', 38);
  for (let k = 0; k < 6; k++) await key('ArrowRight', 'ArrowRight', 39);
  for (let k = 0; k < 6; k++) await key('ArrowUp', 'ArrowUp', 38);
  await sleep(800);
  report['turtleMovedWithKeys'] = (await evaluate(`document.querySelector('.turtle').style.transform`)) !== turtleBefore;
  report['pixelsAfterKeys'] = await evaluate(inked);
  report['scoreboard'] = await evaluate(score);
  report['bubbleAtEnd'] = await evaluate(bubble);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const out = path.join(os.tmpdir(), `gio-browser-${slug}.png`);
  fs.writeFileSync(out, Buffer.from(shot.data ?? '', 'base64'));
  report['screenshot'] = out;
  console.log(JSON.stringify(report, null, 2));
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
