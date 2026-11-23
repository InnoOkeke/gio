/**
 * Takes screenshots of the adventure map in a real browser (Microsoft Edge or Chrome, headless), in both
 * modes, at phone, tablet and desktop width. Starts nothing itself: run the production server first
 * (npm run build && npm start), then:
 *   npm run check:map-shots
 * GIO_URL is the server (default http://localhost:3001) and GIO_SHOTS_DIR the folder for the pictures
 * (default: a map-shots folder inside the system temp folder).
 *
 * It seeds only gio.mode, gio.progress and gio.path, with dates counted back from today, like a returning
 * child. The mastery, island and review moments are reached by really solving quests in the page: code is
 * typed into the editor (Turtle Coders) or built from blocks (Little Turtles) and Run is pressed.
 * It also checks that no picture has anything wider than the screen, and fails (exit 1) if one has.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ISLANDS } from '../src/ui/path/islands';
import { CODER_WORLDS } from '../src/ui/path/worlds';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = process.env['GIO_SHOTS_DIR'] ?? path.join(os.tmpdir(), 'map-shots');
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
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-map-cdp-'));
const browser = spawn(exe, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const failures: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A local calendar date, n days from today (negative is the past), as YYYY-MM-DD like the app stores it. */
function day(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Star = 'clean' | 'helped';
interface Seed {
  progress: string[];
  path: {
    v: 1;
    quests: Record<string, { s: Star; d: string }>;
    sailed: Record<string, string>;
    kept: string[];
    reviews: Record<string, { box: number; due: string; last: string[] }>;
    reviewedOn: string | null;
    /** Stages skipped by passing a skill check. */
    tested?: Record<string, string>;
  };
}

/** Quests with a star and the day they were done, in the order given. */
function stars(list: [id: string, star: Star, daysAgo: number][]): Seed {
  const quests: Seed['path']['quests'] = {};
  for (const [id, s, ago] of list) quests[id] = { s, d: day(-ago) };
  return { progress: list.map(([id]) => id), path: { v: 1, quests, sailed: {}, kept: [], reviews: {}, reviewedOn: null } };
}

/** Add a sailed island whose review has been waiting since yesterday. */
function withSailed(seed: Seed, key: string, sailedAgo: number): Seed {
  seed.path.sailed[key] = day(-sailedAgo);
  seed.path.reviews[key] = { box: 1, due: day(-1), last: [] };
  return seed;
}

/** A returning child half way through the journey: one island sailed (review waiting), one in progress, the rest locked. */
function midJourney(mode: 'little' | 'coder'): Seed {
  if (mode === 'little') {
    const s = stars([
      ['l-walk', 'clean', 12],
      ['l-circle', 'clean', 11],
      ['l-corner', 'clean', 10],
      ['l-zigzag', 'clean', 10],
      ['l-square', 'clean', 9],
      ['l-rectangle', 'clean', 9],
      ['l-repeat-square', 'clean', 3],
      ['l-triangle', 'clean', 2],
      ['l-stairs', 'helped', 1],
    ]);
    return withSailed(s, 'little:moves', 8);
  }
  const s = stars([
    ['c-line', 'clean', 12],
    ['c-ell', 'clean', 11],
    ['c-square', 'clean', 10],
    ['c-rectangle', 'clean', 9],
    ['c-triangle', 'clean', 9],
    ['c-circle', 'clean', 8],
    ['c-repeat', 'clean', 3],
    ['c-loop-triangle', 'clean', 2],
    ['c-star', 'helped', 1],
  ]);
  return withSailed(s, 'coder:moves', 8);
}

/** Shape Shore sailed and the next stage tested out, so the map shows sailed, tested, open and locked stages together. */
function testedOut(mode: 'little' | 'coder'): Seed {
  const s = stars([]);
  s.path.sailed[`${mode}:moves`] = day(-6);
  s.path.tested = { [`${mode}:loops`]: day(-1) };
  return s;
}

/** Every stage sailed, so the last (gold) stage and the full pip rail can be seen. */
function allSailed(mode: 'little' | 'coder'): Seed {
  const s = stars([]);
  ISLANDS[mode].forEach((island, i) => {
    s.path.sailed[island.key] = day(-(60 - i));
  });
  return s;
}

/** One quest short of mastering the first unit of Shape Shore. */
function almostUnit(mode: 'little' | 'coder'): Seed {
  return mode === 'little' ? stars([['l-walk', 'clean', 2]]) : stars([['c-line', 'clean', 2]]);
}

/** One quest short of sailing Shape Shore: the first unit is done and the second has one gold star. */
function almostIsland(mode: 'little' | 'coder'): Seed {
  return mode === 'little'
    ? stars([
        ['l-walk', 'clean', 6],
        ['l-corner', 'clean', 5],
        ['l-zigzag', 'clean', 5],
        ['l-rectangle', 'clean', 1],
      ])
    : stars([
        ['c-line', 'clean', 6],
        ['c-ell', 'clean', 5],
        ['c-square', 'clean', 5],
        ['c-rectangle', 'clean', 1],
      ]);
}

/** Shape Shore sailed, with a review waiting for the two oldest quests. */
function reviewWaiting(mode: 'little' | 'coder'): Seed {
  return mode === 'little'
    ? withSailed(
        stars([
          ['l-walk', 'clean', 12],
          ['l-circle', 'clean', 11],
          ['l-corner', 'clean', 5],
          ['l-zigzag', 'clean', 5],
          ['l-square', 'clean', 4],
          ['l-rectangle', 'clean', 4],
        ]),
        'little:moves',
        4,
      )
    : withSailed(
        stars([
          ['c-line', 'clean', 12],
          ['c-ell', 'clean', 11],
          ['c-square', 'clean', 5],
          ['c-rectangle', 'clean', 5],
          ['c-triangle', 'clean', 4],
          ['c-circle', 'clean', 4],
        ]),
        'coder:moves',
        4,
      );
}

/** What to build for each quest title. Text is typed (Turtle Coders); blocks are tapped (Little Turtles). */
type Piece = ['Forward' | 'Turn right' | 'Repeat' | 'Circle', number];
const CODER_ANSWERS: Record<string, string> = {
  'Hello, turtle': 'FD 100',
  'The letter L': 'FD 100 RT 90 FD 60',
  'Three sides': 'FD 100 RT 120 FD 100 RT 120 FD 100',
};
const LITTLE_ANSWERS: Record<string, Piece[]> = {
  'Go for a walk': [['Forward', 50]],
  'Round and round': [['Circle', 50]],
  'Turn the corner': [['Forward', 100], ['Turn right', 90], ['Forward', 100]],
  'Make a box': [['Repeat', 4], ['Forward', 100], ['Turn right', 90]],
};

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
  const click = async (selector: string, text = '', scope = 'document') => {
    const ok = await evaluate(`(() => {
      const el = [...${scope}.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.getAttribute('aria-label') ?? '').includes(${JSON.stringify(text)}) || (e.textContent ?? '').includes(${JSON.stringify(text)}));
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

  const pressKey = async (key: string, code: string, vk: number) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  };

  /** Anything wider than the screen, or a tap target under 40px inside the open dialog, is reported. */
  const audit = async (name: string, narrow: boolean) => {
    const report = (await evaluate(`(() => {
      const w = innerWidth;
      const wide = [...document.querySelectorAll('body *')].filter((e) => {
        // Content inside an intentional sideways scroller (data-hscroll) is not page overflow.
        if (e.closest('.moment-confetti') || e.closest('.sr-only') || e.parentElement?.closest('[data-hscroll]')) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > w + 1 || r.left < -1);
      }).slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); const b = e.closest('button'); return e.tagName + ' ' + (b ? (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 30) : '') + ' x' + Math.round(r.left) + '-' + Math.round(r.right); });
      const dlg = document.querySelector('[role=dialog]');
      const small = dlg ? [...dlg.querySelectorAll('button:not([disabled])')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 40 || r.width < 40); }).map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)) : [];
      const plain = [...document.querySelectorAll('span[aria-label]:not([role])')].map((e) => e.getAttribute('aria-label') ?? '');
      return { scroll: document.documentElement.scrollWidth > w + 1, wide, small, plain };
    })()`)) as { scroll: boolean; wide: string[]; small: string[]; plain: string[] } | undefined;
    if (!report) return;
    // A name on a plain span is ignored by screen readers; it needs a role, or visible text plus sr-only text instead.
    if (report.plain.length) failures.push(`${name}: span with aria-label and no role: ${report.plain.join(', ')}`);
    if (report.scroll || report.wide.length) {
      const msg = `${name}: horizontal overflow ${report.scroll ? '(page scrolls sideways) ' : ''}${report.wide.join(', ')}`;
      console.warn(msg);
      if (narrow) failures.push(msg);
    }
    if (report.small.length) console.warn(`${name}: small tap targets: ${report.small.join('; ')}`);
  };

  let narrow = false;
  const shot = async (name: string) => {
    await audit(name, narrow);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(r.data ?? '', 'base64'));
    console.log(file);
  };

  /** The map shows every stage of the mode: cards with stage numbers, one pip each, and the worlds on the coder map. */
  const checkMap = async (name: string, mode: 'little' | 'coder') => {
    const total = ISLANDS[mode].length;
    const found = (await evaluate(`(() => {
      const cards = [...document.querySelectorAll('button.isle-card')];
      const numbered = cards.filter((c) => /Stage \\d+/.test(c.textContent ?? '')).length;
      return {
        cards: cards.length,
        numbered,
        pips: document.querySelectorAll('[data-testid=stage-pips] [data-pip]').length,
        worlds: document.querySelectorAll('[role=dialog] .map-list h3').length,
        gold: document.querySelectorAll('button.isle-card[data-gold=true]').length,
        chip: [...document.querySelectorAll('[role=dialog] .sr-only')].map((e) => e.textContent ?? '').find((t) => /stages sailed/.test(t)) ?? '',
      };
    })()`)) as { cards: number; numbered: number; pips: number; worlds: number; gold: number; chip: string } | undefined;
    if (!found) return;
    const worlds = mode === 'coder' ? CODER_WORLDS.length : 0;
    const problems: string[] = [];
    if (found.cards !== total) problems.push(`${found.cards} cards, expected ${total}`);
    if (found.numbered !== total) problems.push(`${found.numbered} cards with a stage number, expected ${total}`);
    if (found.pips !== total) problems.push(`${found.pips} pips, expected ${total}`);
    if (found.worlds !== worlds) problems.push(`${found.worlds} world titles, expected ${worlds}`);
    if (found.gold !== 1) problems.push(`${found.gold} gold cards, expected 1`);
    if (!new RegExp(`of ${total} stages sailed`).test(found.chip)) problems.push(`header chip text "${found.chip}"`);
    if (problems.length) failures.push(`${name}: ${problems.join('; ')}`);
  };

  /** On a phone the toast sits under the sticky header and never covers a control in the lower half of the screen. */
  const checkToast = async (name: string) => {
    const r = (await evaluate(`(() => {
      const t = document.querySelector('.toast');
      if (!t) return { missing: true, belowHeader: false, covered: [] };
      const tr = t.getBoundingClientRect();
      const header = document.querySelector('header');
      const hb = header ? header.getBoundingClientRect().bottom : 0;
      const covered = [...document.querySelectorAll('button, [role=radio]')].filter((b) => {
        if (t.contains(b)) return false;
        const br = b.getBoundingClientRect();
        if (br.width === 0 || br.height === 0 || br.top + br.height / 2 < innerHeight / 2) return false;
        return br.left < tr.right && br.right > tr.left && br.top < tr.bottom && br.bottom > tr.top;
      }).map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 30));
      return { missing: false, belowHeader: tr.top >= hb - 1, bottom: Math.round(tr.bottom), covered };
    })()`)) as { missing: boolean; belowHeader: boolean; covered: string[] } | undefined;
    if (!r) return;
    if (r.missing) failures.push(`${name}: no toast on screen to check`);
    else if (!r.belowHeader) failures.push(`${name}: the toast is not under the sticky header`);
    else if (r.covered.length) failures.push(`${name}: the toast covers ${r.covered.join(', ')}`);
  };

  const scrollSheet = (top: number) => evaluate(`(() => { const s = document.querySelector('[role=dialog] .overflow-y-auto'); if (s) s.scrollTop = ${top === -1 ? 's.scrollHeight' : top}; return !!s; })()`);

  const closeFriends = async () => {
    for (let k = 0; k < 6 && (await evaluate(`!!document.querySelector('[aria-labelledby="friend-title"]')`)); k++) {
      await pressKey('Escape', 'Escape', 27);
      await sleep(300);
    }
  };

  /** Wait until the opening animation of the open dialog has finished, so the picture is not half faded. */
  const settle = () => waitFor(`(() => { const p = document.querySelector('[role=dialog] > div:nth-child(2)'); return !p || getComputedStyle(p).opacity === '1'; })()`, 4000);

  const openMap = async () => {
    await click('button', 'Quest map');
    await waitFor(`!!document.querySelector('#map-title')`);
    await settle();
    await sleep(500);
  };

  /** Build the answer for the quest on screen: type it, or tap the blocks, then press Run. */
  const solve = async (mode: 'little' | 'coder') => {
    const title = (await evaluate(`document.querySelector('#quest-title')?.textContent ?? ''`)) as string;
    if (mode === 'coder') {
      const code = CODER_ANSWERS[title];
      if (!code) throw new Error(`No answer written for "${title}"`);
      await evaluate(`document.querySelector('.cm-content')?.focus()`);
      await send('Input.insertText', { text: code });
      await sleep(250);
    } else {
      const pieces = LITTLE_ANSWERS[title];
      if (!pieces) throw new Error(`No blocks written for "${title}"`);
      for (const [label, n] of pieces) {
        await evaluate(`(() => { const t = [...document.querySelectorAll('.palette-tile')].find((b) => (b.textContent ?? '').includes(${JSON.stringify(label)})); t?.click(); })()`);
        await sleep(120);
        const [more, from] = label === 'Forward' || label === 'Circle' ? [10, 50] : [0, 0];
        if (more) {
          const times = Math.round((n - from) / more);
          for (let k = 0; k < Math.abs(times); k++) {
            await evaluate(`(() => { const all = [...document.querySelectorAll('.block-step[aria-label="${times > 0 ? 'More' : 'Less'} ${label}"]')]; all[all.length - 1]?.click(); })()`);
            await sleep(40);
          }
        }
      }
    }
    await click('[role=radio]', 'Fast');
    await click('button', 'Run');
    const done = await waitFor(`[...document.querySelectorAll('button')].some((b) => /Next (review )?quest|Finish review/.test(b.textContent ?? ''))`, 20000);
    if (!done) throw new Error(`"${title}" was not accepted`);
  };

  /** Close friend dialogs, then wait for the celebration to arrive and settle. */
  const waitMoment = async () => {
    await sleep(900);
    for (let k = 0; k < 8 && !(await evaluate(`!!document.querySelector('[aria-labelledby="moment-title"]')`)); k++) {
      await closeFriends();
      await sleep(400);
    }
    const ok = await waitFor(`!!document.querySelector('[aria-labelledby="moment-title"]')`, 4000);
    if (!ok) throw new Error('No celebration appeared');
    await settle();
    await sleep(1200);
  };

  await send('Page.enable');
  await send('Network.enable');

  const sizes = [
    { name: 'phone', width: 390, height: 844, mobile: true },
    { name: 'tablet', width: 820, height: 1180, mobile: true },
    { name: 'desktop', width: 1440, height: 1000, mobile: false },
  ];

  for (const mode of ['little', 'coder'] as const) {
    for (const v of sizes) {
      await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
      narrow = v.width <= 420;
      const n = (s: string) => `${mode}-${v.name}-${s}`;
      const query = `?mode=${mode}`;
      const put = (s: Seed) => ({ 'gio.mode': mode, 'gio.progress': s.progress, 'gio.path': s.path });

      // (a) A new child.
      await seed({ 'gio.mode': mode }, query);
      await openMap();
      await shot(n('1-map-new'));
      await checkMap(n('1-map-new'), mode);
      await scrollSheet(-1);
      await sleep(300);
      await shot(n('1-map-new-end'));

      // (b) Half way through: a sailed island, Gio on the next one, a locked island and a waiting review.
      await seed(put(midJourney(mode)), query);
      await openMap();
      await shot(n('2-map-mid'));
      await scrollSheet(0);
      await sleep(300);
      await shot(n('2-map-mid-top'));
      await scrollSheet(-1);
      await sleep(300);
      await shot(n('2-map-mid-end'));

      // (c) An island sheet with gold, silver, bonus, open and locked tiles, then a locked island.
      await scrollSheet(0);
      const target = mode === 'little' ? 'Loop Lagoon' : 'Loop Lagoon';
      await click('button.isle-card', target);
      await sleep(700);
      await shot(n('3-island'));
      await scrollSheet(560);
      await sleep(300);
      await shot(n('3-island-units'));
      await click('button', 'Back to the map');
      await sleep(500);
      await click('button.isle-card', mode === 'little' ? 'Colour Cove' : 'Bug Burrow');
      await sleep(700);
      await shot(n('3-island-locked'));

      // (d) A quest inside a unit, started with Go!, then a hint.
      await click('button', 'Back to the map');
      await sleep(400);
      await click('button', 'Go!');
      await sleep(900);
      await shot(n('4-quest'));
      const eyebrow = (await evaluate(`document.querySelector('section[aria-labelledby=quest-title] .eyebrow')?.textContent ?? ''`)) as string;
      if (!new RegExp(`^Stage \\d+ of ${ISLANDS[mode].length} · `).test(eyebrow)) failures.push(`${n('4-quest')}: quest eyebrow is "${eyebrow}"`);
      await click('button', 'Hint');
      await sleep(600);
      await shot(n('4-quest-hint'));

      // (e) A unit mastered, by really solving the quest that completes it.
      await seed(put(almostUnit(mode)), query);
      await openMap();
      await click('button.isle-card', 'Shape Shore');
      await sleep(500);
      await click('button', mode === 'little' ? 'Quest 2: Turn the corner' : 'Quest 2: The letter L');
      await sleep(700);
      await solve(mode);
      await sleep(400);
      if (v.width <= 640) await checkToast(n('5-toast'));
      await shot(n('5-quest-done'));
      await waitMoment();
      await shot(n('5-unit-mastered'));

      // (f) An island sailed.
      await seed(put(almostIsland(mode)), query);
      await openMap();
      await click('button.isle-card', 'Shape Shore');
      await sleep(500);
      await click('button', mode === 'little' ? 'Quest 1: Make a box' : 'Quest 2: Three sides');
      await sleep(700);
      await solve(mode);
      await waitMoment();
      await shot(n('6-island-sailed'));
      await click('button', 'See the map');
      await sleep(900);
      await shot(n('6-map-after-sailing'));

      // (g) A review in play: two quests, then the finish.
      await seed(put(reviewWaiting(mode)), query);
      await openMap();
      await shot(n('7-map-review'));
      await click('button', 'Visit');
      await sleep(900);
      await shot(n('7-review-1'));
      await solve(mode);
      await sleep(500);
      await shot(n('7-review-1-done'));
      await click('button', 'Next review quest');
      await sleep(900);
      await solve(mode);
      await click('button', 'Finish review');
      await waitMoment();
      await shot(n('7-review-done'));

      // (h) A stage tested out: sailed, tested, open and locked stages side by side.
      await seed(put(testedOut(mode)), query);
      await openMap();
      await checkMap(n('8-map-tested'), mode);
      const tested = await evaluate(`document.querySelectorAll('button.isle-card[aria-label*="tested out"]').length`);
      if (tested !== 1) failures.push(`${n('8-map-tested')}: ${String(tested)} tested-out cards, expected 1`);
      await shot(n('8-map-tested'));
      await click('button.isle-card', ISLANDS[mode][1]!.name);
      await sleep(700);
      await shot(n('8-island-tested'));

      // (i) Every stage sailed: the full pip rail and the gold last stage.
      await seed(put(allSailed(mode)), query);
      await openMap();
      await checkMap(n('9-map-all-sailed'), mode);
      await shot(n('9-map-all-sailed'));
      await scrollSheet(-1);
      await sleep(400);
      await shot(n('9-map-all-sailed-end'));
      await click('button.isle-card', ISLANDS[mode][ISLANDS[mode].length - 1]!.name);
      await sleep(700);
      await shot(n('9-island-last'));
    }
  }
  ws.close();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (failures.length) {
      for (const f of failures) console.error(`FAIL ${f}`);
      process.exitCode = 1;
    }
    browser.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* the browser may still hold its profile for a moment; the OS cleans temp files */
      }
    }, 1500);
  });
