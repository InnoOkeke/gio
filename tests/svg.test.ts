import { describe, expect, it } from 'vitest';
import { execute, type TurtleEvent } from '../src/logo/index.js';
import { hasDrawing, toSVG } from '../src/ui/export/svg';

function events(source: string): TurtleEvent[] {
  const res = execute(source);
  if (!res.ok) throw new Error(`Expected success, got: ${res.problem.message}`);
  return res.result.events;
}

/** A small tag-balance parser: every tag opens and closes in order and nothing is left open. */
function assertWellFormed(xml: string): void {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '');
  const stack: string[] = [];
  const tag = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(body))) {
    const between = body.slice(last, m.index);
    expect(between.replace(/&(amp|lt|gt|quot|apos);/g, '')).not.toMatch(/[<>&]/);
    last = tag.lastIndex;
    const [, closing, name, , selfClosing] = m;
    if (closing) expect(stack.pop()).toBe(name);
    else if (!selfClosing) stack.push(name!);
  }
  expect(body.slice(last).trim()).toBe('');
  expect(stack).toEqual([]);
}

describe('toSVG', () => {
  it('returns null for an empty drawing and for one that only moves', () => {
    expect(toSVG([], { title: 'x' })).toBeNull();
    expect(toSVG(events('PU FD 100 RT 90 FD 50'), { title: 'x' })).toBeNull();
  });

  it('merges a square into one path with y negated and a tight viewBox at 0.25 mm per unit', () => {
    const svg = toSVG(events('REPEAT 4 [FD 100 RT 90]'), { title: 'Square' })!;
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('d="M 0 0 L 0 -100 L 100 -100 L 100 0 L 0 0"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
    // The default pen is 2 wide, so the box is -1..101 across and -101..1 down, plus a 6 unit margin.
    expect(svg).toContain('viewBox="-7 -107 114 114"');
    expect(svg).toContain('width="28.5mm"');
    expect(svg).toContain('height="28.5mm"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toContain('<rect');
    assertWellFormed(svg);
  });

  it('makes a 400 unit span exactly 100 mm wide inside the margin', () => {
    const svg = toSVG(events('SETPENSIZE 4 PU BK 200 PD FD 400'), { title: 'Long' })!;
    const [, , w] = /viewBox="(\S+) (\S+) (\S+) (\S+)"/.exec(svg)!.slice(1).map(Number) as [number, number, number, number];
    const mm = Number(/width="([\d.]+)mm"/.exec(svg)![1]);
    expect(mm).toBeCloseTo(w * 0.25, 5);
    expect(w).toBe(4 + 12); // pen width plus both margins; the line is vertical
    const height = Number(/viewBox="\S+ \S+ \S+ (\S+)"/.exec(svg)![1]);
    expect(height).toBe(400 + 4 + 12);
  });

  it('drops everything drawn before a clear', () => {
    const svg = toSVG(events('FD 50 CS RT 90 FD 20'), { title: 'x' })!;
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('d="M 0 0 L 20 0"');
  });

  it('ignores music, waits and movie pictures', () => {
    const plain = toSVG(events('FD 50 RT 90 FD 30'), { title: 'x' });
    const busy = toSVG(events('PLAY [C D] FD 50 FRAME WAIT 30 RT 90 SETTEMPO 90 FD 30 FRAME'), { title: 'x' });
    expect(busy).toBe(plain);
  });

  it('gives each colour its own path', () => {
    const svg = toSVG(events('SETPC "red FD 50 SETPC "blue FD 50'), { title: 'x' })!;
    const paths = svg.match(/<path [^>]*>/g)!;
    expect(paths).toHaveLength(2);
    expect(new Set(paths.map((p) => /stroke="(#[0-9a-fA-F]{6})"/.exec(p)![1])).size).toBe(2);
  });

  it('draws dots as circles', () => {
    const svg = toSVG(events('SETPENSIZE 10 DOT 30 40'), { title: 'x' })!;
    expect(svg).toMatch(/<circle cx="30" cy="-40" r="[\d.]+" fill="#[0-9a-fA-F]{6}"\/>/);
    assertWellFormed(svg);
  });

  it('escapes the title', () => {
    const svg = toSVG(events('FD 10'), { title: `Tom & "Jerry" <3 's` })!;
    expect(svg).toContain('<title>Tom &amp; &quot;Jerry&quot; &lt;3 &apos;s</title>');
    assertWellFormed(svg);
  });
});

describe('hasDrawing', () => {
  it('is true only when a line or dot follows the last clear', () => {
    expect(hasDrawing([])).toBe(false);
    expect(hasDrawing(events('FD 10'))).toBe(true);
    expect(hasDrawing(events('FD 10 CS'))).toBe(false);
    expect(hasDrawing(events('PU FD 10'))).toBe(false);
    expect(hasDrawing(events('DOT 1 1'))).toBe(true);
  });
});
