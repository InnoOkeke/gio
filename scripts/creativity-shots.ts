/**
 * Live check of GIO's Phase 4 creativity features in a real browser (Microsoft Edge or Chrome, headless) at desktop
 * and phone width: music (PLAY, lit keys, sound toggle), the flipbook (FRAME, picture chip, GIF), real Python in its
 * locked box (consent, run, plain errors, the 10 second stop, sandbox, CSP, no request leaving the app), the Music
 * and Movie blocks for Little Turtles, and the privacy page. Starts nothing itself: run the production server first
 * (npm run build, then node dist/api/server.js), then:
 *   GIO_URL=http://localhost:3055 npm run check:creativity
 * Pictures go to a gio-creativity folder inside the system temp folder. Every assertion is printed; exit code 1 on any failure.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readGif } from '../tests/helpers/gif.js';
import { addFailure, expect, failureCount, launchBrowser, sleep, type BrowserSession } from './lib/browser.js';

const base = process.env['GIO_URL'] ?? 'http://localhost:3001';
const outDir = path.join(os.tmpdir(), 'gio-creativity');

const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const LITTLE_PROGRESS = ['l-walk', 'l-corner', 'l-square'];
const origin = new URL(base).origin;
/** Kid Python that tries every way to reach the internet. The program only reaches its end if each attempt failed. */
const PY_NETWORK_TRIES = [
  'import turtle, js',
  'def tries(name, attempt):',
  '    try:',
  '        attempt()',
  '    except BaseException:',
  '        return',
  "    raise Exception('OPEN ' + name)",
  "tries('fetch', lambda: js.fetch('https://example.com/'))",
  "tries('prototype', lambda: js.WorkerGlobalScope.prototype.fetch.call(js.self, 'https://example.com/'))",
  "tries('xhr', lambda: js.XMLHttpRequest.new())",
  "tries('websocket', lambda: js.WebSocket.new('wss://example.com/'))",
  'turtle.forward(10)',
  '',
].join('\n');

let session: BrowserSession | null = null;

