import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { BLOCK_COLORS, NAMED_COLORS, type Block, type BlockKind, type NotePitch } from '../../logo/index.js';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/icons';
import { haptic } from '../haptics';
import { NOTE_KEYS } from '../runtime/keys';
import { useMedia } from '../responsive/useMedia';
import { useWindowClass } from '../responsive/useWindowClass';
import { getAt, insertBlock, isDescendant, lineMap, moveBlock, removeBlock, update, type Path } from './block-tree';
import './blocks.css';

interface Spec {
  label: string;
  glyph: string;
  color: string;
  make(): Block;
  number?: { step: number; min: number; max: number; unit?: string; format?(n: number): string; spoken?(n: number): string };
}

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

/** The palette is data driven: add a group (with kinds that exist in SPECS) and its tiles appear. */
const PALETTE_GROUPS: { id: string; title: string; kinds: BlockKind[] }[] = [
  { id: 'draw', title: 'Draw', kinds: ['forward', 'right', 'left', 'back', 'repeat', 'color', 'circle', 'size', 'penup', 'pendown'] },
  { id: 'music', title: 'Music', kinds: ['note', 'repeat'] },
  { id: 'movie', title: 'Movie', kinds: ['frame', 'wait', 'repeat'] },
];

/* ---- drag and drop plumbing ---- */

type DragData = { type: 'palette'; kind: BlockKind; label: string } | { type: 'block'; path: Path; label: string };
interface SlotData {
  type: 'slot';
  parent: Path;
  index: number;
  where: string;
}

/** Drop zones are big, so the pointer being inside one is the best signal; the nearest one is the fallback. */
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

/** Hold the dragged block a little above the finger so the finger never hides it. */
const liftAboveFinger: Modifier = ({ transform }) => ({ ...transform, y: transform.y - 28 });

/** Mouse and pen start a drag after 6px; touch is left to TouchSensor so a swipe still scrolls. */
class MousePenSensor extends PointerSensor {
  static override activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: e }: { nativeEvent: PointerEvent }) => e.pointerType !== 'touch' && e.isPrimary && e.button === 0,
    },
  ];
}

const slotId = (parent: Path, index: number) => `slot:${parent.join('.')}:${index}`;
const whereLabel = (blocks: Block[], parent: Path) => (parent.length ? `inside ${getAt(blocks, parent) ? SPECS[getAt(blocks, parent)!.kind].label : 'Repeat'}` : 'in your blocks');

function DropSlot({ parent, index, where, disabled, empty }: { parent: Path; index: number; where: string; disabled: boolean; empty?: boolean }) {
  const data: SlotData = { type: 'slot', parent, index, where };
  const { setNodeRef, isOver } = useDroppable({ id: slotId(parent, index), data, disabled });
  return (
    <div ref={setNodeRef} className={`drop-slot ${isOver ? 'is-over' : ''} ${empty ? 'is-empty' : ''}`} aria-hidden="true" data-slot={`${parent.join('.')}:${index}`}>
      {empty && <span className="drop-slot-hint">Drop blocks here</span>}
    </div>
  );
}

function PaletteTile({ kind, onAdd }: { kind: BlockKind; onAdd(kind: BlockKind): void }) {
  const spec = SPECS[kind];
  const data: DragData = { type: 'palette', kind, label: spec.label };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `palette:${kind}`, data });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`palette-tile ${isDragging ? 'is-dragging' : ''}`}
      style={{ background: spec.color }}
      {...attributes}
      {...listeners}
      onClick={() => onAdd(kind)}
    >
      <span className="text-[22px] leading-none" aria-hidden="true">
        {spec.glyph}
      </span>
      <span>{spec.label}</span>
    </button>
  );
}

function DragHandle({ path, label }: { path: Path; label: string }) {
  const data: DragData = { type: 'block', path, label };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `block:${path.join('.')}`, data });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`drag-handle ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${label} block`}
      data-block-path={path.join('.')}
      onClick={(e) => e.stopPropagation()}
    >
      <span aria-hidden="true">⋮⋮</span>
    </button>
  );
}

interface BlocksEditorProps {
  blocks: Block[];
  runningLine: number | null;
  onChange(blocks: Block[]): void;
}

