/**
 * The layout assertions of check:devices. The page is asked once for plain facts (COLLECT_FACTS),
 * and each assertion below is a pure function from those facts to a list of failure messages.
 */
import type { Insets } from './lib/devices';
import { TOUCH_ALLOWLIST } from './lib/devices';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export interface Target extends Box {
  name: string;
  /** Its scroller can still scroll down, so it can be brought out from under the home bar. */
  scrollsMore?: boolean;
}
export interface TextFact {
  text: string;
  size: number;
  eyebrow: boolean;
}
export interface Facts {
  /** The on-screen keyboard is up: the stage is collapsed on purpose. */
  keyboardOpen?: boolean;
  w: number;
  h: number;
  scrollWidth: number;
  layout: string;
  widthClass: string;
  /** Elements whose right edge passes the viewport and that no scroller or clip contains. */
  overflowing: (Target & { right: number })[];
  /** Interactive elements on the top layer (behind an open modal they are skipped). */
  targets: Target[];
  texts: TextFact[];
  stage: (Box & { paneInner: number; paneInnerHeight: number; controlsHeight: number; headerBottom: number }) | null;
  runButton: Box | null;
  dialog: { panel: Box; close: Box | null; closeName: string } | null;
  cls: number;
}

export interface Context {
  touch: boolean;
  insets: Insets;
}

