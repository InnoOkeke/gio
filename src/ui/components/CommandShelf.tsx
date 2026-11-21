import { NAMED_COLORS } from '../../logo/index.js';

interface Snippet {
  code: string;
  hint: string;
}

const GROUPS: { title: string; snippets: Snippet[] }[] = [
  {
    title: 'Move',
    snippets: [
      { code: 'FD 50', hint: 'Walk forward 50 steps' },
      { code: 'BK 50', hint: 'Walk backward 50 steps' },
    ],
  },
  {
    title: 'Turn',
    snippets: [
      { code: 'RT 90', hint: 'Turn right a quarter turn' },
      { code: 'LT 90', hint: 'Turn left a quarter turn' },
    ],
  },
  {
    title: 'Pen',
    snippets: [
      { code: 'PU', hint: 'Pen up: move without drawing' },
      { code: 'PD', hint: 'Pen down: draw again' },
      { code: 'SETPENSIZE 5', hint: 'Make the line thicker' },
    ],
  },
  {
    title: 'Magic',
    snippets: [
      { code: 'REPEAT 4 [ ]', hint: 'Do the commands inside [ ] 4 times' },
      { code: 'CIRCLE 40', hint: 'Draw a circle around the turtle' },
    ],
  },
  {
    title: 'Music',
    snippets: [
      { code: 'PLAY [C D E]', hint: 'Play three notes, one after another' },
      { code: 'PLAY [C E G 2]', hint: 'Play notes; the 2 makes the last one twice as long' },
      { code: 'SETTEMPO 90', hint: 'Play the notes slower (bigger numbers are faster)' },
    ],
  },
  {
    title: 'Movie',
    snippets: [
      { code: 'FRAME', hint: 'Show this picture, then hold it a moment' },
      { code: 'WAIT 30', hint: 'Wait half a second (60 is one second)' },
      { code: 'CLEAN', hint: 'Wipe the picture to start the next one' },
    ],
  },
  {
    title: 'Game',
    snippets: [{ code: 'WHEN "up [ ]', hint: 'Do the commands inside [ ] when the up arrow is pressed' }],
  },
];

const SWATCHES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'black'];

export function CommandShelf({ onInsert }: { onInsert(code: string): void }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 border-t border-line bg-paper-2 rounded-b-[28px] lg:min-h-0 lg:overflow-y-auto">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="eyebrow">{group.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.snippets.map((s) => (
                <button key={s.code} type="button" className="chip" title={s.hint} aria-label={`Insert ${s.code}: ${s.hint}`} onClick={() => onInsert(s.code)}>
                  {s.code}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Colours</span>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((name) => (
            <button
              key={name}
              type="button"
              className="swatch"
              style={{ backgroundColor: NAMED_COLORS[name.toUpperCase()] }}
              title={`SETPENCOLOR "${name}`}
              aria-label={`Insert pen colour ${name}`}
              onClick={() => onInsert(`SETPENCOLOR "${name}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
