import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { levelById, LEVELS } from '../src/logo/adventure/levels/index.js';
import { AdventureScene } from '../src/ui/adventure/AdventureScene';
import { BossArt, bossMoodStep } from '../src/ui/adventure/art/creatures';
import { REALM_PALETTES } from '../src/ui/adventure/art/tiles';
import { describeScene } from '../src/ui/adventure/describe';
import { cellPercent, initialScene, sceneAt } from '../src/ui/adventure/scene-state';
import { ADVENTURE_REFERENCE } from './solutions/adventure.js';
import { lab, play } from './helpers/adventure-lab';

const level = (id: string) => levelById(id)!;
const render = (id: string, props: Partial<Parameters<typeof AdventureScene>[0]> = {}) => {
  const l = level(id);
  return renderToStaticMarkup(createElement(AdventureScene, { level: l, scene: initialScene(l), ...props }));
};
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('AdventureScene', () => {
  it('is one labelled image whose label describes the map, with no canvas', () => {
    const l = level('maze-01');
    const html = render('maze-01');
    expect(html).toContain('role="img"');
    expect(html).toContain(`aria-label="${describeScene(initialScene(l))}"`);
    expect(html).toContain('Map 5 by 5. Gio at the bottom, facing up. Flag at the top. 1 gem. No rocks.');
    expect(html).not.toContain('<canvas');
    expect(html).toContain('viewBox="0 0 250 250"');
  });

  it('draws every tile as a use of a shared symbol, so a 9 by 9 map stays light', () => {
    const html = render('maze-08');
    expect(count(html, '<use ')).toBeGreaterThanOrEqual(81);
    expect(count(html, '<symbol ')).toBe(12);
    expect(count(html, '<path d="M 7 40')).toBe(1);
    expect(html).toContain('viewBox="0 0 450 450"');
  });

  it('draws the rocks, the water, the gate, the cage with its friend and the gem', () => {
    expect(count(render('maze-03'), 'data-cell="#"')).toBe(8);
    expect(render('maze-08')).toContain('data-cell="D"');
    const cage = render('maze-05');
    expect(cage).toContain('data-cell="F"');
    expect(cage).toContain('-bars');
    expect(cage).toContain('fr-bob');
    const water = lab(['G..', '.~=', '.S.']);
    const w = renderToStaticMarkup(createElement(AdventureScene, { level: water, scene: initialScene(water) }));
    expect(w).toContain('data-cell="~"');
    expect(w).toContain('data-cell="="');
  });

  it('puts Gio where the scene says and turns him the right way', () => {
    const l = level('maze-02');
    const o = play(l, 'FD 100\nRT 90');
    const scene = sceneAt(l, l.map, o.trace, o.trace.length);
    const html = renderToStaticMarkup(createElement(AdventureScene, { level: l, scene, mood: 'happy' }));
    expect(html).toContain('data-gio="0,2,E"');
    expect(html).toContain('translate(0%, 200%)');
    expect(html).toContain('rotate(90deg)');
    expect(html).toContain('data-mood="happy"');
    expect(html).toContain('width:20%');
  });

  it('glides only when asked', () => {
    expect(render('maze-01')).not.toContain('transition:transform');
    const html = render('maze-01', { tween: true, seconds: 0.6 });
    expect(html).toContain('transition:transform 0.6s linear');
    expect(html).not.toContain('transition:none');
    expect(render('maze-01', { tween: false })).toContain('transition:none');
  });

  it('draws Grumbles and fire from the scene, and a freed friend where the cage was', () => {
    const l = lab(['G..', '...', '.S.'], { enemies: [{ id: 'a', route: [[2, 0], [2, 1]] }], fires: [{ id: 'f', cells: [[0, 1]], period: 1, on: [0] }] });
    const html = renderToStaticMarkup(createElement(AdventureScene, { level: l, scene: initialScene(l) }));
    expect(html).toContain('data-enemy="a"');
    expect(html).toContain('translate(100px, 0px)');
    expect(html).toContain('data-fire="true"');
    const m5 = level('maze-05');
    const o = play(m5, ADVENTURE_REFERENCE['maze-05']!.coder!);
    const end = renderToStaticMarkup(createElement(AdventureScene, { level: m5, scene: sceneAt(m5, m5.map, o.trace, o.trace.length) }));
    expect(end).toContain('data-freed="true"');
    expect(end).not.toContain('data-cell="F"');
  });

  it('draws a picked-up gem as ground and shows the highlight cell', () => {
    const l = level('maze-01');
    const o = play(l, 'FD 100');
    const scene = sceneAt(l, l.map, o.trace, o.trace.length);
    const html = renderToStaticMarkup(createElement(AdventureScene, { level: l, scene, highlight: { col: 2, row: 1 } }));
    expect(html).not.toContain('data-cell="g"');
    expect(html).toContain('data-highlight="true"');
    expect(render('maze-01')).toContain('data-cell="g"');
  });

  it('keeps the shape of a non-square map', () => {
    const tall = lab(['G..', '...', '...', '.g.', '...', '...', 'S..']);
    const html = renderToStaticMarkup(createElement(AdventureScene, { level: tall, scene: initialScene(tall) }));
    expect(html).toContain('aspect-ratio:3 / 7');
    expect(html).toContain('viewBox="0 0 150 350"');
    expect(cellPercent(2, 3, 3, 7)).toEqual({ left: (2 / 3) * 100, top: (3 / 7) * 100, width: 100 / 3, height: 100 / 7 });
  });

  it('renders every level in the game, in every realm palette', () => {
    for (const l of LEVELS) {
      const html = renderToStaticMarkup(createElement(AdventureScene, { level: l, scene: initialScene(l) }));
      expect(html).toContain(`data-realm="${l.realm}"`);
      expect(html).not.toContain('<canvas');
      expect(html).toContain('aria-label="Map ');
    }
    expect(Object.keys(REALM_PALETTES)).toHaveLength(7);
  });

  it('gives two scenes on one page their own symbol ids', () => {
    const l = level('maze-01');
    const html = renderToStaticMarkup(createElement('div', null, createElement(AdventureScene, { level: l, scene: initialScene(l) }), createElement(AdventureScene, { level: l, scene: initialScene(l) })));
    const ids = [...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(24);
  });
});

describe('boss picture', () => {
  it('turns from cross to sleepy as the gems are collected, with words for a screen reader', () => {
    expect(bossMoodStep(0, 4)).toBe(0);
    expect(bossMoodStep(2, 4)).toBe(1);
    expect(bossMoodStep(4, 4)).toBe(2);
    expect(bossMoodStep(0, 0)).toBe(0);
    const boss = level('maze-08').boss!;
    const palette = REALM_PALETTES.maze;
    const at = (g: number) => renderToStaticMarkup(createElement(BossArt, { art: boss.art, gems: g, gemsTotal: 4, palette }));
    expect(at(0)).toContain('Hedge Giant, cross');
    expect(at(2)).toContain('Hedge Giant, getting sleepy');
    expect(at(4)).toContain('Hedge Giant, fast asleep');
    expect(at(4)).toContain('data-boss-mood="2"');
  });
});
