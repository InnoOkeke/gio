import { describe, expect, it } from 'vitest';
import { levelById } from '../src/logo/adventure/levels/index.js';
import { buildActions } from '../src/ui/adventure/actions';
import { cellWord, describeRows, describeScene, whereWords } from '../src/ui/adventure/describe';
import { initialScene, sceneAt } from '../src/ui/adventure/scene-state';
import { ADVENTURE_NAIVE, ADVENTURE_REFERENCE } from './solutions/adventure.js';
import { lab, play } from './helpers/adventure-lab';

const level = (id: string) => levelById(id)!;
const texts = (id: string, code: string) => {
  const l = level(id);
  const outcome = play(l, code);
  return buildActions(l, outcome.trace, outcome.message).map((a) => a.text);
};

describe('whereWords', () => {
  it('uses thirds of each side', () => {
    expect(whereWords(2, 0, 5, 5)).toBe('at the top');
    expect(whereWords(2, 4, 5, 5)).toBe('at the bottom');
    expect(whereWords(2, 2, 5, 5)).toBe('in the middle');
    expect(whereWords(0, 2, 5, 5)).toBe('on the left');
    expect(whereWords(4, 2, 5, 5)).toBe('on the right');
    expect(whereWords(4, 4, 5, 5)).toBe('at the bottom right');
    expect(whereWords(0, 0, 3, 3)).toBe('at the top left');
    expect(whereWords(1, 1, 3, 3)).toBe('in the middle');
    expect(whereWords(8, 0, 9, 9)).toBe('at the top right');
  });
});

describe('describeScene', () => {
  it('describes maze-01 in the words the design gives', () => {
    expect(describeScene(initialScene(level('maze-01')))).toBe('Map 5 by 5. Gio at the bottom, facing up. Flag at the top. 1 gem. No rocks.');
  });

  it('counts rocks and says which way Gio faces', () => {
    expect(describeScene(initialScene(level('maze-03')))).toBe('Map 5 by 5. Gio at the bottom left, facing right. Flag at the top left. 1 gem. 8 rocks.');
  });

  it('names a caged friend, a gate, water, Grumbles and fire', () => {
    expect(describeScene(initialScene(level('maze-05')))).toBe('Map 5 by 5. Gio at the bottom left, facing up. Caged friend on the right. 1 gem. No rocks.');
    expect(describeScene(initialScene(level('maze-08')))).toContain('Gate at the top left.');
    const l = lab(['G..', '.~.', '.S.'], { enemies: [{ id: 'a', route: [[2, 0], [2, 1]] }], fires: [{ id: 'f', cells: [[0, 1]], period: 2, on: [0] }] });
    expect(describeScene(initialScene(l))).toBe('Map 3 by 3. Gio at the bottom, facing up. Flag at the top left. 0 gems. No rocks. 1 water square. 1 Grumble. 1 fire square burning.');
  });

  it('follows the run: gems left and collected, and a new place for Gio', () => {
    const l = level('maze-01');
    const outcome = play(l, 'FD 100');
    const mid = sceneAt(l, l.map, outcome.trace, outcome.trace.length);
    expect(describeScene(mid)).toBe('Map 5 by 5. Gio in the middle, facing up. Flag at the top. 0 gems left, 1 collected. No rocks.');
    const done = play(l, ADVENTURE_REFERENCE['maze-01']!.coder!);
    expect(describeScene(sceneAt(l, l.map, done.trace, done.trace.length))).toBe('Map 5 by 5. Gio at the top, facing up. Flag at the top. 0 gems left, 1 collected. No rocks.');
  });

  it('describes a 3 by 7 map by its real size', () => {
    expect(describeScene(initialScene(lab(['G..', '...', '...', '.g.', '...', '...', 'S..'])))).toMatch(/^Map 3 by 7\./);
  });
});

describe('describeRows', () => {
  it('lists the map row by row, top first, with Gio and the things on it', () => {
    const rows = describeRows(initialScene(level('maze-01')));
    expect(rows).toHaveLength(5);
    expect(rows[0]!.label).toBe('Row 1 of 5, top');
    expect(rows[2]!.label).toBe('Row 3 of 5');
    expect(rows[4]!.label).toBe('Row 5 of 5, bottom');
    expect(rows[0]!.cells).toEqual(['clear', 'clear', 'flag', 'clear', 'clear']);
    expect(rows[2]!.cells[2]).toBe('gem');
    expect(rows[4]!.cells[2]).toBe('Gio, facing up');
    expect(rows[0]!.spoken).toBe('Row 1 of 5, top: clear, clear, flag, clear, clear.');
  });

  it('says what every kind of cell is', () => {
    const l = lab(['G#~=', 'gFDj', 'o.S.', '....'], { enemies: [{ id: 'a', route: [[0, 3]] }], fires: [{ id: 'f', cells: [[3, 3]], period: 1, on: [0] }] });
    const scene = initialScene(l);
    const words = describeRows(scene).flatMap((r) => r.cells);
    expect(words).toEqual(['flag', 'rock', 'water', 'bridge', 'gem', 'cage', 'gate', 'boots', 'shield', 'clear', 'Gio, facing up', 'clear', 'Grumble', 'clear', 'clear', 'fire']);
    expect(cellWord(scene, 0, 0)).toBe('flag');
  });

  it('shows a freed friend where the cage was', () => {
    const l = level('maze-05');
    const outcome = play(l, ADVENTURE_REFERENCE['maze-05']!.coder!);
    const end = sceneAt(l, l.map, outcome.trace, outcome.trace.length);
    expect(cellWord(end, 4, 2)).toBe('free friend');
  });
});

