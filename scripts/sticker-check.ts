/**
 * Live check of the WhatsApp sticker in a real browser (Microsoft Edge or Chrome, headless): draw something, tap
 * "WhatsApp sticker" in the Picture menu, then read the file that arrives and check what WhatsApp needs: 512x512,
 * WebP, 100 KB or less, a transparent background and a white outline. Headless browsers have no share sheet, so the
 * download path is the one tested here. Starts nothing itself: run the production server first
 * (npm run build, then node dist/api/server.js), then:
 *   GIO_URL=http://localhost:4101 npm run check:sticker
 * Files go to a gio-sticker folder inside the system temp folder. Exit code 1 on any failure.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readImageFacts, stickerProblems } from '../src/ui/export/sticker.js';
import { addFailure, expect, failureCount, launchBrowser, sleep, type BrowserSession } from './lib/browser.js';
const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = path.join(os.tmpdir(), 'gio-sticker');
const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const draft = (code: string) => ({ title: 'My drawing', code });
let session: BrowserSession | null = null;

interface Pixels {
  corners: number[];
  /** Fully white, fully opaque pixels. */
  white: number;
  /** Dark opaque pixels (the drawn lines). */
  dark: number;
  /** Pixels that are neither fully clear nor fully opaque (smooth edges). */
  soft: number;
  width: number;
  height: number;
  /** The smallest box around everything that is not clear. */
  box: { x0: number; y0: number; x1: number; y1: number };
}

async function main() {
  session = await launchBrowser(base, outDir);
  const { send, evaluate, waitFor, click, seed, shot, downloads } = session;

  /** Opens the Picture menu and returns the sticker row's aria-disabled state. */
  const openMenu = async () => {
    await click('button[aria-haspopup=dialog]', 'Picture');
    await waitFor(`!![...document.querySelectorAll('[role=dialog] button')].find((b) => b.textContent.includes('WhatsApp sticker'))`, 5000);
    await sleep(400);
  };

  const scenarios: { name: string; code: string }[] = [
    { name: 'house', code: 'REPEAT 4 [FD 100 RT 90]\nSETPC "yellow\nFILL\nPU SETXY 50 150 PD\nSETPC "red\nCIRCLE 30\nFILL' },
    { name: 'star', code: 'REPEAT 120 [FD 250 RT 119]' },
  ];

  for (const s of scenarios) {
    console.log(`\n=== sticker: ${s.name} ===`);
    await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS, 'gio.draft': draft(s.code) }, '?mode=coder');
    await click('button', 'Run');
    await waitFor(`!!document.querySelector('.bubble-success')`, 15000);
    await sleep(600);
    const wait = await downloads(`sticker-${s.name}`);
    await openMenu();
    await click('[role=dialog] button', 'WhatsApp sticker');
    const file = await wait('webp', 20000);
    expect(file !== null, 'a .webp file arrived');
    if (!file) continue;
    const bytes = new Uint8Array(fs.readFileSync(file));
    const facts = readImageFacts(bytes);
    console.log(`  ${path.basename(file)}: ${facts.format} ${facts.width}x${facts.height}, ${facts.bytes} bytes`);
    expect(facts.format === 'webp', 'the file really is WebP');
    expect(facts.width === 512 && facts.height === 512, `it is 512x512 (${facts.width}x${facts.height})`);
    expect(facts.bytes <= 100 * 1024, `it is 100 KB or less (${facts.bytes} bytes)`);
    const pixels = (await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const img = new Image();
      img.src = 'data:image/webp;base64,${Buffer.from(bytes).toString('base64')}';
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const at = (x, y) => d[(y * c.width + x) * 4 + 3];
      let white = 0, dark = 0, soft = 0, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const o = (y * c.width + x) * 4, a = d[o + 3];
        if (a > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (a > 0 && a < 255) soft++;
        if (a === 255 && d[o] > 245 && d[o + 1] > 245 && d[o + 2] > 245) white++;
        if (a === 255 && d[o] < 80 && d[o + 1] < 80 && d[o + 2] < 80) dark++;
      }
      return { corners: [at(0, 0), at(c.width - 1, 0), at(0, c.height - 1), at(c.width - 1, c.height - 1)], white, dark, soft, width: c.width, height: c.height, box: { x0, y0, x1, y1 } };
    })()` }))?.result?.value as Pixels;
    expect(pixels.corners.every((a) => a === 0), `all four corners are transparent (${pixels.corners.join(', ')})`);
    expect(pixels.white > 2000, `a white outline is there (${pixels.white} white pixels)`);
    expect(pixels.dark > 100, `the drawing is still dark on top of it (${pixels.dark} dark pixels)`);
    expect(pixels.box.x0 >= 2 && pixels.box.y0 >= 2 && pixels.box.x1 <= 509 && pixels.box.y1 <= 509, `the outline does not touch the edge (box ${pixels.box.x0},${pixels.box.y0} to ${pixels.box.x1},${pixels.box.y1})`);
    const problems = stickerProblems(facts, pixels.corners.every((a) => a === 0));
    expect(problems.length === 0, `WhatsApp's rules all pass${problems.length ? `: ${problems.join('; ')}` : ''}`);
    fs.copyFileSync(file, path.join(outDir, `${s.name}-sticker.webp`));
    await shot(`${s.name}-after`);
  }

  console.log('\n=== sticker: nothing drawn yet ===');
  await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
  await openMenu();
  const disabled = await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find((b) => b.textContent.includes('WhatsApp sticker'))?.getAttribute('aria-disabled')`);
  expect(disabled === 'true', 'the sticker row is greyed out until something is drawn');
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
