/**
 * The screens check:devices visits. Each one seeds localStorage like a returning child and then
 * opens the screen through the real UI. No screen calls the AI. A screen with open === null is an
 * empty slot that a later feature fills in: the runner reports it and moves on.
 */
import { ISLANDS } from '../../src/ui/path/islands';
import type { Cdp } from './cdp';
import { sleep } from './cdp';

export interface Screen {
  id: string;
  label: string;
  /** null = not built yet; the feature that adds it registers it here. */
  open: ((c: Cdp) => Promise<void>) | null;
  /** Where to look for the page to be ready; defaults to the studio title. */
  ready?: string;
}

const CODER_PROGRESS = ['c-line', 'c-square', 'c-bug-square', 'c-function', 'c-dashes', 'c-game'];
const LITTLE_PROGRESS = ['l-walk', 'l-corner', 'l-square'];

function day(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface PathSeed {
  v: 1;
  quests: Record<string, { s: 'clean' | 'helped'; d: string }>;
  sailed: Record<string, string>;
  kept: string[];
  reviews: Record<string, never>;
  reviewedOn: null;
  tested: Record<string, string>;
  master: { little?: string; coder?: string };
}

function pathWith(quests: [string, 'clean' | 'helped', number][] = [], extra: Partial<PathSeed> = {}): { progress: string[]; path: PathSeed } {
  const q: PathSeed['quests'] = {};
  for (const [id, s, ago] of quests) q[id] = { s, d: day(-ago) };
  return { progress: quests.map(([id]) => id), path: { v: 1, quests: q, sailed: {}, kept: [], reviews: {}, reviewedOn: null, tested: {}, master: {}, ...extra } };
}

const draft = (code: string) => ({ title: 'My drawing', code });
const run = (c: Cdp) => c.click('button', 'Run');
const coder = { 'gio.mode': 'coder' };
const little = { 'gio.mode': 'little' };

/** Open the adventure map from the studio header. */
async function openMap(c: Cdp): Promise<void> {
  await c.click('button', 'Adventure map');
  await c.waitFor(`!!document.querySelector('#map-title')`);
  await sleep(500);
}

async function runAndWait(c: Cdp, selector: string): Promise<void> {
  await run(c);
  await c.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 8000);
  await sleep(500);
}

