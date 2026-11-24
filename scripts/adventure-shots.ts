/**
 * Adventure device check: opens every adventure screen on every device and orientation, runs the
 * standing assertions from device-checks.ts, then the adventure's own: the scene is inside the
 * viewport (at least 280 px wide on phones in portrait), no map cell under 28 px, Go sits in the
 * bottom 40 percent of a portrait screen. Run the production server first (npm run build && npm start), then:
 *   npm run check:adventure
 * GIO_URL is the server (default http://localhost:3901), GIO_SHOTS_DIR the folder for pictures
 * (default tmp/adventure-shots). DEVICE, ORIENTATION and SCREEN narrow the run. Exits 1 on any failure.
 */
import fs from 'fs';
import path from 'path';
import { ASSERTIONS, COLLECT_FACTS, calmPage, type Facts } from './device-checks';
import { launchBrowser, sleep } from './lib/cdp';
import { applyDevice, DEVICES, type Orientation } from './lib/devices';
import { SCREENS } from './lib/screens';
const base = process.env['GIO_URL'] ?? 'http://localhost:3901';
const outDir = process.env['GIO_SHOTS_DIR'] ?? path.join('tmp', 'adventure-shots');
const onlyDevice = process.env['DEVICE'];
const onlyOrientation = process.env['ORIENTATION'] as Orientation | undefined;
const onlyScreens = (process.env['SCREEN'] ?? process.env['SCREENS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
interface Own {
  viewport: { w: number; h: number };
  scene: { x: number; y: number; w: number; h: number } | null;
  cols: number;
  go: { y: number; h: number } | null;
}
const OWN_FACTS = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const scene = document.querySelector('.adv-scene-box');
  const svg = scene && scene.querySelector('svg');
  const go = r(document.querySelector('.adv-go, .dock-run'));
  const vb = svg ? svg.getAttribute('viewBox').split(' ').map(Number) : [0, 0, 0, 0];
  const cols = Math.max(vb[2], vb[3]) / 50;
  return { viewport: { w: innerWidth, h: innerHeight }, scene: r(scene), cols, go: go && { y: go.y, h: go.h } };
})()`;
function own(f: Own, screen: string, orientation: Orientation): string[] {
  const out: string[] = [];
  if (!f.scene) return screen === 'adventure-map' || screen === 'adventure-realm' || screen === 'adventure-intro' ? out : ['no scene on the page'];
  const s = f.scene;
  if (s.x < -1 || s.y < -1 || s.x + s.w > f.viewport.w + 1 || s.y + s.h > f.viewport.h + 1) out.push(`scene outside the viewport (${Math.round(s.x)},${Math.round(s.y)} ${Math.round(s.w)}x${Math.round(s.h)})`);
  if (f.viewport.w <= 430 && orientation === 'portrait' && s.w < 280 && screen !== 'adventure-watch') out.push(`scene only ${Math.round(s.w)} px wide`);
  if (f.cols > 0 && (s.w - 12) / f.cols < 28) out.push(`map cells ${Math.round((s.w - 12) / f.cols)} px, under 28`);
  if (f.go && orientation === 'portrait' && f.viewport.w <= 900 && f.go.y + f.go.h / 2 < f.viewport.h * 0.6) out.push('Go is above the bottom 40 percent of the screen');
  return out;
}
async function main(): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  // Stop at once when the server is down, instead of waiting on every screen.
  const up = await fetch(base).then((r) => r.ok).catch(() => false);
  if (!up) throw new Error(`no server at ${base}: run npm run build && npm start first`);
  const cdp = await launchBrowser(base);
  const failures: string[] = [];
  let visits = 0;
  try {
    for (const device of DEVICES) {
      if (onlyDevice && device.id !== onlyDevice) continue;
      for (const orientation of device.orientations) {
        if (onlyOrientation && orientation !== onlyOrientation) continue;
        const view = await applyDevice(cdp, device, orientation);
        const ctx = { touch: device.touch, insets: view.insets };
        for (const screen of SCREENS) {
          if (!screen.id.startsWith('adventure') || !screen.open) continue;
          if (onlyScreens.length && !onlyScreens.includes(screen.id)) continue;
          visits++;
          const tag = `${device.id} ${orientation} ${screen.id}`;
          try {
            await applyDevice(cdp, device, orientation);
            cdp.takeErrors();
            await screen.open(cdp);
            await sleep(300);
            const facts = await cdp.evaluate<Facts>(COLLECT_FACTS);
            const mine = await cdp.evaluate<Own>(OWN_FACTS);
            if (!facts || !mine) throw new Error('could not read the page');
            const errors = cdp.takeErrors();
            await cdp.shot(path.join(outDir, `${device.id}-${orientation}-${screen.id}.png`));
            for (const [name, assertion] of Object.entries(ASSERTIONS)) for (const m of assertion(facts, ctx)) failures.push(`${tag} [${name}] ${m}`);
            for (const m of calmPage(facts, errors)) failures.push(`${tag} [g-calm] ${m}`);
            for (const m of own(mine, screen.id, orientation)) failures.push(`${tag} [adventure] ${m}`);
          } catch (e) {
            failures.push(`${tag} [open] ${(e as Error).message}`);
          }
        }
      }
    }
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
    await cdp.close();
  }
  for (const f of failures.slice(0, 60)) console.log(`FAIL ${f}`);
  console.log(`check:adventure: ${visits} visits, ${failures.length} failures. Pictures: ${path.resolve(outDir)}`);
  if (failures.length) process.exitCode = 1;
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});