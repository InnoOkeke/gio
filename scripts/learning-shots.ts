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
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gzipSync } from 'zlib';
import { QUESTS } from '../src/logo/quests.js';
import { ISLANDS, islandOf, islandQuestIds } from '../src/ui/path/islands.js';
import { readGif } from '../tests/helpers/gif.js';
import { addFailure, expect, failureCount, launchBrowser, sleep, type BrowserSession } from './lib/browser.js';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = path.join(os.tmpdir(), 'gio-learning');

const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const LITTLE_PROGRESS = ['l-walk', 'l-corner', 'l-square'];
const SQUARE = 'REPEAT 4 [FD 100 RT 90]';

type Mode = 'little' | 'coder';

let session: BrowserSession | null = null;

async function main() {
  session = await launchBrowser(base, outDir);
  const { send, evaluate, waitFor, click, seed, type, shot, escape, closeDialogs, fits, size, stored, downloads } = session;
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
      await waitFor(`!!document.querySelector('[aria-label="Your first drawing"]')`, 5000);
      await click('[aria-label="Your first drawing"] button', 'Skip');
      expect(await waitFor(`(localStorage.getItem('gio.firstWin') ?? '').includes(${JSON.stringify(mode)})`, 5000), `Skip writes ${mode} to gio.firstWin`);
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
        const island = islandOf('c-bug-square');
        const quest = QUESTS.find((q) => q.id === 'c-bug-square');
        if (!island || !quest) throw new Error('c-bug-square is missing from the quests or the islands');
        // Islands open one after another, so clear every island before this one, and the quests before this one on its own island.
        const here = islandQuestIds(island);
        const before = [...ISLANDS.coder.slice(0, ISLANDS.coder.indexOf(island)).flatMap((i) => islandQuestIds(i)), ...here.slice(0, here.indexOf('c-bug-square'))];
        await seed({ 'gio.mode': 'coder', 'gio.progress': before }, '?mode=coder');
        await click('button', 'Adventure map');
        expect(await waitFor(`!!document.querySelector('#map-title')`, 8000), 'the adventure map opens');
        await click('button.isle-card', island.name);
        await sleep(500);
        await click('button', quest.title.replace(/^Bug hunt: /, ''));
        await sleep(500);
        await type('REPEAT 4 [FD 100 RT 60]', true);
        await click('button', 'Run');
        await sleep(2500);
      }
      await closeDialogs();
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
        await closeDialogs();
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
      await click('button[aria-haspopup="dialog"]', 'Picture');
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

      await click('button[aria-haspopup="dialog"]', 'Picture');
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

      await click('button[aria-haspopup="dialog"]', 'Picture');
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
  /* (5) Chunk sizes: the replay code must stay out of the main bundle. */
  console.log('\n=== chunks ===');
  const assets = path.join(process.cwd(), 'dist', 'ui', 'assets');
  const chunks = fs.readdirSync(assets).filter((f) => f.endsWith('.js'));
  const info = chunks.map((f) => {
    const bytes = fs.readFileSync(path.join(assets, f));
    return { name: f, size: bytes.length, gzip: gzipSync(bytes).length };
  });
  for (const c of info) console.log(`  ${c.name}: ${(c.size / 1000).toFixed(1)} kB (${(c.gzip / 1000).toFixed(1)} kB gzip)`);
  const html = fs.readFileSync(path.join(process.cwd(), 'dist', 'ui', 'index.html'), 'utf8');
  // The entry chunk is the one index.html loads (Vite names it after the input, which changed when the Python runner page was added).
  const entry = /<script[^>]+src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
  const main = info.find((c) => c.name === entry);
  expect(chunks.length >= 3, `three script chunks: main, replay dialog and gif encoder (${chunks.length})`);
  // The editor libraries have their own chunk and Pyodide is fetched only on request, so the main chunk stays under the Phase 3 budget.
  expect(!!main && main.size < 720_000, `the main chunk ${entry} stays under 720 kB (${((main?.size ?? 0) / 1000).toFixed(1)} kB)`);
  expect(!/gifenc|ReplayDialog/.test(html), 'the gif encoder and replay dialog are not loaded up front');
}

main()
  .catch((err) => {
    console.error(err);
    addFailure();
  })
  .finally(() => {
    const failures = failureCount();
    console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
    session?.cleanup();
  });