export const SCREENS: Screen[] = [
  { id: 'mode-picker', label: 'Mode picker', ready: 'h1', open: (c) => c.seed({}, '', 'h1') },
  { id: 'little-empty', label: 'Little studio, empty (first-win offer)', open: (c) => c.seed(little, '?mode=little') },
  {
    id: 'little-blocks',
    label: 'Little studio, six blocks with a nested Repeat',
    open: (c) => c.seed({ ...little, 'gio.progress': LITTLE_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 50 RT 90]\nFD 30\nRT 45\nFD 20') }, '?mode=little'),
  },
  {
    id: 'coder-logo',
    label: 'Coder studio, Logo tab with code',
    open: (c) => c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]\nPU\nFD 40\nPD') }, '?mode=coder'),
  },
  {
    id: 'coder-python',
    label: 'Coder studio, Python tab',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await c.click('[role=tab]', 'Python');
      await sleep(400);
    },
  },
  {
    id: 'coder-javascript',
    label: 'Coder studio, JavaScript tab',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await c.click('[role=tab]', 'JavaScript');
      await sleep(400);
    },
  },
  {
    id: 'coder-error',
    label: 'Coder studio with an error bubble',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('FD 100 FOO') }, '?mode=coder');
      await runAndWait(c, '.bubble-problem');
    },
  },
  {
    id: 'quest-active',
    label: 'Quest active with a target drawing',
    open: async (c) => {
      await c.seed({ ...coder }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(400);
      await c.click('button', 'Quest ');
      await sleep(900);
    },
  },
  {
    id: 'skill-check',
    label: 'Skill-check banner',
    open: async (c) => {
      await c.seed({ ...coder }, '?mode=coder');
      await openMap(c);
      await c.click('button', 'Skip ahead');
      await sleep(400);
      await c.click('button', 'Start the skill check');
      await sleep(900);
    },
  },
  {
    id: 'game',
    label: 'A running game with the game pad',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('WHEN "up [FD 20]\nWHEN "right [RT 90]\nWHEN "space [FD 5]') }, '?mode=coder');
      await runAndWait(c, '[aria-label="Game controls"]');
    },
  },
  {
    id: 'save-menu',
    label: 'Save menu open',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await c.click('button[aria-haspopup=dialog]', 'Save');
      await sleep(600);
    },
  },
  {
    id: 'friend-dialog',
    label: 'Friend dialog',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': ['c-line', 'c-square', 'c-rectangle', 'c-triangle'] }, '?mode=coder');
      await openMap(c);
      await c.click('button', 'Loop Lagoon');
      await sleep(400);
      await c.click('button', 'Loop it');
      await sleep(400);
      await c.type('REPEAT 4 [FD 100 RT 90]');
      await run(c);
      if (!(await c.waitFor(`!!document.querySelector('[aria-labelledby="friend-title"]')`, 12000))) throw new Error('the friend dialog did not open');
      await sleep(700);
    },
  },
  {
    id: 'garden-sheet',
    label: "Gio's garden sheet",
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS }, '?mode=coder');
      await c.click('button', "Gio's garden");
      await c.waitFor(`!!document.querySelector('#garden-title')`);
      await sleep(700);
    },
  },
  {
    id: 'map-list',
    label: 'Adventure map list',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 5], ['c-ell', 'clean', 4]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
    },
  },
  {
    id: 'island-sheet',
    label: 'Island sheet with its unit list',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 5], ['c-ell', 'clean', 4]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(700);
    },
  },
  {
    id: 'mastery-moment',
    label: 'Mastery moment',
    open: async (c) => {
      const s = pathWith([['c-line', 'clean', 2]]);
      await c.seed({ ...coder, 'gio.progress': s.progress, 'gio.path': s.path }, '?mode=coder');
      await openMap(c);
      await c.click('button.isle-card', 'Shape Shore');
      await sleep(400);
      await c.click('button', 'Quest 2: The letter L');
      await sleep(700);
      await c.type('FD 100 RT 90 FD 60');
      await c.click('[role=radio]', 'Fast');
      await run(c);
      if (!(await c.waitFor(`!!document.querySelector('[aria-labelledby="moment-title"]')`, 20000))) throw new Error('the mastery moment did not open');
      await sleep(900);
    },
  },
  {
    id: 'certificate',
    label: 'Certificate with a name',
    ready: '#cert-name',
    open: async (c) => {
      const s = pathWith([]);
      for (const island of ISLANDS.coder) s.path.sailed[island.key] = day(-30);
      s.path.master = { coder: day(-1) };
      await c.seed({ ...coder, 'gio.path': s.path, 'gio.certificate': { v: 1, name: 'Ada Lovelace' } }, 'certificate', '#cert-name');
    },
  },
  { id: 'privacy', label: 'Privacy', ready: 'h1', open: (c) => c.seed({ ...coder }, 'privacy', 'h1') },
  { id: 'not-found', label: 'Not found', ready: 'h1', open: (c) => c.seed({ ...coder }, 'nothing-here', 'h1') },
  {
    id: 'replay-dialog',
    label: 'Replay (movie) dialog',
    open: async (c) => {
      await c.seed({ ...coder, 'gio.progress': CODER_PROGRESS, 'gio.draft': draft('REPEAT 4 [FD 100 RT 90]') }, '?mode=coder');
      await runAndWait(c, '.bubble-success');
      await c.click('button[aria-haspopup=dialog]', 'Save');
      await sleep(500);
      await c.click('[role=dialog] button', 'Movie');
      if (!(await c.waitFor(`!!document.querySelector('#replay-title')`, 10000))) throw new Error('the replay dialog did not open');
      await sleep(900);
    },
  },
  // Empty slots, filled in by the feature that builds them.
  { id: 'watch-mode', label: 'Full-screen watch mode (FEAT-002)', open: null },
  { id: 'keyboard-editor', label: 'Keyboard-open editor (FEAT-003)', open: null },
];
