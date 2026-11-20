/**
 * Draws GIO's app icons from public/logo.svg (the GioMark) in headless Edge or Chrome and writes public/icons/*.png.
 * Run `npm run build:icons` after changing the logo, then commit the PNGs.
 *   favicon-32.png        32x32   the logo as is
 *   apple-touch-180.png   180x180 full-bleed square tile (iOS rounds the corners itself)
 *   icon-192.png, icon-512.png                  the logo as is ("any")
 *   icon-maskable-192.png, icon-maskable-512.png full-bleed square, turtle at 62% so it stays inside the safe circle
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser } from './lib/browser.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = fs.readFileSync(path.join(root, 'public', 'logo.svg'), 'utf8');
const outDir = path.join(root, 'public', 'icons');

/** Square tile with no rounded corners. */
const square = logo.replace(/rx="116"/g, 'rx="0"');

/** Square tile with the turtle and line scaled to 62% about the centre. */
function maskable(): string {
  const start = square.indexOf('<path d="M84');
  const end = square.lastIndexOf('</svg>');
  if (start < 0 || end < 0) throw new Error('public/logo.svg no longer has the shape this script expects');
  const art = square.slice(start, end);
  return `${square.slice(0, start)}<g transform="translate(256 256) scale(0.62) translate(-256 -256)">${art}</g>${square.slice(end)}`;
}

const JOBS: { file: string; size: number; svg: string }[] = [
  { file: 'favicon-32.png', size: 32, svg: logo },
  { file: 'apple-touch-180.png', size: 180, svg: square },
  { file: 'icon-192.png', size: 192, svg: logo },
  { file: 'icon-512.png', size: 512, svg: logo },
  { file: 'icon-maskable-192.png', size: 192, svg: maskable() },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable() },
];

async function main(): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launchBrowser('http://localhost', path.join(os.tmpdir(), 'gio-icons'));
  try {
    for (const job of JOBS) {
      const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${job.size}px;height:${job.size}px}</style>${job.svg}`;
      await browser.send('Emulation.setDeviceMetricsOverride', { width: job.size, height: job.size, deviceScaleFactor: 1, mobile: false });
      await browser.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
      await browser.send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
      await browser.waitFor(`document.querySelector('svg') && document.querySelector('svg').getBoundingClientRect().width === ${job.size}`, 10000);
      const shot = await browser.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: job.size, height: job.size, scale: 1 } });
      if (!shot.data) throw new Error(`No picture came back for ${job.file}`);
      fs.writeFileSync(path.join(outDir, job.file), Buffer.from(shot.data, 'base64'));
      console.log(`wrote public/icons/${job.file} (${job.size}x${job.size})`);
    }
  } finally {
    browser.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
