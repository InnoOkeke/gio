import type { Level } from '../level.js';

const CODER = ['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'SWIM', 'REPEAT', 'IF', 'IFELSE', 'AHEAD'];
/** Little Turtles have the If block (with its "not" switch) but no IFELSE. */
const LITTLE = ['FORWARD', 'RIGHT', 'LEFT', 'SWIM', 'REPEAT', 'IF', 'AHEAD'];

/** Look ahead before every step: swim when it is water, walk when it is not. */
const look = (times: number): string => `REPEAT ${times} [IFELSE AHEAD = "water [SWIM] [FD 50]]`;
/** The same with two If blocks. A swim and a walk can share one turn of the loop. */
const lookLittle = (times: number): string => `REPEAT ${times} [IF AHEAD = "water [SWIM] IF AHEAD <> "water [FD 50]]`;

/**
 * World 3, Rolling River: IF, IFELSE, AHEAD and SWIM. From level 2 the river is somewhere else on every
 * map (variants), so a plan that remembers one river fails the others and a plan that looks ahead wins.
 */
export const RIVER_LEVELS: Level[] = [
  {
    id: 'river-01',
    realm: 'river',
    n: 1,
    kind: 'play',
    modes: ['little', 'coder'],
    title: 'Swim!',
    concept: 'decisions',
    story: 'A wide river runs across the path. Gio cannot walk on water, but he can SWIM. There is a bridge too, far away.',
    goal: 'Swim across the river to the flag. Pick up the gem on the way.',
    map: ['..G..', '..g..', '=~~~~', '=~~~~', '.....', '.....', '..S..'],
    start: { col: 2, row: 6, dir: 'N' },
    allow: { little: ['FORWARD', 'RIGHT', 'LEFT', 'SWIM'], coder: ['FORWARD', 'BACK', 'RIGHT', 'LEFT', 'SWIM'] },
    par: { little: 4, coder: 4 },
    hints: [
      { text: 'Count the steps to the water. The river is two cells wide. SWIM is one step in the water.' },
      { text: 'Walk two steps, then SWIM twice.', reveal: { little: 'FD 100 SWIM SWIM', coder: 'FD 100 SWIM SWIM' } },
    ],
  },
  {
    id: 'river-02',
    realm: 'river',
    n: 2,
    kind: 'play',
    modes: ['little', 'coder'],
    title: 'Which way is the river?',
    concept: 'decisions',
    story: 'This river rolls! It is somewhere else every time. Gio will have to look ahead.',
    goal: 'Cross the river wherever it is. Pick up the gem and reach the flag on every map.',
    map: ['.G.', '.g.', '...', '.~.', '...', '...', '.S.'],
    variants: [
      ['.G.', '.g.', '.~.', '...', '...', '...', '.S.'],
      ['.G.', '.g.', '...', '...', '.~.', '.~.', '.S.'],
    ],
    start: { col: 1, row: 6, dir: 'N' },
    allow: { little: LITTLE, coder: CODER },
    par: { little: 5, coder: 4 },
    hints: [
      { text: 'The river is in a different place on every map. Gio has to look before each step.' },
      { text: 'If water is ahead, SWIM. If not, walk. Say that once and REPEAT it. Six steps reach the flag.' },
      { text: 'AHEAD = "water asks what is in front of Gio.', reveal: { little: lookLittle(6), coder: look(6) } },
    ],
  },
  {
    id: 'river-03',
    realm: 'river',
    n: 3,
    kind: 'play',
    modes: ['little', 'coder'],
    title: 'Two rivers',
    concept: 'decisions',
    story: 'Two rivers cross the path now, with dry land in the middle. On one map there is a bridge, and Gio can walk over a bridge.',
    goal: 'Get across both rivers on every map. Pick up the gem and reach the flag.',
    map: ['.G.', '.g.', '~~~', '...', '...', '...', '~~~', '...', '.S.'],
    variants: [
      ['.G.', '.g.', '...', '...', '~~~', '~~~', '...', '~~~', '.S.'],
      ['.G.', '.g.', '~=~', '...', '...', '~~~', '...', '...', '.S.'],
    ],
    start: { col: 1, row: 8, dir: 'N' },
    allow: { little: LITTLE, coder: CODER },
    par: { little: 5, coder: 4 },
    hints: [
      { text: 'Gio can only see one cell ahead, so he decides before every step. The flag is eight steps away.' },
      { text: 'The plan from the last river still works. Only the number of times changes.' },
      { text: 'Look ahead eight times.', reveal: { little: lookLittle(8), coder: look(8) } },
    ],
  },
  {
    id: 'river-04',
    realm: 'river',
    n: 4,
    kind: 'play',
    modes: ['little', 'coder'],
    title: 'Stones and water',
    concept: 'decisions',
    story: 'A stone path spirals round a pond to the flag in the middle. Whenever a rock blocks the way, the path turns right.',
    goal: 'Follow the spiral to the flag. Pick up every gem.',
    map: ['#######', '#..g..#', '#.~~~.#', '#.~G~g#', '#.~.~.#', '#S#g..#', '#######'],
    start: { col: 1, row: 5, dir: 'N' },
    allow: { little: LITTLE, coder: CODER },
    par: { little: 4, coder: 4 },
    hints: [
      { text: 'The path turns right every time a rock is in front of Gio.' },
      { text: 'Before each step: if a rock is ahead, turn right. Then walk one step. Count all the steps to the flag.' },
      { text: 'Sixteen steps in all.', reveal: { little: 'REPEAT 16 [IF AHEAD = "rock [RT 90] FD 50]', coder: 'REPEAT 16 [IF AHEAD = "rock [RT 90] FD 50]' } },
    ],
  },
  {
    id: 'river-05',
    realm: 'river',
    n: 5,
    kind: 'play',
    modes: ['coder'],
    title: "Hoot's tree",
    concept: 'decisions',
    story: 'Hoot the owl is stuck in a cage by her tree, on the far side of the river. The river is somewhere else on every map.',
    goal: 'Cross the river on every map, collect the gem and FREE Hoot.',
    map: ['.F.', '.g.', '...', '~~~', '~~~', '...', '.S.'],
    variants: [
      ['.F.', '.g.', '~~~', '...', '...', '...', '.S.'],
      ['.F.', '.g.', '...', '~=~', '...', '~~~', '.S.'],
    ],
    start: { col: 1, row: 6, dir: 'N' },
    allow: { little: [], coder: [...CODER, 'FREE'] },
    par: { coder: 5 },
    friend: { art: 'hoot', feature: 'IF' },
    hints: [
      { text: 'Look ahead before every step, like on the last rivers. Stop when the cage is in front of Gio.' },
      { text: 'Five looks get Gio next to the cage.', reveal: { coder: look(5) } },
      { text: 'Now FREE Hoot.', reveal: { coder: `${look(5)}\nFREE` } },
    ],
  },
  {
    id: 'river-06',
    realm: 'river',
    n: 6,
    kind: 'play',
    modes: ['little'],
    title: 'Little tree',
    concept: 'decisions',
    story: 'A little critter is stuck in a cage by a tree. The stream is thin, but it is somewhere else every time.',
    goal: 'Cross the stream on every map, collect the gem and FREE the critter.',
    map: ['.F.', '.g.', '...', '.~.', '...', '...', '.S.'],
    variants: [
      ['.F.', '.g.', '...', '...', '...', '.~.', '.S.'],
      ['.F.', '.g.', '.~.', '...', '...', '...', '.S.'],
    ],
    start: { col: 1, row: 6, dir: 'N' },
    allow: { little: [...LITTLE, 'FREE'], coder: [] },
    par: { little: 5 },
    friend: { art: 'critter' },
    hints: [
      { text: 'The stream is one cell wide. If water is ahead, SWIM, then walk on. If not, just walk.' },
      { text: 'Four turns of the loop get Gio next to the cage.', reveal: { little: 'REPEAT 4 [IF AHEAD = "water [SWIM] FD 50]' } },
      { text: 'Now FREE the critter.', reveal: { little: 'REPEAT 4 [IF AHEAD = "water [SWIM] FD 50]\nFREE' } },
    ],
  },
  {
    id: 'river-07',
    realm: 'river',
    n: 7,
    kind: 'boss',
    modes: ['little', 'coder'],
    title: 'River Troll',
    concept: 'decisions',
    story: 'The River Troll sits behind the gate, and a Grumble paces in front of it. The river is somewhere else on every map. The troll gets sleepy when Gio has the gem.',
    goal: 'Cross the river on every map. Collect the gem to open the gate, then reach the flag.',
    map: ['##G##', '##D##', '.....', '~~~~~', '~~~~~', '..g..', '..S..'],
    variants: [
      ['##G##', '##D##', '.....', '..g..', '~~~~~', '~~~~~', '..S..'],
      ['##G##', '##D##', '.....', '~~~~~', '..g..', '~~~~~', '..S..'],
    ],
    start: { col: 2, row: 6, dir: 'N' },
    allow: { little: LITTLE, coder: CODER },
    enemies: [{ id: 'grumble', route: [[1, 2], [2, 2], [3, 2], [2, 2]] }],
    par: { little: 5, coder: 4 },
    boss: { name: 'River Troll', art: 'river-troll' },
    hints: [
      { text: 'Look ahead before every step. The river moves, but Gio always needs six steps to the flag.' },
      { text: 'Keep going at the same speed. The Grumble steps aside just in time.' },
      { text: 'The look-ahead plan works here too.', reveal: { little: lookLittle(6), coder: look(6) } },
    ],
  },
];
