import { Fragment, useState } from 'react';
import { BLOCK_COLORS, NAMED_COLORS, type Block, type BlockKind, type NotePitch } from '../../logo/index.js';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/icons';
import { NOTE_KEYS } from '../runtime/keys';

type Path = number[];

interface Spec {
  label: string;
  glyph: string;
  color: string;
  make(): Block;
  number?: { step: number; min: number; max: number; unit?: string; format?(n: number): string; spoken?(n: number): string };
}

type PaletteGroup = 'draw' | 'music' | 'movie';

const PALETTE_GROUPS: { id: PaletteGroup; label: string; kinds: BlockKind[] }[] = [
  { id: 'draw', label: 'Draw', kinds: ['forward', 'right', 'left', 'back', 'repeat', 'color', 'circle', 'size', 'penup', 'pendown'] },
  { id: 'music', label: 'Music', kinds: ['note', 'repeat'] },
  { id: 'movie', label: 'Movie', kinds: ['frame', 'wait', 'repeat'] },
];

const PITCH_NAMES: Record<NotePitch, string> = { C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', A: 'A', B: 'B', C5: 'high C', R: 'Rest' };

function noteColor(pitch: NotePitch): string {
  return NOTE_KEYS.find((k) => k.pitch === pitch)?.color ?? '#64748b';
}

function noteLabel(b: Extract<Block, { kind: 'note' }>): string {
  const name = b.pitch === 'R' ? 'Rest' : `Note ${PITCH_NAMES[b.pitch]}`;
  return b.beats === 2 ? `${name}, long` : name;
}

function valueText(spec: Spec, n: number): string {
  return spec.number?.format ? spec.number.format(n) : `${n}${spec.number?.unit ?? ''}`;
}

const SPECS: Record<BlockKind, Spec> = {
  forward: { label: 'Forward', glyph: '↑', color: '#12a36b', make: () => ({ kind: 'forward', n: 50 }), number: { step: 10, min: 0, max: 300 } },
  back: { label: 'Back', glyph: '↓', color: '#0b7a4f', make: () => ({ kind: 'back', n: 50 }), number: { step: 10, min: 0, max: 300 } },
  right: { label: 'Turn right', glyph: '↻', color: '#2b9bf4', make: () => ({ kind: 'right', n: 90 }), number: { step: 15, min: 0, max: 360, unit: '°' } },
  left: { label: 'Turn left', glyph: '↺', color: '#1e6fd9', make: () => ({ kind: 'left', n: 90 }), number: { step: 15, min: 0, max: 360, unit: '°' } },
  penup: { label: 'Pen up', glyph: '✋', color: '#66756d', make: () => ({ kind: 'penup' }) },
  pendown: { label: 'Pen down', glyph: '✏️', color: '#44554c', make: () => ({ kind: 'pendown' }) },
  color: { label: 'Colour', glyph: '🎨', color: '#ec3f86', make: () => ({ kind: 'color', color: 'red' }) },
  size: { label: 'Thick pen', glyph: '●', color: '#f97316', make: () => ({ kind: 'size', n: 5 }), number: { step: 1, min: 1, max: 20 } },
  circle: { label: 'Circle', glyph: '◯', color: '#0f8fa6', make: () => ({ kind: 'circle', n: 50 }), number: { step: 10, min: 10, max: 150 } },
  note: { label: 'Note', glyph: '♪', color: '#d9467a', make: () => ({ kind: 'note', pitch: 'C', beats: 1 }) },
  frame: { label: 'Next picture', glyph: '🎞', color: '#8b5cf6', make: () => ({ kind: 'frame' }) },
  wait: {
    label: 'Wait',
    glyph: '⏳',
    color: '#64748b',
    make: () => ({ kind: 'wait', n: 30 }),
    // WAIT counts sixtieths of a second; children see seconds.
    number: { step: 30, min: 30, max: 300, format: (n) => `${n / 60} s`, spoken: (n) => `${n / 60} seconds` },
  },
  repeat: { label: 'Repeat', glyph: '🔁', color: '#7a4cf0', make: () => ({ kind: 'repeat', n: 4, body: [] }), number: { step: 1, min: 1, max: 36, unit: '×' } },
};


/* ---- tree helpers (immutable) ---- */

function getAt(blocks: Block[], path: Path): Block | undefined {
  let list = blocks;
  let node: Block | undefined;
  for (const i of path) {
    node = list[i];
    if (!node) return undefined;
    list = node.kind === 'repeat' ? node.body : [];
  }
  return node;
}

function update(blocks: Block[], path: Path, fn: (list: Block[], index: number) => Block[]): Block[] {
  if (path.length === 1) return fn(blocks, path[0]!);
  const [head, ...rest] = path;
  return blocks.map((b, i) => (i === head && b.kind === 'repeat' ? { ...b, body: update(b.body, rest, fn) } : b));
}

function insertInto(blocks: Block[], parent: Path, index: number, block: Block): Block[] {
  if (!parent.length) return [...blocks.slice(0, index), block, ...blocks.slice(index)];
  return update(blocks, parent, (list, i) =>
    list.map((b, k) => (k === i && b.kind === 'repeat' ? { ...b, body: [...b.body.slice(0, index), block, ...b.body.slice(index)] } : b)),
  );
}

/** Logo line of every block, matching blocksToLogo's layout, so the running line can light up a block. */
function lineMap(blocks: Block[]): Map<string, number> {
  const map = new Map<string, number>();
  let line = 1;
  const visit = (list: Block[], prefix: Path) => {
    list.forEach((b, i) => {
      const path = [...prefix, i];
      map.set(path.join('.'), line++);
      if (b.kind === 'repeat' && b.body.length) {
        visit(b.body, path);
        line++; // closing ]
      }
    });
  };
  visit(blocks, []);
  return map;
}

interface BlocksEditorProps {
  blocks: Block[];
  runningLine: number | null;
  onChange(blocks: Block[]): void;
}

export function BlocksEditor({ blocks, runningLine, onChange }: BlocksEditorProps) {
  const [selected, setSelected] = useState<Path | null>(null);
  const [group, setGroup] = useState<PaletteGroup>('draw');
  const palette = PALETTE_GROUPS.find((g) => g.id === group)!.kinds;
  const lines = lineMap(blocks);
  const selectedBlock = selected ? getAt(blocks, selected) : undefined;

  const add = (kind: BlockKind) => {
    const block = SPECS[kind].make();
    let next: Block[];
    let newPath: Path;
    if (selected && selectedBlock?.kind === 'repeat') {
      next = insertInto(blocks, selected, selectedBlock.body.length, block);
      newPath = [...selected, selectedBlock.body.length];
    } else if (selected) {
      const parent = selected.slice(0, -1);
      const index = selected[selected.length - 1]! + 1;
      next = insertInto(blocks, parent, index, block);
      newPath = [...parent, index];
    } else {
      next = [...blocks, block];
      newPath = [blocks.length];
    }
    onChange(next);
    // Keep adding inside a Repeat until the child picks something else.
    if (!(selected && selectedBlock?.kind === 'repeat')) setSelected(newPath);
  };

  const remove = (path: Path) => {
    onChange(update(blocks, path, (list, i) => [...list.slice(0, i), ...list.slice(i + 1)]));
    setSelected(null);
  };

  const move = (path: Path, delta: -1 | 1) => {
    const i = path[path.length - 1]!;
    onChange(
      update(blocks, path, (list, k) => {
        const j = k + delta;
        if (j < 0 || j >= list.length) return list;
        const copy = [...list];
        [copy[k], copy[j]] = [copy[j]!, copy[k]!];
        return copy;
      }),
    );
    setSelected([...path.slice(0, -1), i + delta]);
  };

  const setValue = (path: Path, patch: Partial<Block>) => onChange(update(blocks, path, (list, i) => list.map((b, k) => (k === i ? ({ ...b, ...patch } as Block) : b))));

  const renderList = (list: Block[], prefix: Path) => (
    <ol className="list-none m-0 p-0 flex flex-col gap-2">
      {list.map((b, i) => {
        const path = [...prefix, i];
        const key = path.join('.');
        const spec = SPECS[b.kind];
        const isSelected = selected?.join('.') === key;
        const isRunning = runningLine !== null && lines.get(key) === runningLine;
        const n = 'n' in b ? b.n : null;
        const label = b.kind === 'note' ? noteLabel(b) : spec.label;
        const spokenValue = n !== null ? ` ${spec.number?.spoken ? spec.number.spoken(n) : valueText(spec, n)}` : '';
        return (
          <li key={key} className="flex flex-col">
            <div
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${label}${spokenValue}${b.kind === 'color' ? ` ${b.color}` : ''}`}
              onClick={() => setSelected(isSelected ? null : path)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(isSelected ? null : path))}
              className={`block-pill ${isSelected ? 'is-selected' : ''} ${isRunning ? 'is-running' : ''}`}
              style={{ background: b.kind === 'note' ? noteColor(b.pitch) : spec.color }}
            >
              <span className="block-glyph" aria-hidden="true">
                {spec.glyph}
              </span>
              <span className="text-[19px] font-black">{label}</span>
              {spec.number && n !== null && (
                <span className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="block-step" aria-label={`Less ${spec.label}`} onClick={() => setValue(path, { n: Math.max(spec.number!.min, n - spec.number!.step) } as Partial<Block>)}>
                    <MinusIcon size={18} />
                  </button>
                  <span className="block-value">{valueText(spec, n)}</span>
                  <button type="button" className="block-step" aria-label={`More ${spec.label}`} onClick={() => setValue(path, { n: Math.min(spec.number!.max, n + spec.number!.step) } as Partial<Block>)}>
                    <PlusIcon size={18} />
                  </button>
                </span>
              )}
              {b.kind === 'color' && (
                <span className="ml-auto w-8 h-8 rounded-full border-[3px] border-white" style={{ background: NAMED_COLORS[b.color.toUpperCase()] }} aria-hidden="true" />
              )}
            </div>

            {isSelected && (
              <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
                {b.kind === 'color' &&
                  BLOCK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`swatch ${b.color === c ? 'ring-4 ring-[#17261f]/30' : ''}`}
                      style={{ backgroundColor: NAMED_COLORS[c.toUpperCase()] }}
                      aria-label={`Colour ${c}`}
                      onClick={() => setValue(path, { color: c } as Partial<Block>)}
                    />
                  ))}
                {b.kind === 'note' && (
                  <div className="note-picker">
                    <div className="note-picker-keys" role="group" aria-label="Pick a note">
                      {NOTE_KEYS.map((key) => (
                        <button
                          key={key.pitch}
                          type="button"
                          className="note-pick"
                          style={{ background: key.color }}
                          aria-pressed={b.pitch === key.pitch}
                          aria-label={`Note ${PITCH_NAMES[key.pitch]}`}
                          onClick={() => setValue(path, { pitch: key.pitch } as Partial<Block>)}
                        >
                          {key.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="segmented" role="radiogroup" aria-label="Note length">
                        {([1, 2] as const).map((beats) => (
                          <button key={beats} type="button" role="radio" aria-checked={b.beats === beats} onClick={() => setValue(path, { beats } as Partial<Block>)}>
                            {beats === 1 ? 'Short' : 'Long'}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="btn btn-quiet" aria-pressed={b.pitch === 'R'} onClick={() => setValue(path, { pitch: 'R' } as Partial<Block>)}>
                        Rest
                      </button>
                    </div>
                  </div>
                )}
                <span className="flex gap-1.5 ml-auto">
                  <button type="button" className="btn btn-quiet btn-icon" aria-label="Move up" onClick={() => move(path, -1)} disabled={i === 0}>
                    <ArrowUpIcon />
                  </button>
                  <button type="button" className="btn btn-quiet btn-icon" aria-label="Move down" onClick={() => move(path, 1)} disabled={i === list.length - 1}>
                    <ArrowDownIcon />
                  </button>
                  <button type="button" className="btn btn-quiet btn-icon text-[#c43f33]" aria-label="Remove block" onClick={() => remove(path)}>
                    <TrashIcon />
                  </button>
                </span>
              </div>
            )}

            {b.kind === 'repeat' && (
              <div className="repeat-body" style={{ borderColor: spec.color }}>
                {b.body.length ? (
                  renderList(b.body, path)
                ) : (
                  <p className="m-0 text-[15px] font-bold text-ink-3">{isSelected ? 'Now tap blocks to put them inside.' : 'Tap Repeat, then tap blocks to put inside.'}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
        {blocks.length ? (
          renderList(blocks, [])
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
            <p className="m-0 text-[22px] font-black">Tap a block to start!</p>
            <p className="m-0 text-[16px] font-semibold text-ink-2">Try Forward, then press Run.</p>
          </div>
        )}
      </div>
      <div className="border-t border-line bg-paper-2 px-4 py-4 rounded-b-[28px]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="m-0 eyebrow">{selectedBlock?.kind === 'repeat' ? 'Adding inside Repeat' : 'Blocks'}</p>
          <div className="segmented" role="tablist" aria-label="Block groups">
            {PALETTE_GROUPS.map((g) => (
              <button key={g.id} type="button" role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {palette.map((kind) => {
            const spec = SPECS[kind];
            return (
              <Fragment key={kind}>
                <button type="button" className="palette-tile" style={{ background: spec.color }} onClick={() => add(kind)}>
                  <span className="text-[22px] leading-none" aria-hidden="true">
                    {spec.glyph}
                  </span>
                  <span>{spec.label}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
