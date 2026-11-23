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
  /** For screen readers and the long-press title. */
  hint: string;
}

const word = (label: string, hint: string, insert = label): AdventureKey => ({ id: label, label, kind: 'word', insert, hint });
const inline = (label: string, hint: string, insert = label): AdventureKey => ({ id: label, label, kind: 'inline', insert, hint });

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
  ];
  return found.filter(([, there]) => there).map(([w]) => inline(`"${w}`, `the word ${w}`));
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
