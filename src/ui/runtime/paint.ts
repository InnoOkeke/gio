import type { TurtleEvent } from '../../logo/index.js';

type FillEvent = Extract<TurtleEvent, { type: 'fill' }>;

/** The lines and dots on the stage just before event `upto`: everything since the last clear. */
function inkBefore(events: readonly TurtleEvent[], upto: number): TurtleEvent[] {
  let from = upto;
  while (from > 0 && events[from - 1]!.type !== 'clear') from--;
  return events.slice(from, upto).filter((e) => e.type === 'line' || e.type === 'dot');
}

/**
 * Paint a FILL onto a canvas that already shows events[0 .. at). The colour goes in first and the lines
 * and dots before it are drawn again on top, so a fill sits under the lines like paint in a colouring book.
 * `toWorld` sets the canvas transform to turtle units (y up).
 */
export function paintFill(ctx: CanvasRenderingContext2D, events: readonly TurtleEvent[], at: number, toWorld: () => void): void {
  const fill = events[at] as FillEvent;
  toWorld();
  ctx.fillStyle = fill.color;
  for (const r of fill.rects) ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const e of inkBefore(events, at)) {
    if (e.type === 'line') {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.size;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    } else if (e.type === 'dot') {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
