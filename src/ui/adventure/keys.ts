import type { AgeModeId, Level } from '../../logo/adventure/index.js';

/**
 * The command keys under the plan. A word key starts its own line, an inline key is typed at the
 * caret ("AHEAD", "water), and a snippet key writes a whole pattern with the caret between the brackets.
 */
export interface AdventureKey {
  id: string;
  /** What the child reads on the key. */
  label: string;
  kind: 'word' | 'inline';
  /** The text typed. */
  insert: string;
  /** For screen readers and the long-press title, in English. */
  hint: string;
  /** The message key of the hint: `adv.key.<hintId>`. */
  hintId: string;
  /** For a `"word` key: the word, so the hint reads "the word water" in any language. */
  word?: string;
}

const hintIdOf = (label: string): string => label.split(' ')[0] === '[' ? label : label.split(' ')[0]!;
const word = (label: string, hint: string, insert = label): AdventureKey => ({ id: label, label, kind: 'word', insert, hint, hintId: hintIdOf(label) });
const inline = (label: string, hint: string, insert = label): AdventureKey => ({ id: label, label, kind: 'inline', insert, hint, hintId: hintIdOf(label) });

/** Every key the adventure can offer, in the order the row shows them. `needs` is the allowed word that unlocks the key. */
const ALL: { key: AdventureKey; needs: string | string[] }[] = [
  { key: word('FD 50', 'walk forward one step', 'FD 50'), needs: 'FORWARD' },
  { key: word('BK 50', 'walk back one step', 'BK 50'), needs: 'BACK' },
  { key: word('RT 90', 'turn right', 'RT 90'), needs: 'RIGHT' },
  { key: word('LT 90', 'turn left', 'LT 90'), needs: 'LEFT' },
  { key: word('SWIM', 'swim one step into the water'), needs: 'SWIM' },
  { key: word('JUMP', 'hop over what is in front'), needs: 'JUMP' },
  { key: word('FREE', 'open the cage in front'), needs: 'FREE' },
  { key: word('REST', 'wait one beat'), needs: 'REST' },
  { key: word('REPEAT', 'repeat the commands inside the brackets', 'REPEAT 4 [ ]'), needs: 'REPEAT' },
  { key: word('IF', 'do the commands only when the question is true', 'IF AHEAD = "water [ ]'), needs: 'IF' },
  { key: word('IFELSE', 'do one thing or the other', 'IFELSE AHEAD = "water [ ] [ ]'), needs: 'IFELSE' },
  { key: word('TO', 'teach Gio a new command', 'TO HOP'), needs: 'TO' },
  { key: word('END', 'finish the new command'), needs: 'TO' },
  { key: word('STOP', 'stop this command now'), needs: 'STOP' },
  { key: word('MAKE', 'keep a number in a box called n', 'MAKE "n 1'), needs: 'MAKE' },
  { key: inline(':n', 'the number in the box called n'), needs: ['MAKE', 'TO'] },
  { key: inline('AHEAD', 'what Gio will find in the next step'), needs: 'AHEAD' },
  { key: inline('GEMS', 'how many gems Gio has'), needs: 'GEMS' },
  { key: inline('[ ]', 'brackets'), needs: ['REPEAT', 'IF', 'IFELSE'] },
];

/** Words AHEAD can answer that a level can actually show, as keys that type `"word`. */
function senseKeys(level: Level): AdventureKey[] {
  const map = level.map.join('');
  const found: [string, boolean][] = [
    ['water', map.includes('~')],
    ['rock', map.includes('#')],
    ['fire', (level.fires?.length ?? 0) > 0],
    ['enemy', (level.enemies?.length ?? 0) > 0],
    ['gem', map.includes('g')],
    // "clear is on every map, so offer it only where the level's own hints ask for it.
    ['clear', level.hints.some((h) => Object.values(h.reveal ?? {}).some((code) => code?.includes('"clear')))],
  ];
  return found.filter(([, there]) => there).map(([w]) => ({ ...inline(`"${w}`, `the word ${w}`), word: w }));
}

/** The keys a level offers a mode: only the words it allows. */
export function adventureKeys(level: Level, mode: AgeModeId): AdventureKey[] {
  const allowed = new Set(level.allow[mode]);
  const keys = ALL.filter((k) => (Array.isArray(k.needs) ? k.needs.some((n) => allowed.has(n)) : allowed.has(k.needs))).map((k) => k.key);
  if (!allowed.has('AHEAD')) return keys;
  const at = Math.max(keys.findIndex((k) => k.id === 'AHEAD'), keys.findIndex((k) => k.id === 'GEMS'));
  return [...keys.slice(0, at + 1), ...senseKeys(level), ...keys.slice(at + 1)];
}

/** The snippet a word key hands to `LogoEditor.insert`. */
export const keySnippet = (key: AdventureKey): string => key.insert;
