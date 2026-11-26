import { FILL_MAX_CELLS, FILL_PAD, FILL_PROBES, FILL_RINGS } from './fill.js';
import type { TranslatedLine } from './translate.js';

/**
 * Python has no flood fill, so a translated FILL is a helper function that takes the same steps as
 * GIO's own FILL (see fill.ts): paint the lines onto a grid, flood from the turtle, make rectangles.
 * Only two parts differ by where the program runs:
 *  - real Python (tkinter): the lines are read back from the turtle's canvas and the rectangles are
 *    drawn on that canvas, under the lines;
 *  - GIO's browser turtle: it keeps its own list of lines (`_gio_segments`) and draws the rectangles
 *    with `_gio_fill`.
 * `npm run check:python` runs this in real Python and compares the filled area with GIO's.
 */
export function fillHelperLines(): TranslatedLine[] {
  const code = `import math as _math
import turtle as _turtle

# FILL colours in the closed shape the turtle is inside. Python's turtle has no flood fill,
# so this paints the lines on a grid, floods it from the turtle and draws the flooded cells.
def _fill_rects(segs, x, y):
    if not segs:
        return None
    low_x, high_x, low_y, high_y, reach = x, x, y, y, 0
    for x1, y1, x2, y2, size in segs:
        half = size / 2
        reach = max(reach, half)
        low_x = min(low_x, x1 - half, x2 - half)
        high_x = max(high_x, x1 + half, x2 + half)
        low_y = min(low_y, y1 - half, y2 - half)
        high_y = max(high_y, y1 + half, y2 + half)
    low_x -= ${FILL_PAD}
    low_y -= ${FILL_PAD}
    high_x += ${FILL_PAD}
    high_y += ${FILL_PAD}
    cell = max(1, _math.ceil(max(high_x - low_x, high_y - low_y) / ${FILL_MAX_CELLS}))
    nx = int(_math.floor((high_x - low_x) / cell)) + 1
    ny = int(_math.floor((high_y - low_y) / cell)) + 1
    wall = bytearray(nx * ny)
    for x1, y1, x2, y2, size in segs:
        radius = max(size / 2, cell * 0.8)
        steps = _math.ceil(_math.hypot(x2 - x1, y2 - y1) / (cell * 0.5)) + 1
        span = _math.ceil(radius / cell)
        for k in range(steps):
            t = 0 if steps == 1 else k / (steps - 1)
            px = x1 + (x2 - x1) * t
            py = y1 + (y2 - y1) * t
            cx = int(_math.floor((px - low_x) / cell))
            cy = int(_math.floor((py - low_y) / cell))
            for iy in range(max(0, cy - span), min(ny - 1, cy + span) + 1):
                for ix in range(max(0, cx - span), min(nx - 1, cx + span) + 1):
                    if _math.hypot(low_x + (ix + 0.5) * cell - px, low_y + (iy + 0.5) * cell - py) <= radius:
                        wall[iy * nx + ix] = 1
    label = [0] * (nx * ny)
    regions = []  # [cells, open]

    def flood(start):
        regions.append([0, False])
        number = len(regions)
        stack = [start]
        label[start] = number
        while stack:
            at = stack.pop()
            regions[-1][0] += 1
            ix = at % nx
            iy = at // nx
            if ix == 0 or iy == 0 or ix == nx - 1 or iy == ny - 1:
                regions[-1][1] = True
            for other in (at - 1 if ix > 0 else -1, at + 1 if ix < nx - 1 else -1, at - nx if iy > 0 else -1, at + nx if iy < ny - 1 else -1):
                if other >= 0 and not wall[other] and not label[other]:
                    label[other] = number
                    stack.append(other)

    def cell_at(px, py):
        ix = int(_math.floor((px - low_x) / cell))
        iy = int(_math.floor((py - low_y) / cell))
        return -1 if ix < 0 or iy < 0 or ix >= nx or iy >= ny else iy * nx + ix

    home = cell_at(x, y)
    chosen = 0
    if home >= 0 and not wall[home]:
        flood(home)
        if not regions[0][1]:
            chosen = 1
    else:
        for level in range(${FILL_RINGS}):
            if chosen:
                break
            away = (reach + cell * 1.5) * 2 ** level
            first = len(regions)
            for k in range(${FILL_PROBES}):
                angle = k * 2 * _math.pi / ${FILL_PROBES}
                at = cell_at(x + away * _math.sin(angle), y + away * _math.cos(angle))
                if at < 0 or wall[at] or label[at]:
                    continue
                flood(at)
            for number, (cells, is_open) in enumerate(regions[first:], first + 1):
                if not is_open and (chosen == 0 or cells < regions[chosen - 1][0]):
                    chosen = number
    if not chosen:
        return None
    rects = []
    above = {}
    for iy in range(ny):
        row = {}
        ix = 0
        while ix < nx:
            if label[iy * nx + ix] != chosen:
                ix += 1
                continue
            start = ix
            while ix < nx and label[iy * nx + ix] == chosen:
                ix += 1
            rect = above.get((start, ix))
            if rect:
                rect[3] += cell
            else:
                rect = [low_x + start * cell - cell / 2, low_y + iy * cell - cell / 2, (ix - start) * cell + cell, cell + cell]
                rects.append(rect)
            row[(start, ix)] = rect
        above = row
    return rects

_fills = []  # the shapes FILL drew, so CLEAN and CLEARSCREEN can wipe them

def _forget_fills():
    if _fills:
        for item in _fills:
            getcanvas().delete(item)
        del _fills[:]

def logo_fill():
    here = getattr(_turtle, "_gio_segments", None)
    if here:  # GIO's own turtle in the browser keeps a list of its lines
        rects = _fill_rects(here(), xcor(), ycor())
        if rects:
            _turtle._gio_fill(rects)
            return
    else:  # real Python: read the lines back from the turtle's canvas
        getscreen().update()  # with tracer(0) the lines are only on the canvas after an update
        canvas = getcanvas()
        segs = []
        walls = []
        for item in canvas.find_all():
            kind = canvas.type(item)
            if kind == "line":
                walls.append(item)
                points = canvas.coords(item)
                width = float(canvas.itemcget(item, "width"))
                for k in range(0, len(points) - 3, 2):
                    segs.append((points[k], -points[k + 1], points[k + 2], -points[k + 3], width))
            elif kind == "oval":
                walls.append(item)
                x1, y1, x2, y2 = canvas.coords(item)
                segs.append(((x1 + x2) / 2, -(y1 + y2) / 2, (x1 + x2) / 2, -(y1 + y2) / 2, x2 - x1))
        rects = _fill_rects(segs, xcor(), ycor())
        if rects:
            for x, y, w, h in rects:
                item = canvas.create_rectangle(x, -(y + h), x + w, -y, fill=pencolor(), outline="")
                if walls:
                    canvas.tag_lower(item, walls[0])
                _fills.append(item)
            return
    raise ValueError("FILL needs the turtle inside a closed shape. Draw the shape first, check it has no gap, then fill while the turtle is inside it.")
`;
  return code.split('\n').map((text) => ({ text }));
}
