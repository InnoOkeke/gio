/**
 * Visits every screen on every device in both orientations, checks the layout assertions, and
 * saves a picture of each. Starts nothing itself: run the production server first
 * (npm run build && npm start), then:
 *   npm run check:devices
 * GIO_URL is the server (default http://localhost:3001), GIO_SHOTS_DIR the folder for pictures
 * (default: gio-device-shots in the system temp folder). DEVICE=ipad-mini and
 * ORIENTATION=landscape narrow the run; SCREEN=certificate picks one screen. Writes index.json and
 * index.md next to the pictures and exits 1 if any assertion fails or a screen cannot be opened.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ASSERTIONS, COLLECT_FACTS, calmPage, type Facts } from './device-checks';
import { launchBrowser } from './lib/cdp';
import { sleep } from './lib/cdp';
import { applyDevice, DEVICES, type Orientation } from './lib/devices';
import { SCREENS } from './lib/screens';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = process.env['GIO_SHOTS_DIR'] ?? path.join(os.tmpdir(), 'gio-device-shots');
const onlyDevice = process.env['DEVICE'];
const onlyOrientation = process.env['ORIENTATION'] as Orientation | undefined;
const onlyScreen = process.env['SCREEN'];

interface Entry {
  device: string;
  orientation: Orientation;
  screen: string;
  file: string | null;
  status: 'pass' | 'fail' | 'empty';
  failures: { assertion: string; message: string }[];
}

async function main(): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const cdp = await launchBrowser(base);
  const entries: Entry[] = [];
  try {
    for (const device of DEVICES) {
      if (onlyDevice && device.id !== onlyDevice) continue;
      for (const orientation of device.orientations) {
        if (onlyOrientation && orientation !== onlyOrientation) continue;
        const view = await applyDevice(cdp, device, orientation);
        const ctx = { touch: device.touch, insets: view.insets };
        for (const screen of SCREENS) {
          if (onlyScreen && screen.id !== onlyScreen) continue;
          const entry: Entry = { device: device.id, orientation, screen: screen.id, file: null, status: 'pass', failures: [] };
          entries.push(entry);
          if (!screen.open) {
            entry.status = 'empty';
            continue;
          }
          try {
            cdp.takeErrors();
            await screen.open(cdp);
            await sleep(300);
            const facts = (await cdp.evaluate<Facts>(COLLECT_FACTS)) ?? null;
            if (!facts) throw new Error('could not read the page');
            const errors = cdp.takeErrors();
            const file = path.join(outDir, `${device.id}-${orientation}-${screen.id}.png`);
            await cdp.shot(file);
            entry.file = file;
            for (const [name, assertion] of Object.entries(ASSERTIONS)) {
              for (const message of assertion(facts, ctx)) entry.failures.push({ assertion: name, message });
            }
            for (const message of calmPage(facts, errors)) entry.failures.push({ assertion: 'g-calm', message });
          } catch (e) {
            entry.failures.push({ assertion: 'open', message: `could not open the screen: ${(e as Error).message}` });
          }
          if (entry.failures.length) entry.status = 'fail';
        }
      }
    }
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
    await cdp.close();
  }
  report(entries);
}

function report(entries: Entry[]): void {
  const failing = entries.filter((e) => e.status === 'fail');
  const byAssertion: Record<string, number> = {};
  for (const e of failing) for (const f of e.failures) byAssertion[f.assertion] = (byAssertion[f.assertion] ?? 0) + 1;

  const lines: string[] = ['# check:devices', '', `Server ${base}. ${entries.length} screen visits, ${failing.length} with failures.`, ''];
  lines.push('## Per device', '', '| Device | Orientation | Visits | Failing |', '| --- | --- | --- | --- |');
  const groups = new Map<string, Entry[]>();
  for (const e of entries) groups.set(`${e.device}|${e.orientation}`, [...(groups.get(`${e.device}|${e.orientation}`) ?? []), e]);
  for (const [key, list] of groups) {
    const [d, o] = key.split('|');
    const bad = list.filter((e) => e.status === 'fail').length;
    lines.push(`| ${d} | ${o} | ${list.filter((e) => e.status !== 'empty').length} | ${bad ? `${bad} FAIL` : 'pass'} |`);
  }
  lines.push('', '## Failures by assertion', '');
  for (const [k, n] of Object.entries(byAssertion)) lines.push(`- ${k}: ${n}`);
  if (!failing.length) lines.push('- none');
  lines.push('', '## Failures', '');
  for (const e of failing) {
    lines.push(`### ${e.device} ${e.orientation} / ${e.screen}`);
    for (const f of e.failures) lines.push(`- [${f.assertion}] ${f.message}`);
    lines.push('');
  }
  lines.push('## Files', '');
  for (const e of entries) lines.push(`- ${e.status.toUpperCase()} ${e.device} ${e.orientation} ${e.screen}${e.file ? ` ${e.file}` : ''}`);
  fs.writeFileSync(path.join(outDir, 'index.md'), lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ base, byAssertion, entries }, null, 2) + '\n', 'utf8');

  console.log(lines.slice(0, lines.indexOf('## Failures')).join('\n'));
  for (const e of failing.slice(0, 40)) console.log(`FAIL ${e.device} ${e.orientation} ${e.screen}: ${e.failures.slice(0, 2).map((f) => `[${f.assertion}] ${f.message}`).join(' | ')}`);
  if (failing.length > 40) console.log(`...and ${failing.length - 40} more, see ${path.join(outDir, 'index.md')}`);
  console.log(`Pictures and the full list: ${outDir}`);
  if (failing.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
