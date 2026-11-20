/**
 * Standing check of GIO's installable offline app in a real browser (Microsoft Edge or Chrome, headless).
 * It needs only a built dist/ui: it copies it to a temporary folder, starts the real Express app on a random port
 * with its own temporary database, and needs no other server, no internet and no Bedrock key.
 *   npm run build
 *   npm run check:offline
 * Phases: install and installability, cold-load report, offline use (server stopped and the browser offline),
 * Python offline, and an update from one build to the next. Every assertion is printed; exit code 1 on any failure.
 */
import fs from 'fs';
import http from 'http';
import net from 'net';
import os from 'os';
import path from 'path';
import { gzipSync } from 'zlib';
import { addFailure, expect, failureCount, launchBrowser, sleep, type BrowserSession } from './lib/browser.js';

/** The first measurement (build bc7278978ac4: 1,572,117 B raw, 826,860 B gzip) plus 15 percent. */
const BUDGET_RAW = 1_807_000;
const BUDGET_GZIP = 951_000;

const OFFLINE_MESSAGE = 'Gio needs the internet for this one. Drawing and quests still work, and your code is safe on this phone.';
const PYTHON_OFFLINE_TEXT = 'Python needs the internet to get ready.';
const MARKER = 'gio-offline-check';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const distUi = path.join(root, 'dist', 'ui');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-offline-'));
const outDir = path.join(work, 'shots');

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
interface Running {
  urls: string[];
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

let session: BrowserSession | null = null;
let current: Running | null = null;

async function main() {
  if (!fs.existsSync(path.join(distUi, 'index.html')) || !fs.existsSync(path.join(distUi, 'sw.js'))) {
    throw new Error('dist/ui is not built (run npm run build first)');
  }
  // Its own database and a non-secret limit setting: nothing else is needed, and Bedrock is never called.
  process.env['DB_PATH'] = path.join(work, 'gio.db');
  process.env['AI_DAILY_LIMIT'] ??= '50';
  const { createApp } = await import('../src/api/app.js');

  const uiOne = path.join(work, 'ui-one');
  fs.cpSync(distUi, uiOne, { recursive: true });
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const origin = new URL(base).origin;

  const start = async (dir: string): Promise<Running> => {
    const app = createApp({ uiDistDir: dir }) as unknown as Handler;
    const urls: string[] = [];
    const server = http.createServer((req, res) => {
      urls.push(req.url ?? '');
      app(req, res);
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    // "localhost" may resolve to ::1 first on some machines, so listen there too when it is free.
    const v6 = http.createServer((req, res) => {
      urls.push(req.url ?? '');
      app(req, res);
    });
    await new Promise<void>((resolve) => {
      v6.once('error', () => resolve());
      v6.listen(port, '::1', resolve);
    });
    return {
      urls,
      stop: () =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          v6.closeAllConnections();
          server.close(() => v6.close(() => resolve()));
          if (!v6.listening) v6.close();
        }),
    };
  };

  current = await start(uiOne);
  session = await launchBrowser(base, outDir);
  const { send, evaluate, waitFor, click, type, closeDialogs, on, debugPort } = session;

  /** Evaluate that waits for a promise. launchBrowser's evaluate does not. */
  const evalAsync = async (expr: string): Promise<unknown> => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;

  /** A headless browser can leave a new service worker waiting for a debugger. This lets it run. */
  const releaseWorkers = async (): Promise<void> => {
    try {
      const targets = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()) as { type: string; url: string; webSocketDebuggerUrl: string }[];
      for (const t of targets.filter((x) => x.type === 'service_worker' && x.url.startsWith(origin))) {
        const ws = new WebSocket(t.webSocketDebuggerUrl);
        await new Promise((r) => ws.addEventListener('open', r, { once: true }));
        await new Promise<void>((resolve) => {
          ws.addEventListener('message', () => resolve(), { once: true });
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.runIfWaitingForDebugger' }));
          setTimeout(resolve, 1500);
        });
        ws.close();
      }
    } catch {
      /* no worker target yet */
    }
  };
  /** Waits for an expression that may return a promise, releasing a paused service worker on every try. */
  const until = async (expr: string, ms = 20000): Promise<boolean> => {
    for (let t = 0; t < ms; t += 300) {
      await releaseWorkers();
      if (await evalAsync(expr)) return true;
      await sleep(300);
    }
    return false;
  };
  const text = async (selector: string) => ((await evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`)) as string) ?? '';
  const body = async () => ((await evaluate(`document.body?.innerText ?? ''`)) as string) ?? '';
  const editorText = async () => ((await evaluate(`document.querySelector('.cm-content')?.textContent ?? ''`)) as string) ?? '';
  const go = async (url: string) => {
    await send('Page.navigate', { url });
    await waitFor(`!!document.querySelector('#title, h1')`, 15000);
  };
  const stageHasInk = async () =>
    (await evaluate(`(() => { for (const c of document.querySelectorAll('.stage canvas')) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 4; i < d.length; i += 4) { if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== d[3]) return true; } } return false; })()`)) === true;
  const idle = (ms = 20000) => waitFor(`[...document.querySelectorAll('button.btn-lg')].some((b) => b.textContent.trim() === 'Run')`, ms);
  /** Leaves the first-drawing offer and the friend dialogs out of the way. */
  const clear = async () => {
    await closeDialogs();
    if (await evaluate(`!!document.querySelector('[aria-label="Your first drawing"]')`)) {
      await click('[aria-label="Your first drawing"] button', 'Skip');
      await sleep(300);
    }
  };

  /* Every request the page makes, and the bytes of each, from the very first navigation. */
  const seen: string[] = [];
  const requestUrl = new Map<string, string>();
  const bytes = new Map<string, number>();
  on('Network.requestWillBeSent', (p) => {
    const url = String((p['request'] as { url?: string } | undefined)?.url ?? '');
    requestUrl.set(String(p['requestId']), url);
    seen.push(url);
  });
  on('Network.loadingFinished', (p) => {
    bytes.set(String(p['requestId']), Number(p['encodedDataLength'] ?? 0));
  });
  const apiCalls = () => seen.filter((u) => u.startsWith(origin) && new URL(u).pathname.startsWith('/api/')).length;

  /* ------------------------------------------------------------------ install */
  console.log('\n=== install and cold load ===');
  await send('Page.navigate', { url: `${base}/` });
  expect(await waitFor(`(document.getElementById('root')?.children.length ?? 0) > 0`, 20000), 'GIO opens on a fresh profile');
  expect(await until(`navigator.serviceWorker.getRegistration().then((r) => !!r)`, 20000), 'the service worker registers');
  expect(await until(`navigator.serviceWorker.ready.then(() => true)`, 30000), 'navigator.serviceWorker.ready resolves');
  const noteSeen = await waitFor(`document.body.innerText.includes('GIO works offline now')`, 30000);
  expect(noteSeen, "the one-time 'GIO works offline now' note shows after the first download");
  const firstLoadBytes = [...bytes.entries()].reduce((sum, [id, n]) => (requestUrl.get(id)?.startsWith(origin) ? sum + n : sum), 0);
  const firstLoadRequests = [...requestUrl.values()].filter((u) => u.startsWith(origin)).length;
  console.log(`  first load of / (page requests only, uncompressed by the Node server): ${firstLoadRequests} requests, ${firstLoadBytes} bytes transferred`);
  expect(!seen.some((u) => u.includes('/py/pyodide-')), 'the first load requests no Pyodide file');

  const list = (await evalAsync(`caches.keys().then(async (names) => { const n = names.find((x) => x.startsWith('gio-app-')); if (!n) return null; const c = await caches.open(n); const meta = await c.match('/__gio-precache.json'); return { names, keys: (await c.keys()).map((r) => new URL(r.url).pathname), manifest: meta ? await meta.json() : null }; })`)) as { names: string[]; keys: string[]; manifest: { url: string }[] | null } | null;
  expect(!!list && !!list.manifest, 'the precache is complete (its list is written last)');
  const entries = list?.manifest ?? [];
  let raw = 0;
  let gz = 0;
  for (const e of entries) {
    const file = path.join(uiOne, e.url === '/' ? 'index.html' : e.url.replace(/^\//, ''));
    const data = fs.readFileSync(file);
    raw += data.length;
    gz += gzipSync(data).length;
  }
  console.log(`  precache: ${entries.length} entries, ${raw} bytes raw, ${gz} bytes gzip (budget ${BUDGET_RAW} raw, ${BUDGET_GZIP} gzip)`);
  expect(raw <= BUDGET_RAW && gz <= BUDGET_GZIP, 'the precache is inside its size budget');
  expect(entries.length > 0 && entries.every((e) => list!.keys.includes(e.url)), 'every listed file is in the cache');
  expect(!entries.some((e) => e.url.includes('/py/pyodide-')) && !(list?.keys ?? []).some((k) => k.includes('/py/pyodide-')), 'no Pyodide file is precached');
  expect(list?.names.filter((n) => n.startsWith('gio-app-')).length === 1, 'one gio-app cache exists');

  /* ------------------------------------------------------------------ installability */
  console.log('\n=== installability ===');
  const m = (await send('Page.getAppManifest')) as unknown as { url?: string; errors?: { message: string }[]; data?: string };
  expect(!!m.url && (m.errors ?? []).length === 0, `the manifest parses with no errors${m.errors?.length ? `: ${m.errors.map((e) => e.message).join('; ')}` : ''}`);
  const manifest = JSON.parse(m.data || '{}') as { name?: string; start_url?: string; display?: string; orientation?: string; icons?: { src: string; sizes: string; type: string; purpose?: string }[] };
  expect(manifest.name === 'GIO' && manifest.display === 'standalone' && manifest.orientation === 'any' && new URL(manifest.start_url ?? '', base).href === `${base}/`, `manifest has name, start_url, display standalone and orientation any (${manifest.name}, ${manifest.start_url}, ${manifest.display}, ${manifest.orientation})`);
  const installErrors = (await send('Page.getInstallabilityErrors')) as unknown as { installabilityErrors?: { errorId: string }[] };
  expect((installErrors.installabilityErrors ?? []).length === 0, `Page.getInstallabilityErrors is empty${installErrors.installabilityErrors?.length ? `: ${installErrors.installabilityErrors.map((e) => e.errorId).join(', ')}` : ''}`);
  const icons = manifest.icons ?? [];
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['192x192', 'maskable'], ['512x512', 'maskable']] as const) {
    const icon = icons.find((i) => i.sizes === size && (i.purpose ?? 'any') === purpose);
    if (!icon) {
      expect(false, `manifest has a ${purpose} ${size} icon`);
      continue;
    }
    const r = (await evalAsync(`fetch(${JSON.stringify(icon.src)}).then(async (res) => { const blob = await res.blob(); const bmp = await createImageBitmap(blob); return { status: res.status, type: res.headers.get('content-type'), w: bmp.width, h: bmp.height }; })`)) as { status: number; type: string; w: number; h: number } | undefined;
    expect(r?.status === 200 && r.type === 'image/png' && `${r.w}x${r.h}` === size, `${purpose} ${size} icon answers 200 image/png and decodes to ${r?.w}x${r?.h}`);
  }

  console.log('\n=== headers (D11) ===');
  const head = async (p: string) => fetch(`${base}${p}`, { cache: 'no-store' });
  const asset = entries.find((e) => e.url.startsWith('/assets/') && e.url.endsWith('.js'))?.url ?? '/assets/none.js';
  const cc = async (p: string) => (await head(p)).headers.get('cache-control');
  expect((await cc('/')) === 'no-cache', 'index.html is no-cache');
  expect((await cc('/sw.js')) === 'no-cache', 'sw.js is no-cache');
  expect((await cc('/manifest.webmanifest')) === 'no-cache', 'manifest.webmanifest is no-cache');
  expect((await cc(asset)) === 'public, max-age=31536000, immutable', `${asset} is immutable for a year`);
  expect((await cc('/icons/icon-192.png')) === 'public, max-age=86400', 'icons are cached for a day');
  expect(((await head('/manifest.webmanifest')).headers.get('content-type') ?? '').startsWith('application/manifest+json'), 'the manifest is application/manifest+json');
  expect(/javascript/.test((await head('/sw.js')).headers.get('content-type') ?? ''), 'sw.js is JavaScript');
  const missing = await head('/assets/missing-chunk.js');
  expect(missing.status === 404 && !(missing.headers.get('content-type') ?? '').includes('html'), 'a missing chunk is a plain 404, never HTML');

  console.log('\n=== controlled after reload ===');
  await send('Page.reload');
  await waitFor(`!!document.querySelector('#title')`, 20000);
  expect(await until(`!!navigator.serviceWorker.controller`, 20000), 'the service worker controls the page after a reload');

  /* ------------------------------------------------------------------ project made while online */
  const made = (await (await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Offline check', code: 'FD 50' }) })).json()) as { data?: { slug: string } };
  const slug = made.data?.slug ?? '';
  expect(/^[a-z0-9]{10}$/.test(slug), `a saved drawing was made through the API (${slug})`);

  /* Choose the game state (coder, Python already agreed) while the page is online, so no storage is cleared. */
  await evaluate(`(() => { localStorage.setItem('gio.mode', 'coder'); localStorage.setItem('gio.pythonReady', '1'); })()`);
  await go(`${base}/?mode=coder`);
  await clear();
  expect(await until(`!!navigator.serviceWorker.controller`, 10000), 'still controlled on /?mode=coder');

  /* ------------------------------------------------------------------ offline */
  console.log('\n=== offline: the server is stopped and the browser is offline ===');
  await current.stop();
  current = null;
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  expect((await evaluate(`navigator.onLine`)) === false, 'navigator.onLine is false');
  const apiBefore = apiCalls();

  for (const url of [`${base}/`, `${base}/?source=pwa`]) {
    await go(url);
    await clear();
    expect(await waitFor(`!!document.querySelector('#title') && !!document.querySelector('.cm-content')`, 15000), `${url.replace(base, '')} opens and draws its page offline`);
  }
  expect((await body()).includes('No internet. Drawing and quests still work.'), 'the offline pill is visible');

  console.log('drawing');
  await type('REPEAT 4 [FD 100 RT 90]', true);
  expect(!(await stageHasInk()), 'the stage is empty before Run');
  await click('button.btn-lg', 'Run');
  expect(await waitFor(`(() => { for (const c of document.querySelectorAll('.stage canvas')) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 4; i < d.length; i += 4) { if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== d[3]) return true; } } return false; })()`, 20000), 'Run draws on the stage offline');
  expect(await idle(), 'Run returns to idle');

  console.log('the AI needs a connection');
  const codeBefore = await editorText();
  const bubble = async () => ((await evaluate(`document.querySelector('.bubble')?.textContent ?? ''`)) as string) ?? '';
  await evaluate(`document.getElementById('ask-input')?.focus()`);
  await send('Input.insertText', { text: 'a big star' });
  await click('form button[type=submit]', '');
  expect(await waitFor(`(document.querySelector('.bubble')?.textContent ?? '').includes(${JSON.stringify(OFFLINE_MESSAGE)})`, 8000), `Ask shows the friendly offline copy (${(await bubble()).slice(0, 60)})`);
  await click('button', 'Explain my code');
  expect(await waitFor(`(document.querySelector('.bubble')?.textContent ?? '').includes(${JSON.stringify(OFFLINE_MESSAGE)})`, 8000), 'Explain shows the friendly offline copy');
  await click('button', 'stuck');
  expect(await waitFor(`(document.querySelector('[aria-label="Help from the turtle"]')?.textContent ?? '').includes(${JSON.stringify(OFFLINE_MESSAGE)})`, 8000), "I'm stuck shows the friendly offline copy");
  await click('button[aria-label="Save"]', '');
  expect(await waitFor(`(document.querySelector('.toast')?.textContent ?? '').includes(${JSON.stringify(OFFLINE_MESSAGE)})`, 8000), 'Save shows the friendly offline copy');
  expect(apiCalls() === apiBefore, `none of the four AI or save actions made a request to /api (${apiCalls() - apiBefore})`);
  expect((await editorText()) === codeBefore, "the child's code is unchanged afterwards");
  expect((await body()).includes('No internet. Drawing and quests still work.'), 'the offline pill is still visible');

  console.log('quests');
  await go(`${base}/`);
  await clear();
  await click('button', 'Adventure map');
  expect(await waitFor(`!!document.querySelector('#map-title')`, 8000), 'the adventure map opens offline');
  await click('button.isle-card', '');
  await sleep(500);
  await click('button', 'Hello, turtle');
  await sleep(500);
  await type('FD 100', true);
  await click('button.btn-lg', 'Run');
  expect(await waitFor(`(localStorage.getItem('gio.progress') ?? '').includes('c-line')`, 20000), 'the first quest is finished offline and remembered');
  await idle();

  console.log('other pages');
  await go(`${base}/privacy`);
  expect((await text('h1')).length > 0 && (await body()).includes('gio.pwa'), '/privacy opens offline and lists gio.pwa');
  await go(`${base}/certificate`);
  expect((await text('h1')).length > 0, `/certificate opens offline (${(await text('h1')).slice(0, 50)})`);
  await go(`${base}/p/${slug}`);
  expect((await body()).includes('This drawing needs the internet'), 'a saved drawing that was never opened here says it needs the internet');

  console.log('python');
  await go(`${base}/`);
  await clear();
  await click('[role=tab]', 'Python');
  await sleep(500);
  if (await evaluate(`[...document.querySelectorAll('#panel-python button')].some((b) => b.textContent.includes('Get Python ready'))`)) await click('#panel-python button', 'Get Python ready');
  else if (await evaluate(`[...document.querySelectorAll('#panel-python button')].some((b) => b.textContent.includes('Run this Python'))`)) await click('#panel-python button', 'Run this Python');
  const pythonSaid = await waitFor(`((document.querySelector('#panel-python')?.textContent ?? '') + (document.querySelector('.bubble')?.textContent ?? '')).includes(${JSON.stringify(PYTHON_OFFLINE_TEXT)})`, 15000);
  expect(pythonSaid, 'outcome C: Python says plainly that it needs the internet offline');
  if (!pythonSaid) console.log(`  panel: ${(await text('#panel-python')).replace(/\s+/g, ' ').slice(0, 300)} | bubble: ${(await text('.bubble')).slice(0, 200)}`);
  expect(!seen.some((u) => u.includes('/py/')), 'no Python frame or engine file was requested');
  expect(apiCalls() === apiBefore, 'nothing offline touched /api');

  /* ------------------------------------------------------------------ update */
  console.log('\n=== update from one build to the next ===');
  const uiTwo = path.join(work, 'ui-two');
  fs.cpSync(uiOne, uiTwo, { recursive: true });
  const sw = fs.readFileSync(path.join(uiTwo, 'sw.js'), 'utf8');
  const idMatch = /`\$\{\w+\}([0-9a-f]{12})`/.exec(sw);
  expect(!!idMatch, `the build id is in sw.js (${idMatch?.[1]})`);
  let sw2 = sw.replace(new RegExp(idMatch![1]!, 'g'), 'ffffffffffff');
  sw2 = sw2.replace(/\{url:"\/",rev:"[0-9a-f]+"\}/, `{url:"/",rev:"${'e'.repeat(64)}"}`);
  expect(sw2 !== sw, 'sw.js was rewritten for the second build');
  fs.writeFileSync(path.join(uiTwo, 'sw.js'), sw2);
  const index = fs.readFileSync(path.join(uiTwo, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(uiTwo, 'index.html'), index.replace('</head>', `<meta name="${MARKER}" content="second"></head>`));

  current = await start(uiTwo);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const log = current.urls;
  await go(`${base}/`);
  await clear();
  expect(await waitFor(`navigator.onLine`, 5000), 'back online');
  await type('REPEAT 3 [FD 50 RT 120]', true);
  const draft = await editorText();
  await go(`${base}/p/${slug}`);
  await clear();
  expect(await waitFor(`(document.querySelector('.cm-content')?.textContent ?? '').includes('FD 50')`, 15000), 'the saved drawing opens');
  await type('FD 50 RT 90 FD 50', true);
  await sleep(600);
  const edited = await editorText();
  await evaluate(`window.__noReload = 'same page'`);
  await evalAsync(`navigator.serviceWorker.getRegistration().then((r) => r.update())`);
  const banner = await until(`document.body.innerText.includes('A new GIO is ready')`, 30000);
  expect(banner, "the 'A new GIO is ready' banner appears");
  expect((await evaluate(`window.__noReload`)) === 'same page', 'the banner appeared without a reload');
  expect((await editorText()) === edited, 'the code in the editor is unchanged by the banner');
  expect((await body()).includes('Your code is kept.'), 'the banner says the code is kept');
  const assetHitsBeforeUpdate = log.filter((u) => u.startsWith('/assets/') || u.startsWith('/icons/') || u.startsWith('/py/')).length;
  console.log(`  server saw ${log.length} requests while the second build installed; files under /assets, /icons, /py: ${assetHitsBeforeUpdate}`);
  expect(assetHitsBeforeUpdate === 0, 'unchanged hashed files were copied from the old cache, not downloaded again');
  expect(log.some((u) => u === '/'), 'the changed shell was downloaded');

  await click('button', 'Update now');
  expect(await waitFor(`window.__noReload === undefined && !!document.querySelector('#title')`, 30000), 'Update now reloads the page');
  expect(await until(`!!document.querySelector('meta[name=${MARKER}]')`, 20000), 'the new shell (with the marker) is on screen');
  expect(await until(`!!navigator.serviceWorker.controller`, 10000), 'the new worker controls the page');
  const names = (await evalAsync(`caches.keys().then((k) => k.filter((n) => n.startsWith('gio-app-')))`)) as string[];
  expect(names.length === 1 && names[0] === 'gio-app-ffffffffffff', `only the new gio-app cache is left (${names.join(', ')})`);
  expect((await evalAsync(`caches.open('gio-app-ffffffffffff').then((c) => c.match('/')).then((r) => r.text()).then((t) => t.includes(${JSON.stringify(MARKER)}))`)) === true, 'the marker is in the new cache copy of the shell');
  expect(await waitFor(`(document.querySelector('.cm-content')?.textContent ?? '') === ${JSON.stringify(edited)}`, 15000), `the unsaved edit of the saved drawing came back (${edited})`);
  expect(!log.slice(assetHitsBeforeUpdate).some((u) => u.startsWith('/assets/')), 'no /assets file was fetched during the whole update, reload included');
  await go(`${base}/`);
  await clear();
  expect(await waitFor(`(document.querySelector('.cm-content')?.textContent ?? '') === ${JSON.stringify(draft)}`, 15000), `the new drawing's draft came back (${draft})`);
}

const finish = async (code: number) => {
  try {
    session?.cleanup();
  } catch {
    /* already closed */
  }
  try {
    await current?.stop();
  } catch {
    /* already stopped */
  }
  setTimeout(() => {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* the browser may still hold files for a moment */
    }
    process.exit(code);
  }, 2000);
};

main()
  .catch((err) => {
    console.error(err);
    addFailure();
  })
  .finally(() => {
    console.log(failureCount() === 0 ? '\nAll offline checks passed.' : `\n${failureCount()} offline check(s) failed.`);
    void finish(failureCount() === 0 ? 0 : 1);
  });
