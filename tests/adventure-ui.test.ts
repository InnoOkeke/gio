import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_WORDS, LEVELS, levelById, playLevel } from '../src/logo/adventure/index.js';
import { hintLadder, shouldOfferHint, trailOf } from '../src/ui/adventure/hints';
import { adventureKeys } from '../src/ui/adventure/keys';
import { pickPlayback } from '../src/ui/adventure/playback';
import { lockedText, nextStarRule, REALMS } from '../src/ui/adventure/realms';
import { ResultCard } from '../src/ui/adventure/ResultCard';
import { logoLanguage } from '../src/ui/editor/logo-language';
import { ADVENTURE_REFERENCE } from './solutions/adventure.js';
import { lab } from './helpers/adventure-lab';

const level = (id: string) => levelById(id)!;

describe('adventure keys', () => {
  it('offers only the words a level allows', () => {
    const labels = (id: string, mode: 'little' | 'coder') => adventureKeys(level(id), mode).map((k) => k.label);
    expect(labels('maze-01', 'little')).toEqual(['FD 50']);
    expect(labels('maze-02', 'little')).toEqual(['FD 50', 'RT 90', 'LT 90']);
    expect(labels('maze-02', 'coder')).toEqual(['FD 50', 'BK 50', 'RT 90', 'LT 90']);
    expect(labels('maze-05', 'coder')).toContain('FREE');
    expect(labels('maze-05', 'coder')).not.toContain('REPEAT');
  });
  it('shows no key for a word the level does not allow, and adds the sense words when AHEAD is allowed', () => {
    const l = { ...level('maze-02'), map: ['..G', '.~.', 'S#.'], allow: { little: [], coder: ['FORWARD', 'IF', 'AHEAD', 'SWIM'] } };
    const labels = adventureKeys(l, 'coder').map((k) => k.label);
    expect(labels).toEqual(['FD 50', 'SWIM', 'IF', 'AHEAD', '"water', '"rock', '[ ]']);
  });
  it('every key text for every Maze level is accepted by the level', () => {
    for (const l of LEVELS) for (const mode of l.modes) for (const k of adventureKeys(l, mode)) expect(k.insert.length).toBeGreaterThan(0);
  });
});

describe('hints', () => {
  it('has one step for each hint of the level, and a trail only when there is a reveal', () => {
    for (const l of LEVELS) {
      for (const mode of l.modes) {
        const ladder = hintLadder(l, mode);
        expect(ladder).toHaveLength(l.hints.length);
        for (const step of ladder) expect(step.trail.length > 0).toBe(step.reveal !== null && step.trail.length > 0);
      }
    }
  });
  it('draws the trail from the revealed commands, from the cell after the start', () => {
    const l = level('maze-01');
    expect(trailOf(l, 'coder', 'FD 100')).toEqual([[2, 3], [2, 2]]);
    expect(trailOf(l, 'coder', undefined)).toEqual([]);
    expect(trailOf(l, 'coder', 'NONSENSE 1')).toEqual([]);
  });
  it('offers a hint once, after two misses in a row', () => {
    expect(shouldOfferHint(1, false)).toBe(false);
    expect(shouldOfferHint(2, false)).toBe(true);
    expect(shouldOfferHint(5, true)).toBe(false);
  });
});

describe('playback and the stars rule', () => {
  it('plays the main map for a plan that wins or fails there', () => {
    const l = level('maze-02');
    const won = playLevel(l, 'coder', ADVENTURE_REFERENCE['maze-02']!.coder!);
    expect(pickPlayback(l, won).mapIndex).toBe(0);
    const lost = playLevel(l, 'coder', 'FD 100\nLT 90\nFD 200');
    const back = pickPlayback(l, lost);
    expect(back.mapIndex).toBe(0);
    expect(back.loseMessage).toBe(lost.message);
  });
  it('plays the variant a plan failed on when it won the main map', () => {
    const l = lab(['.G.', '.g.', '...', '.~.', '...', '...', '.S.'], { variants: [['.G.', '.g.', '.~.', '...', '...', '...', '.S.']] });
    const outcome = playLevel(l, 'coder', 'FD 100\nSWIM\nFD 150');
    const playback = pickPlayback(l, outcome);
    expect(outcome.status).not.toBe('won');
    expect(playback.mapIndex).toBe(1);
    expect(playback.map).toBe(l.variants![0]);
  });
  it('says what the next star needs in words', () => {
    expect(nextStarRule(1, 5, 4)).toContain('every gem');
    expect(nextStarRule(2, 6, 4)).toBe('Use 4 commands or fewer for a third star. You used 6.');
    expect(nextStarRule(2, 4, 4)).toBe('Use 4 commands or fewer for a third star.');
    expect(nextStarRule(3, 4, 4)).toBeNull();
  });
  it('says which boss or level opens a locked world', () => {
    const withWoods = [...LEVELS, { ...level('maze-01'), id: 'woods-01', realm: 'woods' as const }];
    expect(lockedText('woods', 'coder', withWoods)).toBe("Win Maze Meadow's boss to open");
    expect(lockedText('maze', 'coder')).toBe('');
  });
  it('has a name, a blurb and a story for every world', () => {
    for (const r of Object.values(REALMS)) {
      expect(r.name.length).toBeGreaterThan(2);
      expect(r.story.length).toBeGreaterThan(20);
    }
  });
});

describe('the adventure editor language', () => {
  it('builds with and without the adventure words, and leaves the studio list alone', () => {
    expect(logoLanguage()).toBeTruthy();
    expect(logoLanguage({ words: ADVENTURE_WORDS })).toBeTruthy();
  });
});

describe('ResultCard', () => {
  const l = level('maze-02');
  const render = (code: string, stars: number) => {
    const outcome = playLevel(l, 'coder', code);
    return renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(ResultCard, { level: l, outcome, stars, par: 3, next: level('maze-03'), opened: null, friendLine: null, stickers: [], offerHint: true, onHint: () => undefined, onTryAgain: () => undefined, onClose: () => undefined })),
    );
  };
  it('shows stars, the rule for the next star and the way on after a win', () => {
    const html = render(ADVENTURE_REFERENCE['maze-02']!.coder!, 3);
    expect(html).toContain('You did it!');
    expect(html).toContain('3 of 3 stars');
    expect(html).toContain('Next level');
    expect(html).toContain('/adventure/maze-03');
    expect(html).not.toContain('Try for 3 stars');
  });
  it('offers another try for three stars when fewer were earned', () => {
    expect(render(ADVENTURE_REFERENCE['maze-02']!.coder!, 2)).toContain('Try for 3 stars');
  });
  it('says one kind sentence and offers Try again and a hint after a miss', () => {
    const html = render('FD 100\nLT 90\nFD 200', 0);
    expect(html).toContain('Oops!');
    expect(html).toContain('Gio walked off the edge of the map.');
    expect(html).toContain('Try again');
    expect(html).toContain('Want a hint?');
  });
});