/** Runs inside the page and returns Facts. */
export const COLLECT_FACTS = `(() => {
  const w = innerWidth, h = innerHeight;
  const rectOf = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
  const visible = (e) => {
    if (e.closest('.sr-only, [hidden], .moment-confetti, [inert]')) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    return true;
  };
  const nameOf = (e) => ((e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || e.id || e.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  const label = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + nameOf(e) + '"';
  const modal = [...document.querySelectorAll('[role=dialog][aria-modal=true]')].filter(visible).pop() || null;

  // Content a scroller or clip holds is not page overflow.
  const contained = (e) => {
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
      if (n.hasAttribute('data-hscroll')) return true;
      const s = getComputedStyle(n);
      if (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX) && n.getBoundingClientRect().right <= w + 1) return true;
    }
    return false;
  };
  const overflowing = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    if (!visible(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right > w + 1 && !contained(e)) overflowing.push({ ...rectOf(e), name: label(e) });
    if (overflowing.length >= 12) break;
  }
  // A pane that scrolls sideways inside itself is still a sideways scroll for a child. Code (CodeMirror and the Python and JavaScript listings) and marked scrollers are allowed: long lines scroll inside the code box.
  for (const e of document.querySelectorAll('body *')) {
    if (overflowing.length >= 12) break;
    if (e.closest('svg') || e.closest('.cm-editor') || e.closest('pre, code, [aria-label$=" code"], [aria-label^="Code "], [aria-label^="Código "]') || e.closest('[data-hscroll]') || !visible(e)) continue;
    const cs = getComputedStyle(e);
    if (!['auto', 'scroll'].includes(cs.overflowX) || e.scrollWidth <= e.clientWidth + 1) continue;
    const r = e.getBoundingClientRect();
    overflowing.push({ ...rectOf(e), right: r.left + e.scrollWidth, name: label(e) + ' (scrolls sideways inside itself)' });
  }

  const floaters = [];
  if (!modal) {
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg')) continue;
      const p = getComputedStyle(el).position;
      if (p !== 'fixed' && p !== 'sticky' && !(p === 'absolute' && el.classList.contains('ask-fold-body'))) continue;
      const fr = el.getBoundingClientRect();
      if (fr.width > 1 && fr.height > 1 && visible(el)) floaters.push({ el, r: fr });
    }
  }
  const SELECTOR = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem]';
  const scope = modal || document;
  const targets = [...scope.querySelectorAll(SELECTOR)]
    .filter((e) => visible(e) && !e.disabled && !(modal && !modal.contains(e)))
    .map((e) => {
      // A key scrolled out of its swipe row cannot be tapped: only the visible part counts.
      const r = rectOf(e);
      let clipped = false;
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (!['hidden', 'clip', 'auto', 'scroll'].some((v) => cs.overflowX === v || cs.overflowY === v)) continue;
        const s = n.getBoundingClientRect();
        const before = r.right - r.left + (r.bottom - r.top);
        r.left = Math.max(r.left, s.left); r.right = Math.min(r.right, s.right);
        r.top = Math.max(r.top, s.top); r.bottom = Math.min(r.bottom, s.bottom);
        if (r.right - r.left + (r.bottom - r.top) < before - 1) clipped = true;
      }
      // A target next to or under a fixed or sticky bar (the action dock, the header) that its page can scroll clear of is below or above the fold, not overlapped.
      if (!clipped && !modal && r.bottom > 0 && r.top < h && r.right > 0 && r.left < w) {
        const near = floaters.find((f) => f.el !== e && !f.el.contains(e) && !e.contains(f.el) && r.left < f.r.right + 8 && r.right > f.r.left - 8 && r.top < f.r.bottom + 8 && r.bottom > f.r.top - 8);
        if (near) {
          let scrollsClear = false;
          for (let n = e.parentElement; n; n = n.parentElement) {
            const s = n === document.body || n === document.documentElement ? document.scrollingElement : n;
            if (s && s.scrollHeight > s.clientHeight + 1) { scrollsClear = true; break; }
          }
          if (scrollsClear) clipped = true;
        }
      }
      let scrollsMore = false;
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (!['auto', 'scroll'].includes(cs.overflowY)) continue;
        if (n.scrollTop + n.clientHeight < n.scrollHeight - 1) scrollsMore = true;
        break;
      }
      return { ...r, name: label(e), clipped, scrollsMore };
    })
    .filter((t) => !t.clipped && t.right - t.left > 1 && t.bottom - t.top > 1);

  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const v = (t.nodeValue || '').trim();
    const p = t.parentElement;
    if (!v || !p || p.closest('svg, script, style, noscript, .cm-gutters') || !visible(p)) continue;
    texts.push({ text: v.slice(0, 40), size: parseFloat(getComputedStyle(p).fontSize), eyebrow: !!p.closest('.eyebrow') });
    if (texts.length > 600) break;
  }

  let stage = null;
  const st = document.querySelector('.stage');
  if (st && visible(st)) {
    const pane = st.closest('.studio-stage-pane') || st.closest('section, .panel') || st.parentElement;
    const cs = getComputedStyle(pane);
    const run = [...document.querySelectorAll('button')].find((b) => b.hasAttribute('data-run') || /^(Run|Pause|Keep going)$/.test((b.textContent || '').trim()));
    const hdr = document.querySelector('header');
    stage = { ...rectOf(st), paneInner: pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      paneInnerHeight: pane.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      controlsHeight: run && run.parentElement ? run.parentElement.getBoundingClientRect().height + 16 : 0,
      headerBottom: hdr ? hdr.getBoundingClientRect().bottom : 0 };
  }
  const runEl = [...document.querySelectorAll('button')].find((b) => b.hasAttribute('data-run') || /^(Run|Pause|Keep going)$/.test((b.textContent || '').trim()));

  let dialog = null;
  if (modal) {
    const full = (e) => { const r = e.getBoundingClientRect(); return r.width >= w - 2 && r.height >= h - 2; };
    // Sheet.tsx marks its panel; a full-screen page panel on a phone is a valid bottom-anchored sheet.
    let panel = modal.querySelector('.sheet-panel') || modal;
    if (panel === modal && full(modal)) {
      const kids = [...modal.querySelectorAll('*')].filter((e) => visible(e) && !full(e) && !e.closest('svg') && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)');
      kids.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return rb.width * rb.height - ra.width * ra.height; });
      if (kids[0]) panel = kids[0];
    }
    const buttons = [...modal.querySelectorAll('button, a[href]')];
    const close = buttons.find((b) => visible(b) && /^(close|close am|fermer|cerrar)$/i.test(nameOf(b))) || buttons.find((b) => visible(b) && /close|fermer|cerrar|back|done|got it|ok\\b|later|keep|continue|see the map|great|cancel|skip|no thanks|stop|^hi,|retour|volver|termin|listo|compris|entendido|annuler|cancelar|passer|saltar|plus tard|luego|continuer|continuar|seguir|voir la carte|ver el mapa|^salut|^hola|^how far|comot|go back|i don get am|no be now|pas maintenant|ahora no/i.test(nameOf(b)));
    dialog = { panel: rectOf(panel), close: close ? rectOf(close) : null, closeName: close ? nameOf(close) : '' };
  }
  let header = null;
  const hdrEl = document.querySelector('header.studio-header');
  if (hdrEl && visible(hdrEl)) {
    const hb = rectOf(hdrEl);
    const found = [...hdrEl.querySelectorAll('button, a[href]')].filter(visible);
    const ask = document.querySelector('.ask-fold .ask-bar');
    // In short landscape the Ask bar is pinned into the header row; elsewhere it lives in the page.
    if (ask && visible(ask) && getComputedStyle(ask.closest('.ask-fold')).position === 'fixed') found.push(ask);
    const titleEl = hdrEl.querySelector('input#title');
    header = { box: hb, controls: found.map((e) => ({ ...rectOf(e), name: label(e) })), title: titleEl && visible(titleEl) ? rectOf(titleEl) : null };
  }
  return { w, h, scrollWidth: document.scrollingElement ? document.scrollingElement.scrollWidth : 0,
    layout: document.documentElement.dataset.layout || '', widthClass: document.documentElement.dataset.width || '',
    keyboardOpen: document.documentElement.dataset.keyboard === 'open', overflowing, targets, texts, stage, runButton: runEl ? rectOf(runEl) : null, dialog, header, cls: window.__cls || 0 };
})()`;

