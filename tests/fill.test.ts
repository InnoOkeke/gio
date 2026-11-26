import { describe, expect, it } from 'vitest';
import { blocksToLogo, check, execute, NAMED_COLORS, toBlocks, toText, translate, type FillRect, type TurtleEvent } from '../src/logo/index.js';
import { toSVG } from '../src/ui/export/svg';

function events(source: string): TurtleEvent[] {
  const r = execute(source);
  if (!r.ok) throw new Error(r.problem.message);
  return r.result.events;
}

function fills(source: string): Extract<TurtleEvent, { type: 'fill' }>[] {
  return events(source).filter((e): e is Extract<TurtleEvent, { type: 'fill' }> => e.type === 'fill');
}

/** True when the point is painted by one of the rectangles. */
const covers = (rects: FillRect[], x: number, y: number) => rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

/** The area the rectangles paint, counted on a 1-unit grid (they overlap a little, so their areas don't add up). */
function area(rects: FillRect[]): number {
  let n = 0;
  for (let y = -300.5; y < 300; y++) for (let x = -300.5; x < 300; x++) if (covers(rects, x, y)) n++;
  return n;
}

describe('FILL in the interpreter', () => {
  it('fills a square from inside, in the pen colour', () => {
    const [fill] = fills('REPEAT 4 [FD 100 RT 90] PU SETXY 50 50 PD SETPC "red FILL');
    expect(fill!.color).toBe(NAMED_COLORS['RED']);
    expect(covers(fill!.rects, 50, 50)).toBe(true);
    expect(covers(fill!.rects, 5, 95)).toBe(true);
    expect(covers(fill!.rects, 150, 50)).toBe(false);
    expect(covers(fill!.rects, -20, 50)).toBe(false);
    expect(Math.abs(area(fill!.rects) - 10_000)).toBeLessThan(800);
  });

  it('fills the shape just drawn when the turtle stands on its corner', () => {
    const [fill] = fills('REPEAT 4 [FD 100 RT 90] FILL');
    expect(covers(fill!.rects, 50, 50)).toBe(true);
    expect(covers(fill!.rects, -50, 50)).toBe(false);
  });

  it('fills a circle from its middle', () => {
    const [fill] = fills('CIRCLE 50 FILL');
    expect(Math.abs(area(fill!.rects) - Math.PI * 2500) / (Math.PI * 2500)).toBeLessThan(0.08);
    expect(covers(fill!.rects, 0, 60)).toBe(false);
  });

  it('fills only the inner ring when shapes are nested', () => {
    const [fill] = fills('CIRCLE 80 CIRCLE 30 PU FD 55 PD FILL');
    expect(covers(fill!.rects, 0, 55)).toBe(true);
    expect(covers(fill!.rects, 0, 0)).toBe(false);
    expect(covers(fill!.rects, 0, 100)).toBe(false);
  });

  it('a shape with a gap cannot be filled, and says why', () => {
    const r = execute('FD 100 RT 90 FD 100 RT 90 FD 100 PU SETXY 50 50 FILL');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.problem.message).toContain('closed shape');
      expect(r.problem.line).toBe(1);
      expect(r.partial?.events.some((e) => e.type === 'line')).toBe(true);
    }
  });

  it('CLEAN and CLEARSCREEN take the lines away, so there is nothing to fill', () => {
    expect(execute('REPEAT 4 [FD 100 RT 90] CLEAN FILL').ok).toBe(false);
    expect(execute('REPEAT 4 [FD 100 RT 90] CS FILL').ok).toBe(false);
  });

  it('lines drawn with the pen up are not walls', () => {
    expect(execute('PU REPEAT 4 [FD 100 RT 90] PD RT 45 FD 10 FILL').ok).toBe(false);
  });
});

describe('FILL in the translations', () => {
  const tr = (source: string, language: 'python' | 'javascript') => {
    const res = check(source);
    if (!res.ok) throw new Error(res.problem.message);
    return toText(translate(res.program, source, language));
  };

  it('Python gets a logo_fill helper that floods a grid, and calls it', () => {
    const py = tr('REPEAT 4 [FD 100 RT 90]\nFILL', 'python');
    expect(py).toContain('def _fill_rects(segs, x, y):');
    expect(py).toContain('def logo_fill():');
    expect(py).toContain('canvas.create_rectangle(');
    expect(py.split('\n')).toContain('logo_fill()');
  });

  it('Python without FILL is translated exactly as before', () => {
    const py = tr('REPEAT 4 [FD 100 RT 90]\nCLEAN', 'python');
    expect(py).not.toContain('logo_fill');
    expect(py).toContain('\nclear()');
  });

  it('Python CLEAN and CLEARSCREEN also wipe the filled shapes', () => {
    const py = tr('REPEAT 4 [FD 100 RT 90]\nFILL\nCLEAN\nCS', 'python');
    expect(py).toContain('def logo_clean():\n    _forget_fills()\n    clear()');
    expect(py).toContain('def logo_clearscreen():\n    _forget_fills()');
  });

  it('a child procedure called LOGO_FILL does not clash with the helper', () => {
    const py = tr('TO LOGO_FILL\nFD 10\nEND\nLOGO_FILL\nCIRCLE 20\nFILL', 'python');
    expect(py).toContain('def logo_fill_():');
    expect(py).toContain('def logo_fill():');
  });

  it('JavaScript calls fill()', () => {
    expect(tr('CIRCLE 20\nFILL', 'javascript')).toContain('\nfill();');
  });
});

describe('FILL as a block', () => {
  it('converts both ways', () => {
    const res = check('REPEAT 4 [FD 50 RT 90]\nSETPENCOLOR "red\nFILL');
    if (!res.ok) throw new Error(res.problem.message);
    const blocks = toBlocks(res.program);
    expect(blocks.ok).toBe(true);
    if (blocks.ok) {
      expect(blocks.blocks[blocks.blocks.length - 1]).toEqual({ kind: 'fill' });
      expect(blocksToLogo(blocks.blocks)).toBe('REPEAT 4 [\n  FD 50\n  RT 90\n]\nSETPENCOLOR "red\nFILL');
    }
  });
});

describe('FILL in the drawing file and the colouring page', () => {
  const square = events('REPEAT 4 [FD 100 RT 90] SETPC "red FILL');

  it('the drawing file has the fill colour under the lines', () => {
    const svg = toSVG(square, { title: 'x' })!;
    const fill = svg.indexOf('fill="#');
    const line = svg.indexOf('stroke="#');
    expect(fill).toBeGreaterThan(0);
    expect(fill).toBeLessThan(line);
  });

  it('the colouring page is black outlines only', () => {
    const svg = toSVG(square, { title: 'x', outline: true })!;
    expect(svg).not.toMatch(/fill="#(?!000000)/);
    expect(svg.match(/stroke="([^"]+)"/g)!.every((s) => s === 'stroke="#000000"')).toBe(true);
    expect(svg).toContain('vector-effect="non-scaling-stroke"');
  });
});