async function main() {
  session = await launchBrowser(base, outDir);
  const { send, evaluate, waitFor, click, seed, type, stored, shot, escape, closeDialogs, fits, downloads, on } = session;

  const outside: string[] = [];
  on('Network.requestWillBeSent', (p) => {
    const url = String((p['request'] as { url?: string } | undefined)?.url ?? '');
    if (/^https?:/i.test(url) && !url.startsWith(origin)) outside.push(url);
  });

  /** Records which piano keys light up, in order, from now on. */
  const watchKeys = () =>
    evaluate(`(() => {
      window.__lit = [];
      const look = () => { const keys = [...document.querySelectorAll('.note-key')]; const i = keys.findIndex((k) => k.classList.contains('is-lit')); if (i >= 0 && window.__lit[window.__lit.length - 1] !== i) window.__lit.push(i); };
      window.__litObserver?.disconnect();
      window.__litObserver = new MutationObserver(look);
      window.__litObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    })()`);
  const lit = async () => ((await evaluate('window.__lit ?? []')) as number[]) ?? [];
  const idle = (ms = 20000) => waitFor(`[...document.querySelectorAll('button.btn-lg')].some((b) => b.textContent.trim() === 'Run')`, ms);
  const bubble = async () => ((await evaluate(`document.querySelector('.bubble')?.textContent ?? ''`)) as string) ?? '';

  /** Replaces the text of the Python editor (the last editor in the Python panel). */
  const typePython = async (code: string) => {
    await evaluate(`(() => { const all = document.querySelectorAll('#panel-python .cm-content'); all[all.length - 1]?.focus(); })()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.insertText', { text: code });
    await sleep(300);
  };
  const stageHasInk = async () =>
    (await evaluate(`(() => { for (const c of document.querySelectorAll('.stage canvas')) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 4; i < d.length; i += 4) { if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== d[3]) return true; } } return false; })()`)) === true;

  await send('Page.enable');
  const sizes = [
    { name: 'desktop', width: 1440, height: 1000, mobile: false },
    { name: 'phone', width: 390, height: 844, mobile: true },
  ];

  for (const v of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });

    /* ---------------------------------------------------------------- Turtle Coders */
    {
      const n = (s: string) => `${v.name}-coder-${s}`;
      console.log(`\n=== ${v.name} ${v.width}x${v.height}, coder ===`);

      console.log('music');
      await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
      await closeDialogs();
      await type('SETTEMPO 240\nPLAY [C D E]', true);
      await watchKeys();
      await click('button.btn-lg', 'Run');
      const three = await waitFor(`(window.__lit ?? []).length >= 3`, 15000);
      const keys = await lit();
      expect(three, `three piano keys lit in turn (${keys.join(', ')})`);
      expect(await idle(), 'Run returns to idle after the tune');
      await shot(n('music'));

      const toggle = '[aria-label^="Sound"]';
      const before = await evaluate(`document.querySelector('${toggle}')?.getAttribute('aria-pressed')`);
      await click(toggle);
      const after = await evaluate(`document.querySelector('${toggle}')?.getAttribute('aria-pressed')`);
      expect(before !== null && before !== after, `the sound toggle flips aria-pressed (${before} to ${after})`);
      await watchKeys();
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`(window.__lit ?? []).length >= 3`, 15000), 'keys still light with the sound off');
      await idle();

      console.log('flipbook');
      await seed({ 'gio.mode': 'coder', 'gio.progress': CODER_PROGRESS }, '?mode=coder');
      await closeDialogs();
      await type('REPEAT 5 [CLEAN FD 10 * REPCOUNT FRAME RT 20]', true);
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`(document.querySelector('.picture-chip')?.textContent ?? '').includes('Picture 5')`, 30000), "the picture chip reaches 'Picture 5'");
      await idle();
      await shot(n('flipbook'));
      const wait = await downloads(n('movie'));
      await click('button[aria-haspopup="dialog"]', 'Picture');
      await sleep(400);
      await click('.save-row', 'Movie');
      expect(await waitFor(`(document.getElementById('replay-title')?.textContent ?? '').includes('ready')`, 90000), 'the movie dialog finishes encoding');
      await click('[aria-labelledby="replay-title"] button', 'Save movie');
      const gifFile = await wait('gif');
      expect(gifFile !== null, `movie downloaded: ${gifFile}`);
      if (gifFile) {
        const gif = readGif(new Uint8Array(fs.readFileSync(gifFile)));
        expect(gif.frames === 5, `the GIF has one frame for each FRAME (${gif.frames})`);
      }
      await escape();

      console.log('python');
      // Only the first quest is done, so the open drawing is the square a kid Python run below would pass.
      await seed({ 'gio.mode': 'coder', 'gio.progress': ['c-line'] }, '?mode=coder');
      await closeDialogs();
      await type('REPEAT 4 [FD 100 RT 90]', true);
      await click('[role=tab]', 'Python');
      await sleep(500);
      const consent = await waitFor(`(document.querySelector('#panel-python')?.textContent ?? '').includes('Get Python ready')`, 5000);
      expect(consent, 'the Python consent card is shown first');
      // The generated Python lines scroll sideways inside their own box, so only the card above them is measured.
      await fits('python consent card', '#panel-python .bg-paper-2');
      await shot(n('python-consent'));
      await click('#panel-python button', 'Get Python ready');
      const ready = await waitFor(`localStorage.getItem('gio.pythonReady') !== null && [...document.querySelectorAll('#panel-python button')].some((b) => b.textContent.includes('Run this Python') && !b.disabled) && !(document.querySelector('#panel-python')?.textContent ?? '').includes('Getting Python ready')`, 120000);
      expect(ready, 'Python is ready and the Run button works');
      await click('#panel-python button', 'Make it mine');
      expect(await waitFor(`!!document.querySelector('#panel-python .cm-content')`, 15000), 'Make it mine opens the Python editor');
      await sleep(500);
      await fits('python editor', '#panel-python');

      const GUARDED = ['gio.progress', 'gio.rewards', 'gio.firstWin'];
      const snapshot = async () => JSON.stringify(await Promise.all(GUARDED.map((k) => stored(k))));
      const rewardsBefore = await snapshot();
      await typePython('import turtle\nfor i in range(4):\n    turtle.forward(100)\n    turtle.right(90)\n');
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`!!document.querySelector('.bubble-success')`, 30000), 'a Python turtle program runs to the end');
      expect(await stageHasInk(), 'the stage has non-blank pixels after the Python run');
      expect((await snapshot()) === rewardsBefore, 'a Python run that draws the open square awards nothing and completes no quest');
      await shot(n('python-run'));

      await typePython('import turtle\nturtle.forward(50)\nturtle.forward(oops)\n');
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`!!document.querySelector('.bubble-problem')`, 30000), 'a NameError gives a plain message');
      const msg = await bubble();
      expect(/line 3/.test(msg) && /oops/.test(msg), `the message names the line and the word (${msg.slice(0, 90)})`);
      expect(await waitFor(`!!document.querySelector('#panel-python .cm-problem-line')`, 5000), 'the bad line is marked in the editor');
      await shot(n('python-error'));
      await idle(30000);

      console.log('python has no network');
      await typePython(PY_NETWORK_TRIES);
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`!!document.querySelector('.bubble-success')`, 30000), 'fetch, the prototype route, XMLHttpRequest and WebSocket all fail inside kid Python');
      await idle(30000);
      await typePython('while True:\n    pass\n');
      const started = Date.now();
      await click('button.btn-lg', 'Run');
      const stopped = await waitFor(`(document.querySelector('.bubble')?.textContent ?? '').includes('ran for 10 seconds')`, 25000);
      const took = (Date.now() - started) / 1000;
      expect(stopped && took >= 8 && took <= 20, `an endless loop is stopped in about 10 seconds with a plain message (${took.toFixed(1)} s)`);
      await idle(30000);

      const sandbox = await evaluate(`document.querySelector('iframe[src*="/py/runner.html"]')?.getAttribute('sandbox')`);
      expect(sandbox === 'allow-scripts', `the Python frame has sandbox exactly 'allow-scripts' (${sandbox})`);
      const csp = (await fetch(`${base}/py/runner.html`)).headers.get('content-security-policy');
      expect(
        !!csp && csp.includes("default-src 'none'") && csp.includes("script-src 'self' blob: 'wasm-unsafe-eval'") && csp.includes('worker-src blob:') && csp.includes("connect-src 'self'") && csp.includes("frame-ancestors 'self'"),
        `runner.html carries the plan's Content-Security-Policy (${csp})`,
      );
      console.log('python in a quest');
      await click('button', 'Adventure map');
      await waitFor(`!!document.querySelector('#map-title')`, 10000);
      await sleep(700);
      await click('button', 'Go!');
      await sleep(900);
      await click('[role=tab]', 'Python');
      await sleep(500);
      const lockedText = (await evaluate(`document.querySelector('#panel-python')?.textContent ?? ''`)) as string;
      expect(lockedText.includes('Python runs are for your own drawings'), 'an open quest shows the read-only Python with its note');
      expect(!(await evaluate(`!!document.querySelector('#panel-python .cm-content[contenteditable=true]')`)), 'an open quest has no editable Python, even after Make it mine');
      expect(!lockedText.includes('Start again from my Logo') && !lockedText.includes('Run my Python') && !lockedText.includes('Make it mine'), 'an open quest has no start-again, run or make-it-mine button');
      await escape();
    }

    /* ---------------------------------------------------------------- Little Turtles */
    {
      const n = (s: string) => `${v.name}-little-${s}`;
      console.log(`\n=== ${v.name} ${v.width}x${v.height}, little ===`);
      await seed({ 'gio.mode': 'little', 'gio.progress': LITTLE_PROGRESS }, '?mode=little');
      await closeDialogs();
      await click('[role=tab]', 'Music');
      await sleep(300);
      await fits('blocks palette', 'body');
      await shot(n('palette-music'));
      await click('button.palette-tile', 'Note');
      expect(await waitFor(`!!document.querySelector('.note-picker')`, 5000), 'a Note block opens its note picker');
      await fits('note picker', '.note-picker');
      await click('.note-pick', 'Note E');
      expect(await waitFor(`!!document.querySelector('[role=button][aria-label^="Note E"]')`, 5000), "picking E changes the block to 'Note E'");
      await shot(n('note-picker'));
      await watchKeys();
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`(window.__lit ?? []).length >= 1`, 15000), `Run lights a key (${(await lit()).join(', ')})`);
      await idle();

      await click('[role=tab]', 'Movie');
      await sleep(300);
      await click('button.palette-tile', 'Next picture');
      await click('button.btn-lg', 'Run');
      expect(await waitFor(`(document.querySelector('.picture-chip')?.textContent ?? '').includes('Picture')`, 20000), 'the Next picture block shows the picture chip');
      await idle();
      await shot(n('movie'));
    }
  }

  /* ---------------------------------------------------------------- privacy, network */
  console.log('\n=== privacy and network ===');
  await send('Page.navigate', { url: `${base}/privacy` });
  await waitFor(`document.body.innerText.length > 200`, 15000);
  const text = ((await evaluate('document.body.innerText')) as string).toLowerCase();
  expect(text.includes('python'), '/privacy mentions Python');
  expect(text.includes('sound'), '/privacy mentions sound');
  expect(outside.length === 0, `no request left the app origin${outside.length ? `: ${[...new Set(outside)].slice(0, 3).join(', ')}` : ''}`);
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