export function BlocksEditor({ blocks, runningLine, onChange }: BlocksEditorProps) {
  const [selected, setSelected] = useState<Path | null>(null);
  const [dragging, setDragging] = useState<DragData | null>(null);
  const [group, setGroup] = useState(PALETTE_GROUPS[0]!.id);
  // Phones on their side have room for one swipe row only: it carries every group, so nothing is behind a tab.
  const shortWindow = useMedia('(max-height: 500px)');
  const paletteKinds = shortWindow ? [...new Set(PALETTE_GROUPS.flatMap((g) => g.kinds))] : (PALETTE_GROUPS.find((g) => g.id === group) ?? PALETTE_GROUPS[0]!).kinds;
  const win = useWindowClass();
  const lines = lineMap(blocks);
  const selectedBlock = selected ? getAt(blocks, selected) : undefined;

  const sensors = useSensors(
    useSensor(MousePenSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const add = (kind: BlockKind) => {
    const block = SPECS[kind].make();
    let next: Block[];
    let newPath: Path;
    if (selected && selectedBlock?.kind === 'repeat') {
      next = insertBlock(blocks, selected, selectedBlock.body.length, block);
      newPath = [...selected, selectedBlock.body.length];
    } else if (selected) {
      const parent = selected.slice(0, -1);
      const index = selected[selected.length - 1]! + 1;
      next = insertBlock(blocks, parent, index, block);
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
    onChange(removeBlock(blocks, path));
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

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as DragData | undefined) ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const from = e.active.data.current as DragData | undefined;
    const to = e.over?.data.current as SlotData | undefined;
    if (!from || !to || to.type !== 'slot') return;
    if (from.type === 'palette') {
      onChange(insertBlock(blocks, to.parent, to.index, SPECS[from.kind].make()));
      setSelected([...to.parent, to.index]);
      haptic('snap');
      return;
    }
    const moved = moveBlock(blocks, from.path, to.parent, to.index);
    if (!moved) return;
    setSelected(moved.path);
    if (JSON.stringify(moved.blocks) === JSON.stringify(blocks)) return;
    onChange(moved.blocks);
    haptic('snap');
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${(active.data.current as DragData | undefined)?.label ?? 'a'} block.`,
    onDragOver: ({ active, over }) => {
      const to = over?.data.current as SlotData | undefined;
      return to ? `${(active.data.current as DragData | undefined)?.label ?? 'Block'} block is over a place ${to.where}, position ${to.index + 1}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const to = over?.data.current as SlotData | undefined;
      const label = (active.data.current as DragData | undefined)?.label ?? 'Block';
      return to ? `Dropped ${label} block ${to.where}.` : `${label} block was put back.`;
    },
    onDragCancel: ({ active }) => `Dragging stopped. ${(active.data.current as DragData | undefined)?.label ?? 'The'} block was put back.`,
  };

  const blockedParent = dragging?.type === 'block' ? dragging.path : null;
  const slotDisabled = (parent: Path) => Boolean(blockedParent && isDescendant(parent, blockedParent));

  const renderList = (list: Block[], prefix: Path) => {
    const where = whereLabel(blocks, prefix);
    return (
      <ol className="block-list">
        {list.map((b, i) => {
          const path = [...prefix, i];
          const key = path.join('.');
          const spec = SPECS[b.kind];
          const isSelected = selected?.join('.') === key;
          const isRunning = runningLine !== null && lines.get(key) === runningLine;
          const n = 'n' in b ? b.n : null;
          const label = b.kind === 'note' ? noteLabel(b) : spec.label;
          const spokenValue = n !== null ? ` ${spec.number?.spoken ? spec.number.spoken(n) : valueText(spec, n)}` : '';
          const name = `${label}${spokenValue}${b.kind === 'color' ? ` ${b.color}` : ''}`;
          return (
            <li key={key} className="flex flex-col">
              <DropSlot parent={prefix} index={i} where={where} disabled={slotDisabled(prefix)} />
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={name}
                onClick={() => setSelected(isSelected ? null : path)}
                onKeyDown={(e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(isSelected ? null : path))}
                className={`block-pill ${isSelected ? 'is-selected' : ''} ${isRunning ? 'is-running' : ''}`}
                style={{ background: b.kind === 'note' ? noteColor(b.pitch) : spec.color }}
              >
                <DragHandle path={path} label={label} />
                <span className="block-glyph" aria-hidden="true">
                  {spec.glyph}
                </span>
                <span className="block-label text-[19px] font-black">{label}</span>
                {spec.number && n !== null && (
                  <span className="block-steppers ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                  <span className="flex gap-2 ml-auto">
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
                    <>
                      <DropSlot parent={path} index={0} where={whereLabel(blocks, path)} disabled={slotDisabled(path)} empty />
                      <p className="m-0 text-[15px] font-bold text-ink-3">{isSelected ? 'Now tap blocks to put them inside.' : 'Tap Repeat, then tap blocks to put inside.'}</p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
        <li>
          <DropSlot parent={prefix} index={list.length} where={where} disabled={slotDisabled(prefix)} />
        </li>
      </ol>
    );
  };

  const overlaySpec = dragging ? SPECS[dragging.type === 'palette' ? dragging.kind : (getAt(blocks, dragging.path)?.kind ?? 'forward')] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collide}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements }}
      autoScroll={{ threshold: { x: 0.1, y: 0.1 }, acceleration: 5 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="blocks-editor h-full min-h-0" data-dragging={dragging ? 'true' : 'false'}>
       <div className="blocks-inner">
        <div className="blocks-program px-4 py-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          {blocks.length ? (
            renderList(blocks, [])
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
              <p className="m-0 text-[22px] font-black">{win.coarse ? 'Drag a block here, or tap one' : 'Tap a block to start!'}</p>
              <p className="m-0 text-[16px] font-semibold text-ink-2">Try Forward, then press Run.</p>
              <DropSlot parent={[]} index={0} where="in your blocks" disabled={false} empty />
            </div>
          )}
        </div>
        <div className="blocks-palette border-t border-line bg-paper-2 px-4 py-4">
          <div className="palette-head flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="m-0 eyebrow">{selectedBlock?.kind === 'repeat' ? 'Adding inside Repeat' : 'Blocks'}</p>
            <div className="segmented" role="tablist" aria-label="Block groups">
              {PALETTE_GROUPS.map((g) => (
                <button key={g.id} type="button" role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)}>
                  {g.title}
                </button>
              ))}
            </div>
          </div>
          <div className="palette-grid" data-hscroll>
            {paletteKinds.map((kind) => (
              <PaletteTile key={kind} kind={kind} onAdd={add} />
            ))}
          </div>
        </div>
       </div>
      </div>
      <DragOverlay modifiers={[liftAboveFinger]} dropAnimation={win.reducedMotion ? null : { duration: 160 }}>
        {overlaySpec && (
          <div className="block-pill is-overlay" style={{ background: overlaySpec.color }}>
            <span className="block-glyph" aria-hidden="true">
              {overlaySpec.glyph}
            </span>
            <span className="text-[19px] font-black">{overlaySpec.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
