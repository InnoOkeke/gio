import type { TurtleEvent } from '../../logo/index.js';

/** 0.25 mm per world unit: a 400 unit drawing is exactly 100 mm. */
export const MM_PER_UNIT = 0.25;
const MARGIN = 6;

type Drawn =
  | { kind: 'path'; color: string; size: number; points: { x: number; y: number }[] }
  | { kind: 'dot'; color: string; x: number; y: number; r: number };

/** Round to 2 decimals and print without a trailing ".00" or a "-0". */
function num(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r === 0 ? 0 : r);
}

/** True when something is on the stage: a line or a dot after the last clear. Cheap enough to call on every render. */
export function hasDrawing(events: readonly TurtleEvent[]): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const type = events[i]!.type;
    if (type === 'line' || type === 'dot') return true;
    if (type === 'clear') return false;
  }
  return false;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function collect(events: readonly TurtleEvent[]): Drawn[] {
  let drawn: Drawn[] = [];
  for (const e of events) {
    if (e.type === 'clear') {
      drawn = [];
    } else if (e.type === 'dot') {
      drawn.push({ kind: 'dot', color: e.color, x: e.x, y: e.y, r: e.r });
    } else if (e.type === 'line') {
      const last = drawn[drawn.length - 1];
      if (
        last?.kind === 'path' &&
        last.color === e.color &&
        last.size === e.size &&
        Math.abs(last.points[last.points.length - 1]!.x - e.x1) < 1e-6 &&
        Math.abs(last.points[last.points.length - 1]!.y - e.y1) < 1e-6
      ) {
        last.points.push({ x: e.x2, y: e.y2 });
      } else {
        drawn.push({ kind: 'path', color: e.color, size: e.size, points: [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }] });
      }
    }
  }
  return drawn;
}

/**
 * The drawing as an SVG file for printers, plotters and cutters, or null when nothing was drawn.
 * Logo's y axis points up and SVG's points down, so y is negated. There is no background rectangle.
 */
export function toSVG(events: readonly TurtleEvent[], opts: { title: string }): string | null {
  const drawn = collect(events);
  if (drawn.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, half: number) => {
    minX = Math.min(minX, x - half);
    maxX = Math.max(maxX, x + half);
    minY = Math.min(minY, -y - half);
    maxY = Math.max(maxY, -y + half);
  };
  for (const item of drawn) {
    if (item.kind === 'dot') grow(item.x, item.y, item.r);
    else for (const p of item.points) grow(p.x, p.y, item.size / 2);
  }

  const x = Math.round((minX - MARGIN) * 100) / 100;
  const y = Math.round((minY - MARGIN) * 100) / 100;
  const w = Math.round((maxX - minX + MARGIN * 2) * 100) / 100;
  const h = Math.round((maxY - minY + MARGIN * 2) * 100) / 100;

  const shapes = drawn.map((item) => {
    if (item.kind === 'dot') {
      return `  <circle cx="${num(item.x)}" cy="${num(-item.y)}" r="${num(item.r)}" fill="${item.color}"/>`;
    }
    const d = item.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${num(p.x)} ${num(-p.y)}`).join(' ');
    return `  <path d="${d}" fill="none" stroke="${item.color}" stroke-width="${num(item.size)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(w * MM_PER_UNIT)}mm" height="${num(h * MM_PER_UNIT)}mm" viewBox="${num(x)} ${num(y)} ${num(w)} ${num(h)}">`,
    `  <title>${escapeXml(opts.title)}</title>`,
    ...shapes,
    '</svg>',
    '',
  ].join('\n');
}
