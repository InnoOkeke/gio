/**
 * Shared helpers for the browser checks: launch headless Edge or Chrome, talk to it over the
 * DevTools protocol, seed localStorage like a returning child, take pictures, and send touch input.
 * The older scripts (gio-shots, map-shots, learning-shots) keep their own copies on purpose.
 */
import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export interface CdpResult {
  result?: { value?: unknown };
  data?: string;
  error?: { message?: string };
  [key: string]: unknown;
}

export interface Point {
  x: number;
  y: number;
}

export interface Cdp {
  base: string;
  send(method: string, params?: object): Promise<CdpResult>;
  evaluate<T = unknown>(expr: string): Promise<T | undefined>;
  waitFor(expr: string, ms?: number): Promise<boolean>;
  /** Click the first element matching a selector whose label or text contains the text. Throws if none. */
  click(selector: string, text?: string): Promise<void>;
  /** Clear localStorage, set the entries, then open the page and wait for the studio title. */
  seed(entries: Record<string, unknown>, query?: string, titleSelector?: string): Promise<void>;
  /** Type text into the focused CodeMirror editor. */
  type(code: string): Promise<void>;
  key(key: string, code: string, vk: number): Promise<void>;
  /** PNG of the viewport, written to file. */
  shot(file: string): Promise<void>;
  tap(x: number, y: number): Promise<void>;
  drag(from: Point, to: Point, steps?: number): Promise<void>;
  swipe(from: Point, to: Point): Promise<void>;
  pinch(center: Point, startDist: number, endDist: number, steps?: number): Promise<void>;
  /** Errors logged to the console and unhandled exceptions since the last call. */
  takeErrors(): string[];
  close(): Promise<void>;
}

export async function launchBrowser(base: string): Promise<Cdp> {
  const exe = BROWSERS.find((b) => fs.existsSync(b));
  if (!exe) throw new Error('No Edge or Chrome found');
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-cdp-'));
  // The window must be bigger than every emulated screen: touches outside the real window are dropped.
  const proc: ChildProcess = spawn(exe, ['--headless=new', '--mute-audio', '--disable-gpu', '--window-size=1600,1600', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

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
  if (!wsUrl) {
    proc.kill();
    throw new Error('Could not connect to the browser');
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map<number, (v: CdpResult) => void>();
  let errors: string[] = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(String(m.data)) as { id?: number; result?: CdpResult; error?: { message?: string }; method?: string; params?: Record<string, unknown> };
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.error ? { error: msg.error } : (msg.result ?? {}));
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.['exceptionDetails'] as { text?: string; exception?: { description?: string } } | undefined;
      errors.push(`exception: ${d?.exception?.description ?? d?.text ?? 'unknown'}`.slice(0, 240));
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.['type'] === 'error') {
      const args = (msg.params['args'] as { value?: unknown; description?: string }[] | undefined) ?? [];
      errors.push(`console.error: ${args.map((a) => String(a.value ?? a.description ?? '')).join(' ')}`.slice(0, 240));
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params?.['entry'] as { level?: string; text?: string; url?: string } | undefined;
      if (e?.level === 'error') errors.push(`log: ${e.text ?? ''} ${e.url ?? ''}`.slice(0, 240));
    }
  });

  const send = (method: string, params: object = {}) =>
    new Promise<CdpResult>((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  // While a page is navigating the browser answers with an error and no result; treat that as "not yet".
  const evaluate = async <T = unknown>(expr: string) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value as T | undefined;
  const waitFor = async (expr: string, ms = 8000) => {
    for (let t = 0; t < ms; t += 150) {
      if (await evaluate(expr)) return true;
      await sleep(150);
    }
    return false;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  // Layout shift is summed from the start of every document so the harness can read it later.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput && !(window.__tap && e.startTime >= window.__tap && e.startTime - window.__tap < 500)) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
      window.addEventListener('unhandledrejection', (ev) => { console.error('unhandled rejection: ' + String(ev.reason)); });`,
  });

  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', points: (Point & { id: number })[]) => {
    await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : points.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
  };
  const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  return {
    base,
    send,
    evaluate,
    waitFor,
    async click(selector, text = '') {
      const ok = await evaluate<boolean>(`(() => {
        const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        const all = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => (e.getAttribute('aria-label') ?? '').includes(${JSON.stringify(text)}) || (e.textContent ?? '').includes(${JSON.stringify(text)}));
        const el = all.find(shown) ?? all[0];
        if (!el) return false;
        window.__tap = performance.now(); el.click();
        return true;
      })()`);
      if (!ok) throw new Error(`Nothing to click: ${selector} ${text}`);
    },
    async seed(entries, query = '', titleSelector = '#title') {
      await send('Page.navigate', { url: `${base}/?x=${Date.now()}` });
      await sleep(1000);
      await evaluate(`(() => { localStorage.clear(); const e = ${JSON.stringify(entries)}; for (const k of Object.keys(e)) localStorage.setItem(k, typeof e[k] === 'string' ? e[k] : JSON.stringify(e[k])); })()`);
      await send('Page.navigate', { url: `${base}/${query}` });
      if (titleSelector) await waitFor(`!!document.querySelector(${JSON.stringify(titleSelector)})`, 15000);
      await sleep(600);
    },
    async type(code) {
      await evaluate(`document.querySelector('.cm-content')?.focus()`);
      await send('Input.insertText', { text: code });
      await sleep(250);
    },
    async key(key, code, vk) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(r.data ?? '', 'base64'));
    },
    async tap(x, y) {
      await touch('touchStart', [{ x, y, id: 1 }]);
      await sleep(40);
      await touch('touchEnd', []);
    },
    async drag(from, to, steps = 12) {
      await touch('touchStart', [{ ...from, id: 1 }]);
      for (let i = 1; i <= steps; i++) {
        await touch('touchMove', [{ ...lerp(from, to, i / steps), id: 1 }]);
        await sleep(16);
      }
      await touch('touchEnd', []);
    },
    async swipe(from, to) {
      await touch('touchStart', [{ ...from, id: 1 }]);
      for (let i = 1; i <= 6; i++) {
        await touch('touchMove', [{ ...lerp(from, to, i / 6), id: 1 }]);
        await sleep(16);
      }
      await touch('touchEnd', []);
    },
    async pinch(center, startDist, endDist, steps = 10) {
      const at = (d: number): (Point & { id: number })[] => [
        { x: center.x - d / 2, y: center.y, id: 1 },
        { x: center.x + d / 2, y: center.y, id: 2 },
      ];
      await touch('touchStart', at(startDist));
      for (let i = 1; i <= steps; i++) {
        await touch('touchMove', at(startDist + (endDist - startDist) * (i / steps)));
        await sleep(16);
      }
      await touch('touchEnd', []);
    },
    takeErrors() {
      const out = errors;
      errors = [];
      return out;
    },
    async close() {
      try {
        ws.close();
      } catch {
        /* already closed */
      }
      proc.kill();
      setTimeout(() => {
        try {
          fs.rmSync(profile, { recursive: true, force: true });
        } catch {
          /* the browser may still hold its profile for a moment; the OS cleans temp files */
        }
      }, 1500);
    },
  };
}