const width = (b: Box) => b.right - b.left;
const height = (b: Box) => b.bottom - b.top;
const r = (n: number) => Math.round(n * 10) / 10;

export type Assertion = (facts: Facts, ctx: Context) => string[];

/** (a) no horizontal overflow */
export const noHorizontalOverflow: Assertion = (f) => {
  const out: string[] = [];
  if (f.scrollWidth > f.w) out.push(`page scrolls sideways: scrollWidth ${f.scrollWidth} > ${f.w}`);
  for (const o of f.overflowing.slice(0, 5)) out.push(`${o.name} runs to x=${r(o.right)} past the ${f.w}px screen`);
  return out;
};

/** (b) touch targets are big enough and not crowded */
export const touchTargets: Assertion = (f, ctx) => {
  if (!ctx.touch) return [];
  const out: string[] = [];
  const small = f.targets.filter((t) => {
    const allowed = TOUCH_ALLOWLIST.some((a) => a.match.test(t.name.replace(/^[^"]*"|"$/g, '')));
    const min = allowed ? 44 : 48;
    return width(t) < min - 0.5 || height(t) < min - 0.5;
  });
  for (const t of small.slice(0, 6)) out.push(`${t.name} is ${r(width(t))}x${r(height(t))}, under 48x48`);
  if (small.length > 6) out.push(`...and ${small.length - 6} more targets under 48x48`);
  let crowded = 0;
  const examples: string[] = [];
  for (let i = 0; i < f.targets.length; i++) {
    for (let j = i + 1; j < f.targets.length; j++) {
      const a = f.targets[i]!;
      const b = f.targets[j]!;
      const contains = (p: Box, q: Box) => p.left <= q.left + 1 && p.top <= q.top + 1 && p.right >= q.right - 1 && p.bottom >= q.bottom - 1;
      if (contains(a, b) || contains(b, a)) continue;
      const gapX = Math.max(a.left - b.right, b.left - a.right);
      const gapY = Math.max(a.top - b.bottom, b.top - a.bottom);
      // gap is negative on an axis when the boxes overlap there; they only touch when both axes are under 8
      const gap = Math.max(gapX, gapY);
      if (gap < 8 && (gapX < 8 && gapY < 8)) {
        crowded++;
        if (examples.length < 3) examples.push(`${a.name} and ${b.name} are ${gap < 0 ? 'overlapping' : `${r(gap)}px apart`}`);
      }
    }
  }
  if (crowded) out.push(`${crowded} pairs of targets are closer than 8px: ${examples.join('; ')}`);
  return out;
};

/** (c) readable text */
export const readableText: Assertion = (f) => {
  const out: string[] = [];
  const tiny = f.texts.filter((t) => t.size < 12);
  for (const t of tiny.slice(0, 4)) out.push(`text "${t.text}" is ${r(t.size)}px, under 12px`);
  const small = f.texts.filter((t) => t.size >= 12 && t.size < 14 && !t.eyebrow);
  if (small.length) out.push(`${small.length} text runs under 14px, e.g. "${small[0]!.text}" at ${r(small[0]!.size)}px`);
  return out;
};

/** (d) keep clear of notches and home indicators */
export const safeArea: Assertion = (f, ctx) => {
  const { top, right, bottom, left } = ctx.insets;
  if (!(top || right || bottom || left)) return [];
  const bad = f.targets.filter((t) => t.bottom > 0 && t.top < f.h && ((top && t.top < top - 0.5) || (bottom && !t.scrollsMore && t.bottom > f.h - bottom + 0.5) || (left && t.left < left - 0.5) || (right && t.right > f.w - right + 0.5)));
  return bad.slice(0, 5).map((t) => `${t.name} sits inside the safe area (insets ${top}/${right}/${bottom}/${left})`);
};

/** (e) the stage fills its pane and Run is on screen in split layout */
export const stageFillsPane: Assertion = (f) => {
  if (!f.stage || f.keyboardOpen || f.dialog) return [];
  const out: string[] = [];
  const side = Math.min(width(f.stage), height(f.stage));
  if (f.layout === 'split') {
    const room = f.stage.paneInnerHeight - f.stage.controlsHeight;
    const want = Math.min(f.stage.paneInner, room) - 4;
    if (side < want) out.push(`stage is ${r(side)}px, wanted at least ${r(want)}px in split layout`);
    const run = f.runButton;
    if (!run) out.push('no Run button found');
    else if (run.left < -0.5 || run.top < -0.5 || run.right > f.w + 0.5 || run.bottom > f.h + 0.5) out.push(`Run button is not fully on screen (${r(run.top)}-${r(run.bottom)} of ${f.h})`);
  } else {
    // Tablets upright put the controls beside the stage (56 % of the pane, at most 45 % of the screen height) so the blocks show on the first screen; phones fill the width.
    const want = (f.w >= 600 && !f.keyboardOpen ? Math.max(320, Math.min(f.stage.paneInner * 0.56, f.h * 0.45)) : Math.min(f.stage.paneInner, 720, f.widthClass === 'compact' && f.h > f.w ? Math.max(220, f.h * 0.36) : 720)) - 4;
    if (width(f.stage) < want) out.push(`stage is ${r(width(f.stage))}px wide, wanted at least ${r(want)}px in stack layout`);
  }
  return out;
};

/** (f) dialogs and sheets stay on screen and can be closed */
export const dialogsFit: Assertion = (f, ctx) => {
  const d = f.dialog;
  if (!d) return [];
  const out: string[] = [];
  const inside = (b: Box) => b.left >= -1 && b.top >= -1 && b.right <= f.w + 1 && b.bottom <= f.h + 1;
  if (!inside(d.panel)) out.push(`dialog panel is not inside the screen (x ${r(d.panel.left)}-${r(d.panel.right)}, y ${r(d.panel.top)}-${r(d.panel.bottom)} of ${f.w}x${f.h})`);
  if (!d.close) out.push('dialog has no reachable close or continue button');
  else if (!inside(d.close)) out.push(`dialog close button "${d.closeName}" is off screen`);
  if (f.widthClass === 'compact') {
    const lowest = f.h - ctx.insets.bottom - 2;
    if (d.panel.bottom < lowest || d.panel.bottom > f.h + 1) out.push(`on a compact screen the dialog should sit at the bottom edge, but it ends at y=${r(d.panel.bottom)} of ${f.h}`);
  }
  return out;
};

/** (h) every header control sits inside the header bar, and the drawing name keeps clear of the buttons */
export const headerFits: Assertion = (f) => {
  const hd = f.header;
  if (!hd) return [];
  const out: string[] = [];
  for (const c of hd.controls) {
    if (c.top < -0.5 || c.top < hd.box.top - 0.5 || c.bottom > hd.box.bottom + 0.5) out.push(`header control ${c.name} (y ${r(c.top)}-${r(c.bottom)}) is not inside the header (y ${r(hd.box.top)}-${r(hd.box.bottom)})`);
  }
  const t = hd.title;
  if (t) {
    for (const c of hd.controls) {
      const sameRow = c.top < t.bottom && c.bottom > t.top;
      if (sameRow && c.left < t.right + 4 && c.right > t.left) out.push(`the drawing name touches header control ${c.name} (x ${r(t.left)}-${r(t.right)} against ${r(c.left)}-${r(c.right)})`);
    }
  }
  return out.slice(0, 4);
};
/** (g) a quiet console and a steady layout */
export const calmPage = (facts: Facts, errors: string[]): string[] => {
  const out = errors.slice(0, 4).map((e) => `console: ${e}`);
  if (errors.length > 4) out.push(`...and ${errors.length - 4} more console errors`);
  if (facts.cls > 0.1) out.push(`layout shift ${Math.round(facts.cls * 1000) / 1000} is over 0.1`);
  return out;
};

export const ASSERTIONS: Record<string, Assertion> = {
  'a-overflow': noHorizontalOverflow,
  'b-touch': touchTargets,
  'c-text': readableText,
  'd-safe-area': safeArea,
  'e-stage': stageFillsPane,
  'f-dialog': dialogsFit,
  'h-header': headerFits,
};
