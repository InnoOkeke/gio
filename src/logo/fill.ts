/**
 * FILL: colour in the closed shape the turtle is in.
 *
 * The lines drawn so far are painted onto a small grid, the grid is flooded from the turtle's spot,
 * and the flooded cells come back as a few rectangles in turtle units. The same steps are written out
 * in Python in translate.ts (`logo_fill`), so a translated program fills the same shape.
 * Keep the two in step: the numbers below are repeated there.
 */

/** A line (or a dot, when both ends match) the pen left on the stage. `size` is its thickness. */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  size: number;
}

/** A filled rectangle in turtle units. (x, y) is the bottom left corner and y points up. */
export interface FillRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The grid is never wider than this many cells, so a big drawing fills as fast as a small one. */
export const FILL_MAX_CELLS = 600;
/** Empty room around the drawing, in turtle units, so the outside is always one connected area. */
export const FILL_PAD = 4;
/** How many directions are tried around a turtle that stands right on a line. */
export const FILL_PROBES = 24;
/** How many times the ring of directions is tried, each ring twice as far out as the one before. */
export const FILL_RINGS = 5;

/**
 * The rectangles that colour in the closed shape around (x, y), or null when the turtle is not inside a
 * closed shape (the lines have a gap, or there are no lines).
 * When the turtle stands on a line, which is where a shape ends after the turtle has drawn it, the
 * smallest closed shape touching that spot is filled.
 */
export function computeFill(segments: readonly Segment[], x: number, y: number): FillRect[] | null {
  if (!segments.length) return null;
  let minX = x;
  let maxX = x;
  let minY = y;
  let maxY = y;
  let reach = 0;
  for (const s of segments) {
    const half = s.size / 2;
    reach = Math.max(reach, half);
    minX = Math.min(minX, s.x1 - half, s.x2 - half);
    maxX = Math.max(maxX, s.x1 + half, s.x2 + half);
    minY = Math.min(minY, s.y1 - half, s.y2 - half);
    maxY = Math.max(maxY, s.y1 + half, s.y2 + half);
  }
  minX -= FILL_PAD;
  minY -= FILL_PAD;
  maxX += FILL_PAD;
  maxY += FILL_PAD;
  const cell = Math.max(1, Math.ceil(Math.max(maxX - minX, maxY - minY) / FILL_MAX_CELLS));
  const nx = Math.floor((maxX - minX) / cell) + 1;
  const ny = Math.floor((maxY - minY) / cell) + 1;
  const wall = new Uint8Array(nx * ny);

  // Paint every line as a row of round stamps, a little fatter than the line so no gap is thinner than a cell.
  for (const s of segments) {
    const radius = Math.max(s.size / 2, cell * 0.8);
    const steps = Math.ceil(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / (cell * 0.5)) + 1;
    const span = Math.ceil(radius / cell);
    for (let k = 0; k < steps; k++) {
      const t = steps === 1 ? 0 : k / (steps - 1);
      const px = s.x1 + (s.x2 - s.x1) * t;
      const py = s.y1 + (s.y2 - s.y1) * t;
      const cx = Math.floor((px - minX) / cell);
      const cy = Math.floor((py - minY) / cell);
      for (let iy = Math.max(0, cy - span); iy <= Math.min(ny - 1, cy + span); iy++) {
        for (let ix = Math.max(0, cx - span); ix <= Math.min(nx - 1, cx + span); ix++) {
          if (Math.hypot(minX + (ix + 0.5) * cell - px, minY + (iy + 0.5) * cell - py) <= radius) wall[iy * nx + ix] = 1;
        }
      }
    }
  }

  const label = new Int32Array(nx * ny);
  const regions: { id: number; cells: number; open: boolean }[] = [];
  const flood = (start: number): void => {
    const id = regions.length + 1;
    const region = { id, cells: 0, open: false };
    regions.push(region);
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const at = stack.pop()!;
      region.cells++;
      const ix = at % nx;
      const iy = (at - ix) / nx;
      if (ix === 0 || iy === 0 || ix === nx - 1 || iy === ny - 1) region.open = true;
      for (const next of [ix > 0 ? at - 1 : -1, ix < nx - 1 ? at + 1 : -1, iy > 0 ? at - nx : -1, iy < ny - 1 ? at + nx : -1]) {
        if (next >= 0 && !wall[next] && !label[next]) {
          label[next] = id;
          stack.push(next);
        }
      }
    }
  };

  const cellAt = (px: number, py: number): number => {
    const ix = Math.floor((px - minX) / cell);
    const iy = Math.floor((py - minY) / cell);
    return ix < 0 || iy < 0 || ix >= nx || iy >= ny ? -1 : iy * nx + ix;
  };

  const home = cellAt(x, y);
  let chosen = 0;
  if (home >= 0 && !wall[home]) {
    flood(home);
    if (!regions[0]!.open) chosen = 1;
  } else {
    // Look around the turtle in a ring. A sharp corner has no room close by, so the ring grows until it finds a closed shape.
    for (let level = 0; level < FILL_RINGS && !chosen; level++) {
      const away = (reach + cell * 1.5) * 2 ** level;
      const first = regions.length;
      for (let k = 0; k < FILL_PROBES; k++) {
        const angle = (k * 2 * Math.PI) / FILL_PROBES;
        const at = cellAt(x + away * Math.sin(angle), y + away * Math.cos(angle));
        if (at < 0 || wall[at] || label[at]) continue;
        flood(at);
      }
      for (const r of regions.slice(first)) {
        if (!r.open && (chosen === 0 || r.cells < regions[chosen - 1]!.cells)) chosen = r.id;
      }
    }
  }
  if (!chosen) return null;

  // Rows of cells become rectangles, and a row with the same left and right end as the row below joins it.
  const rects: FillRect[] = [];
  let open = new Map<string, FillRect>();
  for (let iy = 0; iy < ny; iy++) {
    const next = new Map<string, FillRect>();
    let ix = 0;
    while (ix < nx) {
      if (label[iy * nx + ix] !== chosen) {
        ix++;
        continue;
      }
      const from = ix;
      while (ix < nx && label[iy * nx + ix] === chosen) ix++;
      const key = `${from}:${ix}`;
      const rect = open.get(key);
      if (rect) {
        rect.h += cell;
        next.set(key, rect);
      } else {
        // Each rectangle reaches half a cell into the line next to it, so the line covers the edge.
        const fresh = { x: minX + from * cell - cell / 2, y: minY + iy * cell - cell / 2, w: (ix - from) * cell + cell, h: cell + cell };
        rects.push(fresh);
        next.set(key, fresh);
      }
    }
    open = next;
  }
  return rects;
}
