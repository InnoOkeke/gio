/**
 * Live check of GIO's learning features in a real browser (Microsoft Edge or Chrome, headless) at desktop
 * and phone width, in Little Turtles and Turtle Coders: the first win, the "I'm stuck" hint ladder, the Save
 * menu with its downloads (picture, movie, drawing file) and the garden's learning-days card. Starts nothing
 * itself: run the production server first (npm run build, then node dist/api/server.js), then:
 *   GIO_URL=http://localhost:3055 npm run check:learning
 * The hint ladder needs the real model (Amazon Bedrock) behind that server. Pictures are saved in a
 * gio-learning folder inside the system temp folder, and so are the downloaded files.
 * Every assertion is printed; the exit code is 1 if any fails.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gzipSync } from 'zlib';
import { readGif } from '../tests/helpers/gif.js';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = path.join(os.tmpdir(), 'gio-learning');
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

let failures = 0;
function expect(ok: boolean, what: string): void {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
}

type Mode = 'little' | 'coder';

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

  const seed = async (entries: Record<string, unknown>, query: string) => {
    await send('Page.navigate', { url: `${base}/?x=${Date.now()}` });
    await sleep(1200);
    await evaluate(`(() => { localStorage.clear(); const e = ${JSON.stringify(entries)}; for (const k of Object.keys(e)) localStorage.setItem(k, typeof e[k] === 'string' ? e[k] : JSON.stringify(e[k])); })()`);
    await send('Page.navigate', { url: `${base}/${query}` });
    await waitFor(`!!document.querySelector('#title')`, 15000);
    await sleep(700);
  };

  const type = async (code: string, replace = false) => {
    await evaluate(`document.querySelector('.cm-content')?.focus()`);
    if (replace) await evaluate(`document.execCommand('selectAll')`);
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

  await send('Page.enable');
  await send('Network.enable');

  const sizes = [
    { name: 'desktop', width: 1440, height: 1000, mobile: false },
    { name: 'phone', width: 390, height: 844, mobile: true },
  ];

  for (const v of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });

    for (const mode of ['little', 'coder'] as Mode[]) {
      const n = (s: string) => `${v.name}-${mode}-${s}`;
      const little = mode === 'little';
      const progress = little ? LITTLE_PROGRESS : CODER_PROGRESS;
      console.log(`\n=== ${v.name} ${v.width}x${v.height}, ${mode} ===`);

      /* (1) The first win, from a clean profile. */
      console.log('first win');
      await seed({ 'gio.mode': mode }, `?mode=${mode}`);
      const offered = await waitFor(`!!document.querySelector('[aria-label="Your first drawing"]')`, 5000);
      expect(offered, 'the offer is on the stage of a brand-new child');
      const bigButton = await size('[aria-label="Your first drawing"] button', little ? 'Draw a star!' : 'Make your first drawing');
      expect(!!bigButton && bigButton.h >= 72, `the big button is at least 72px high (${Math.round(bigButton?.h ?? 0)}px)`);
      const bigFont = (await evaluate(`parseFloat(getComputedStyle([...document.querySelectorAll('[aria-label="Your first drawing"] button')].find((b) => /star|drawing/i.test(b.textContent)) ?? document.body).fontSize)`)) as number;
      expect(bigFont >= 24, `the big button text is 24px or more (${bigFont}px)`);
      expect(
        (await evaluate(`document.activeElement?.closest('[aria-label="Your first drawing"]') !== null && /star|drawing/i.test(document.activeElement.textContent)`)) === true,
        'the big button has focus',
      );
      const buttonsInOffer = (await evaluate(`document.querySelectorAll('[aria-label="Your first drawing"] button').length`)) as number;
      expect(buttonsInOffer === 2, `only the big button and Skip are offered (${buttonsInOffer} buttons)`);
      await fits('offer', '[aria-label="Your first drawing"]');
      await shot(n('first-win-offer'));

      await click('[aria-label="Your first drawing"] button', little ? 'Draw a star!' : 'Make your first drawing');
      await sleep(500);
      expect(!(await evaluate(`!!document.querySelector('[aria-label="Your first drawing"]')`)), 'the offer goes away so the turtle can be seen');
      await shot(n('first-win-drawing'));
      const yours = await waitFor(`!!document.querySelector('[aria-labelledby="first-win-yours"]')`, 30000);
      expect(yours, "'Now make it yours!' appears when the star is finished");
      await sleep(600);
      const draft = JSON.parse((await stored('gio.draft')) ?? '{}') as { code?: string };
      expect(/REPEAT 5/.test(draft.code ?? '') && /FD 180/.test(draft.code ?? ''), 'the star program is in the editor');
      expect(!little ? (draft.code ?? '').startsWith('; My first star') : true, 'Turtle Coders see the title comment');
      const earnedSoFar = JSON.parse((await stored('gio.rewards')) ?? '{"friends":[],"stickers":[],"days":[]}') as { friends: string[]; stickers: string[]; days: string[] };
      expect(earnedSoFar.friends.length + earnedSoFar.stickers.length + earnedSoFar.days.length === 0, 'the borrowed star earned nothing');
      const swatch = await size('[aria-labelledby="first-win-yours"] [aria-pressed]', 'red');
      expect(!!swatch && swatch.w >= 48 && swatch.h >= 48, `colour swatches are at least 48px (${Math.round(swatch?.w ?? 0)}x${Math.round(swatch?.h ?? 0)})`);
      const swatches = (await evaluate(`document.querySelectorAll('[aria-labelledby="first-win-yours"] [aria-pressed]').length`)) as number;
      expect(swatches === 6, `six colour swatches (${swatches})`);
      await fits('yours', '[aria-labelledby="first-win-yours"]');
      await shot(n('first-win-yours'));

      await click('[aria-labelledby="first-win-yours"] [aria-pressed]', 'red');
      const credited = await waitFor(`!!localStorage.getItem('gio.rewards') && JSON.parse(localStorage.getItem('gio.rewards')).stickers.includes('first-drawing')`, 30000);
      expect(credited, "the child's own colour change earned the first sticker");
      const painted = JSON.parse((await stored('gio.draft')) ?? '{}') as { code?: string };
      expect(/SETPENCOLOR "red/.test(painted.code ?? ''), 'the program was rewritten in red');
      await sleep(600);
      await shot(n('first-win-colour'));
      await closeDialogs();
      await click('[aria-labelledby="first-win-yours"] button', 'Done');
      await sleep(300);
      expect(!(await evaluate(`!!document.querySelector('[aria-labelledby="first-win-yours"]')`)), 'Done closes the card');
      expect(((await stored('gio.firstWin')) ?? '').includes(mode), `gio.firstWin remembers ${mode}`);
      await send('Page.navigate', { url: `${base}/?mode=${mode}` });
      await waitFor(`!!document.querySelector('#title')`, 15000);
      await sleep(600);
      expect(!(await evaluate(`!!document.querySelector('[aria-label="Your first drawing"]')`)), 'the offer does not come back');

      // Skip ends it for good.
      await seed({ 'gio.mode': mode }, `?mode=${mode}`);
      if (!(await waitFor(`!!document.querySelector('[aria-label="Your first drawing"]')`, 5000))) {
        await shot(n('skip-offer-missing'));
        console.log(`  debug: storage ${await evaluate('JSON.stringify(Object.entries(localStorage))')}`);
      }
      await click('[aria-label="Your first drawing"] button', 'Skip');
      await sleep(300);
      await send('Page.navigate', { url: `${base}/?mode=${mode}` });
      await waitFor(`!!document.querySelector('#title')`, 15000);
      await sleep(600);
      expect(!(await evaluate(`!!document.querySelector('[aria-label="Your first drawing"]')`)), 'Skip ends the first win for good');

      // A child who has learned before never sees it.
      await seed({ 'gio.mode': mode, 'gio.progress': progress }, `?mode=${mode}`);
      expect(!(await evaluate(`!!document.querySelector('[aria-label="Your first drawing"]')`)), 'a child with quest progress is not offered it');

      /* (2) The hint ladder, level 1 to 3, against the real model. */
      console.log('hint ladder');
      if (little) {
        await seed({ 'gio.mode': 'little', 'gio.progress': progress, 'gio.draft': { title: 'My drawing', code: 'REPEAT 4 [\nFD 100\nRT 60\n]' } }, '?mode=little');
        await click('button', 'Run');
        await sleep(2500);
      } else {
        await seed({ 'gio.mode': 'coder', 'gio.progress': ['c-line', 'c-square'] }, '?mode=coder');
        await click('button', 'Quests');
        await sleep(500);
        await click('button', 'wonky square');
        await sleep(500);
        await type('REPEAT 4 [FD 100 RT 60]', true);
        await click('button', 'Run');
        await sleep(2500);
      }
      await click('button', 'stuck');
      const levels = [
        { level: 1, label: 'Think' },
        { level: 2, label: 'Look' },
        { level: 3, label: 'Fix' },
      ];
      for (const l of levels) {
        if (l.level > 1) await click('[aria-label="Help from the turtle"] button', 'Show me more');
        const ready = await waitFor(
          `(() => { const c = document.querySelector('[aria-label="Help from the turtle"]'); if (!c || c.querySelector('.thinking-dots')) return false; const on = c.querySelector('[aria-current="step"]'); return !!on && (on.getAttribute('aria-label') || '').startsWith(${JSON.stringify(l.label)}) && (c.querySelector('.hint-text p')?.textContent ?? '').trim().length > 0; })()`,
          90000,
        );
        const text = (await evaluate(`document.querySelector('[aria-label="Help from the turtle"] .hint-text')?.textContent ?? document.querySelector('[aria-label="Help from the turtle"]')?.textContent ?? ''`)) as string;
        expect(ready, `hint level ${l.level} (${l.label}) shows a hint: ${text.replace(/\s+/g, ' ').trim().slice(0, 110)}`);
        await sleep(400);
        await shot(n(`hint-${l.level}-${l.label.toLowerCase()}`));
        await fits(`hint level ${l.level}`, '[aria-label="Help from the turtle"]');
      }

      /* (3) The Save menu, the movie dialog and the three downloads. */
      console.log('save menu and downloads');
      const wait = await downloads(n('files'));
      if (little) await seed({ 'gio.mode': 'little', 'gio.progress': progress, 'gio.draft': { title: 'My drawing', code: SQUARE } }, '?mode=little');
      else await seed({ 'gio.mode': 'coder', 'gio.progress': progress }, '?mode=coder');
      if (!little) await type(SQUARE);
      await click('button', 'Run');
      await waitFor(`!!document.querySelector('.bubble-success')`, 15000);
      await sleep(600);
      await closeDialogs();
      await click('button[aria-haspopup="dialog"]', 'Save');
      await sleep(500);
      const rows = (await evaluate(`document.querySelectorAll('.save-row').length`)) as number;
      expect(rows === 3, `the Save menu offers three ways to keep a drawing (${rows})`);
      const row = await size('.save-row', 'Movie');
      expect(!!row && row.h >= 48, `menu rows are at least 48px high (${Math.round(row?.h ?? 0)}px)`);
      await fits('save menu', '[role=dialog]');
      await shot(n('save-menu'));

      await click('.save-row', 'Picture');
      const png = await wait('png');
      expect(png !== null, `picture downloaded: ${png}`);
      if (png) {
        const bytes = fs.readFileSync(png);
        expect(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.length > 1000, `PNG signature and size (${bytes.length} bytes)`);
      }

      await click('button[aria-haspopup="dialog"]', 'Save');
      await sleep(400);
      await click('.save-row', 'Drawing file');
      const svgFile = await wait('svg');
      expect(svgFile !== null, `drawing file downloaded: ${svgFile}`);
      if (svgFile) {
        const text = fs.readFileSync(svgFile, 'utf8');
        const r = (await evaluate(`(() => { const d = new DOMParser().parseFromString(${JSON.stringify(text)}, 'image/svg+xml'); const root = d.documentElement; return { error: !!d.querySelector('parsererror'), viewBox: root.getAttribute('viewBox'), width: root.getAttribute('width'), height: root.getAttribute('height'), lines: d.querySelectorAll('line, path, polyline').length }; })()`)) as {
          error: boolean;
          viewBox: string | null;
          width: string | null;
          height: string | null;
          lines: number;
        };
        expect(!r.error, 'SVG parses with no parser error');
        expect(!!r.viewBox, `SVG has a viewBox (${r.viewBox})`);
        expect(/mm$/.test(r.width ?? '') && /mm$/.test(r.height ?? ''), `SVG width and height end in mm (${r.width} x ${r.height})`);
        expect(r.lines > 0, `SVG draws something (${r.lines} shapes)`);
      }

      await click('button[aria-haspopup="dialog"]', 'Save');
      await sleep(400);
      await click('.save-row', 'Movie');
      const movieReady = await waitFor(`(document.getElementById('replay-title')?.textContent ?? document.querySelector('[aria-labelledby="replay-title"] h2')?.textContent ?? '').includes('ready')`, 90000);
      expect(movieReady, 'the movie dialog finishes encoding');
      await sleep(400);
      await fits('movie dialog', '[aria-labelledby="replay-title"]');
      await shot(n('movie-dialog'));
      await click('[aria-labelledby="replay-title"] button', 'Save movie');
      const gifFile = await wait('gif');
      expect(gifFile !== null, `movie downloaded: ${gifFile}`);
      if (gifFile) {
        const gif = readGif(new Uint8Array(fs.readFileSync(gifFile)));
        expect(gif.signature === 'GIF89a', `GIF header ${gif.signature}`);
        expect(gif.endsWithTrailer, 'GIF ends with the trailer');
        expect(gif.frames > 20, `GIF has more than 20 frames (${gif.frames})`);
        expect(gif.loop !== null, `GIF has a loop extension (loop ${gif.loop})`);
        expect(gif.width === 400 && gif.height === 400, `GIF is 400x400 (${gif.width}x${gif.height})`);
      }
      await escape();

      /* (4) The garden's learning-days card for a child who started before days were counted. */
      console.log('garden learning days');
      await seed({ 'gio.mode': mode, 'gio.progress': progress }, `?mode=${mode}`);
      const gardenButton = await waitFor(`!!document.querySelector('header button[aria-label]') && [...document.querySelectorAll('header button')].some((b) => (b.getAttribute('aria-label') ?? '').includes('garden'))`, 10000);
      if (!gardenButton) await shot(n('garden-missing'));
      expect(gardenButton, 'the garden button is on the page');
      await click('header button', 'garden');
      await sleep(700);
      await evaluate(`(() => { const s = document.querySelector('[role=dialog] .overflow-y-auto'); if (s) s.scrollTop = 99999; })()`);
      await sleep(400);
      const card = (await evaluate(`document.querySelector('#week-title')?.closest('section')?.textContent ?? ''`)) as string;
      console.log(`  card: ${card.replace(/\s+/g, ' ').trim()}`);
      expect(!/\b0 days?\b/.test(card), "the card never says '0 days'");
      expect(card.includes('Your garden is already growing!'), "a legacy child reads 'Your garden is already growing!'");
      await fits('garden', '[role=dialog]');
      await shot(n('garden-learning-days'));
    }
  }
  ws.close();

  /* (5) Chunk sizes: the replay code must stay out of the main bundle. */
  console.log('\n=== chunks ===');
  const assets = path.join(process.cwd(), 'dist', 'ui', 'assets');
  const chunks = fs.readdirSync(assets).filter((f) => f.endsWith('.js'));
  const info = chunks.map((f) => {
    const bytes = fs.readFileSync(path.join(assets, f));
    return { name: f, size: bytes.length, gzip: gzipSync(bytes).length };
  });
  for (const c of info) console.log(`  ${c.name}: ${(c.size / 1000).toFixed(1)} kB (${(c.gzip / 1000).toFixed(1)} kB gzip)`);
  const main = info.find((c) => c.name.startsWith('index-'));
  expect(chunks.length >= 3, `three script chunks: main, replay dialog and gif encoder (${chunks.length})`);
  expect(!!main && main.size < 720_000, `the main chunk stays under 720 kB (${((main?.size ?? 0) / 1000).toFixed(1)} kB)`);
  const html = fs.readFileSync(path.join(process.cwd(), 'dist', 'ui', 'index.html'), 'utf8');
  expect(!/gifenc|ReplayDialog/.test(html), 'the gif encoder and replay dialog are not loaded up front');
}

main()
  .catch((err) => {
    console.error(err);
    failures += 1;
  })
  .finally(() => {
    console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
    browser.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* the browser may still hold its profile for a moment; the OS cleans temp files */
      }
    }, 1500);
  });