describe('narration', () => {
  it('joins steps on one line into one sentence and keeps the gem with its step', () => {
    expect(texts('maze-01', 'FD 200')).toEqual(['Gio walks 2 steps. Gio picks up a gem', null, 'Gio walks 2 steps', null, 'Gio did it!']);
  });

  it('reads every Maze reference without a missing line', () => {
    for (const [id, modes] of Object.entries(ADVENTURE_REFERENCE)) {
      const lines = texts(id, modes.coder!);
      expect(lines[lines.length - 1]).toBe('Gio did it!');
      expect(lines.filter((t) => t !== null).every((t) => t!.length > 0)).toBe(true);
      expect(lines[0]).not.toBeNull();
    }
  });

  it('says turns, backing up and opening a cage', () => {
    const t = texts('maze-05', 'RT 90\nLT 90\nFD 100\nBK 50\nRT 180');
    expect(t[0]).toBe('Gio turns right');
    expect(t[1]).toBe('Gio turns left');
    expect(t[2]).toBe('Gio walks 1 step. Gio picks up a gem');
    expect(t[3]).toBe('Gio walks 1 step');
    expect(t[4]).toBe('Gio walks back 1 step');
    expect(t[5]).toBe('Gio turns around');
    expect(texts('maze-05', ADVENTURE_REFERENCE['maze-05']!.coder!)).toContain('Gio opens the cage');
  });

  it('says why a plan failed in the words of the engine', () => {
    for (const [id, naive] of Object.entries(ADVENTURE_NAIVE)) {
      if (naive.status !== 'lost') continue;
      const l = level(id);
      const outcome = play(l, naive.code);
      const lines = buildActions(l, outcome.trace, outcome.message).map((a) => a.text);
      expect(lines[lines.length - 1]).toBe(outcome.message);
    }
    expect(texts('maze-03', ADVENTURE_NAIVE['maze-03']!.code).at(-1)).toBe('Oof, a rock!');
  });

  it('ends an unfinished run with no win and no lose line, and the last step has no text of its own', () => {
    expect(texts('maze-01', 'FD 100')).toEqual(['Gio walks 2 steps. Gio picks up a gem', null]);
  });

  it('uses the outcome message when a run ends with nothing to explain it', () => {
    const l = lab(['G..', '...', '.S.']);
    const outcome = play(l, 'REPEAT 1000 [REST]');
    expect(outcome.reason).toBe('tired');
    expect(buildActions(l, outcome.trace, outcome.message).at(-1)!.text).toBe('Gio got tired. Is a REPEAT going round forever?');
  });

  it('names the shield, boots and a Grumble that was held off', () => {
    const l = lab(['G..', '.o.', '.S.'], { enemies: [{ id: 'a', route: [[1, 0], [1, 1]] }] });
    const lines = buildActions(l, play(l, 'FD 50\nREST').trace).map((a) => a.text);
    expect(lines[0]).toContain('Gio picks up a shield');
    expect(lines.join(' ')).toContain('A Grumble bumped into Gio, but the shield helped');
    expect(lines.join(' ')).toContain('The shield pops');
    const boots = lab(['G..', '.j.', '.S.']);
    expect(buildActions(boots, play(boots, 'FD 50').trace)[0]!.text).toBe('Gio walks 1 step. Gio puts on the boots');
  });

  it('says swimming and jumping', () => {
    const swim = lab(['G..', '.~.', '.S.']);
    expect(buildActions(swim, play(swim, 'SWIM').trace)[0]!.text).toBe('Gio swims');
    const jump = lab(['G..', '#..', 'jS.', '...']);
    const outcome = play(jump, 'LT 90\nFD 50\nRT 90\nJUMP');
    expect(outcome.status).toBe('won');
    expect(buildActions(jump, outcome.trace).map((a) => a.text)).toContain('Gio jumps');
  });
});
