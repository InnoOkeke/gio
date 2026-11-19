/**
 * Shared helpers for GIO's live browser checks (learning-shots.ts, creativity-shots.ts): starts Microsoft Edge or
 * Chrome headless with a temporary profile, talks to it over the DevTools protocol and offers the small set of
 * actions the checks need (click, type, wait, screenshot, seed storage, watch downloads and requests).
 */
import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let failures = 0;

/** Prints one assertion and counts it when it fails. */
export function expect(ok: boolean, what: string): void {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
}

/** Counts a failure that is not an assertion, such as an exception. */
export function addFailure(): void {
  failures += 1;
}

export function failureCount(): number {
  return failures;
}

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
  identifier?: string;
}

export interface BrowserSession {
  send(method: string, params?: object): Promise<CdpResult>;
  evaluate(expr: string): Promise<unknown>;
  waitFor(expr: string, ms?: number): Promise<boolean>;
  click(selector: string, text?: string): Promise<void>;
  seed(entries: Record<string, unknown>, query: string): Promise<void>;
  type(code: string, replace?: boolean): Promise<void>;
  shot(name: string): Promise<void>;
  escape(): Promise<void>;
  closeDialogs(): Promise<void>;
  fits(label: string, area?: string): Promise<void>;
  size(selector: string, text?: string): Promise<{ w: number; h: number } | null>;
  stored(key: string): Promise<string | null>;
  downloads(name: string): Promise<(ext: string, ms?: number) => Promise<string | null>>;
  /** Calls back for every DevTools event with this method name (for example Network.requestWillBeSent). */
  on(method: string, handler: (params: Record<string, unknown>) => void): void;
  /** Closes the page connection, stops the browser and removes its temporary profile. */
  cleanup(): void;
}

export async function launchBrowser(base: string, outDir: string): Promise<BrowserSession> {
  fs.mkdirSync(outDir, { recursive: true });
  const exe = BROWSERS.find((b) => fs.existsSync(b));
  if (!exe) throw new Error('No Edge or Chrome found');

  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-cdp-'));
  const browser: ChildProcess = spawn(exe, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

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
    browser.kill();
    throw new Error('Could not connect to the browser');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map<number, (v: unknown) => void>();
  const listeners = new Map<string, ((params: Record<string, unknown>) => void)[]>();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(String(m.data)) as { id?: number; result?: unknown; method?: string; params?: Record<string, unknown> };
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)!(msg.result);
    else if (msg.method) for (const fn of listeners.get(msg.method) ?? []) fn(msg.params ?? {});
  });

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

  /** Click the first element matching a selector whose label or text contains the given text. */
  const click = async (selector: string, text = '') => {
    const ok = await evaluate(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.getAttribute('aria-label') ?? '').includes(${JSON.stringify(text)}) || (e.textContent ?? '').includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Nothing to click: ${selector} ${text}`);
  };

  /**
   * Starts the page from a known storage state. The origin's data is cleared, the entries are installed by a script that runs
   * before any page script (so nothing the app does can write before or after them), and the page is opened once.
   */
  const seed = async (entries: Record<string, unknown>, query: string) => {
    await send('Storage.clearDataForOrigin', { origin: new URL(base).origin, storageTypes: 'all' });
    const script = `(() => { try { const e = ${JSON.stringify(entries)}; for (const k of Object.keys(e)) localStorage.setItem(k, typeof e[k] === 'string' ? e[k] : JSON.stringify(e[k])); } catch (err) { /* about:blank has no storage */ } })()`;
    const added = await send('Page.addScriptToEvaluateOnNewDocument', { source: script });
    await send('Page.navigate', { url: `${base}/${query}` });
    await waitFor(`!!document.querySelector('#title')`, 15000);
    if (added.identifier) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: added.identifier });
  };

  const type = async (code: string, replace = false) => {
    await evaluate(`document.querySelector('.cm-content')?.focus()`);
    if (replace) {
      // CodeMirror owns its selection, so select everything with its own Ctrl+A key binding.
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    }
    await send('Input.insertText', { text: code });
    await sleep(250);
  };

  const shot = async (name: string) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(r.data ?? '', 'base64'));
    console.log(`  saved ${file}`);
  };

  const escape = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(300);
  };

  /** Close friend dialogs so the studio is visible. */
  const closeDialogs = async () => {
    for (let k = 0; k < 4 && (await evaluate(`!!document.querySelector('[aria-labelledby="friend-title"]')`)); k++) await escape();
  };

  /** Nothing may be wider than the screen: the page itself and every visible button inside the given area. */
  const fits = async (label: string, area = 'body') => {
    const r = (await evaluate(`(() => {
      const w = window.innerWidth;
      const page = document.documentElement.scrollWidth - w;
      const out = [...document.querySelectorAll(${JSON.stringify(`${area} button`)})].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > w + 1 || r.left < -1); }).map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30));
      return { page, out };
    })()`)) as { page: number; out: string[] };
    expect(r.page <= 0 && r.out.length === 0, `${label}: nothing is wider than the screen${r.page > 0 ? ` (page overflows by ${r.page}px)` : ''}${r.out.length ? ` (cut off: ${r.out.join(', ')})` : ''}`);
  };

  const size = async (selector: string, text = '') =>
    (await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.getAttribute('aria-label') ?? '').includes(${JSON.stringify(text)}) || (e.textContent ?? '').includes(${JSON.stringify(text)})); if (!el) return null; const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; })()`)) as { w: number; h: number } | null;

  const stored = async (key: string) => (await evaluate(`localStorage.getItem(${JSON.stringify(key)})`)) as string | null;

  /** Where the browser puts downloads for one scenario; returns a function that waits for the new file. */
  const downloads = async (name: string) => {
    const dir = path.join(outDir, `downloads-${name}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
    await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
    return async (ext: string, ms = 60000): Promise<string | null> => {
      for (let t = 0; t < ms; t += 250) {
        const hit = fs.readdirSync(dir).find((f) => f.endsWith(`.${ext}`));
        if (hit) {
          await sleep(300);
          return path.join(dir, hit);
        }
        await sleep(250);
      }
      return null;
    };
  };

  const on = (method: string, handler: (params: Record<string, unknown>) => void) => {
    listeners.set(method, [...(listeners.get(method) ?? []), handler]);
  };

  const cleanup = () => {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
    browser.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* the browser may still hold its profile for a moment; the OS cleans temp files */
      }
    }, 1500);
  };

  await send('Page.enable');
  await send('Network.enable');

  return { send, evaluate, waitFor, click, seed, type, shot, escape, closeDialogs, fits, size, stored, downloads, on, cleanup };
}
