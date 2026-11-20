import { NAMED_COLORS } from './colors.js';
import type { Expr, Program, Stmt } from './parser.js';

/**
 * The block language for Little Turtles: a small, friendly subset of Logo.
 * Blocks and Logo convert both ways, so blocks are always real Logo underneath.
 */
export type Block =
  | { kind: 'forward'; n: number }
  | { kind: 'back'; n: number }
  | { kind: 'right'; n: number }
  | { kind: 'left'; n: number }
  | { kind: 'penup' }
  | { kind: 'pendown' }
  | { kind: 'color'; color: string }
  | { kind: 'size'; n: number }
  | { kind: 'circle'; n: number }
  | { kind: 'note'; pitch: NotePitch; beats: 1 | 2 }
  | { kind: 'frame' }
  | { kind: 'wait'; n: number }
  | { kind: 'repeat'; n: number; body: Block[] };

export type BlockKind = Block['kind'];

/** The notes Little Turtles can play (R is a rest). */
export const NOTE_PITCHES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C5', 'R'] as const;
export type NotePitch = (typeof NOTE_PITCHES)[number];

export const BLOCK_COLORS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'black'] as const;

/** Commands Little Turtles' AI answers may use, described for the model. */
export const BLOCK_COMMANDS_HELP = [
  'FD n / BK n: move forward or back by a whole number of steps',
  'RT n / LT n: turn right or left by a whole number of degrees',
  'PU / PD: pen up, pen down',
  `SETPENCOLOR "name: one of ${BLOCK_COLORS.map((c) => `"${c}`).join(' ')}`,
  'SETPENSIZE n: pen thickness, 1 to 20',
  'CIRCLE n: a circle of radius n around the turtle',
  'PLAY [C D E]: play notes, one after another. Only C D E F G A B C5 and R (a rest) are allowed. A 2 after a note makes it last twice as long, like PLAY [E 2]',
  'FRAME: show the picture so far and hold it a moment, for a flip-book animation',
  'WAIT n: pause for n sixtieths of a second, so WAIT 60 is one second',
  'REPEAT n [ ... ]: repeat the commands inside n times (REPEAT can contain REPEAT)',
];

const literal = (e: Expr): number | null => (e.kind === 'num' && Number.isInteger(e.value) ? e.value : e.kind === 'neg' && e.expr.kind === 'num' && Number.isInteger(e.expr.value) ? -e.expr.value : null);

/** PLAY [C D E 2 R] as note blocks, or null when it uses anything blocks cannot show. */
function noteBlocks(arg: Expr): Block[] | null {
  if (arg.kind !== 'list' || arg.items.length === 0) return null;
  const out: Block[] = [];
  for (const item of arg.items) {
    if (item.kind === 'num') {
      const last = out[out.length - 1];
      if (last?.kind !== 'note' || last.beats !== 1 || (item.value !== 1 && item.value !== 2)) return null;
      last.beats = item.value;
      continue;
    }
    if (item.kind !== 'word') return null;
    const pitch = item.value.toUpperCase();
    if (!(NOTE_PITCHES as readonly string[]).includes(pitch)) return null;
    out.push({ kind: 'note', pitch: pitch as NotePitch, beats: 1 });
  }
  return out;
}

export type ToBlocksResult = { ok: true; blocks: Block[] } | { ok: false; reason: string };

/** Convert a parsed Logo program to blocks, if it only uses block commands with plain numbers. */
export function toBlocks(program: Program): ToBlocksResult {
  if (program.procedures.size) return { ok: false, reason: 'it teaches the turtle new commands with TO' };
  const convert = (stmts: Stmt[]): Block[] | string => {
    const out: Block[] = [];
    for (const s of stmts) {
      if (s.kind === 'repeat') {
        const n = literal(s.count);
        if (n === null) return 'a REPEAT uses a calculated number';
        const body = convert(s.body);
        if (typeof body === 'string') return body;
        out.push({ kind: 'repeat', n, body });
        continue;
      }
      if (s.kind !== 'command') return `it uses ${s.kind === 'make' ? 'MAKE' : s.kind === 'if' ? 'IF' : s.kind === 'stop' ? 'STOP' : s.kind === 'when' ? 'WHEN (that makes it a game)' : 'its own commands'}`;
      if (s.name === 'PLAY') {
        const notes = noteBlocks(s.args[0]!);
        if (!notes) return 'it plays notes blocks cannot show';
        out.push(...notes);
        continue;
      }
      const n = s.args[0] ? literal(s.args[0]) : null;
      const needNumber = (kind: 'forward' | 'back' | 'right' | 'left' | 'size' | 'circle' | 'wait'): Block | string =>
        n === null ? `${s.name} uses a calculated number` : { kind, n };
      let block: Block | string;
      switch (s.name) {
        case 'FORWARD': block = needNumber('forward'); break;
        case 'BACK': block = needNumber('back'); break;
        case 'RIGHT': block = needNumber('right'); break;
        case 'LEFT': block = needNumber('left'); break;
        case 'SETPENSIZE': block = needNumber('size'); break;
        case 'CIRCLE': block = needNumber('circle'); break;
        case 'WAIT': block = needNumber('wait'); break;
        case 'FRAME': block = { kind: 'frame' }; break;
        case 'SETTEMPO': block = 'it changes the tempo'; break;
        case 'PENUP': block = { kind: 'penup' }; break;
        case 'PENDOWN': block = { kind: 'pendown' }; break;
        case 'SETPENCOLOR': {
          const arg = s.args[0]!;
          const name = arg.kind === 'word' ? arg.value.toLowerCase() : null;
          block = name && (BLOCK_COLORS as readonly string[]).includes(name) ? { kind: 'color', color: name } : 'it uses a colour that has no block';
          break;
        }
        default:
          block = `it uses ${s.name}`;
      }
      if (typeof block === 'string') return block;
      out.push(block);
    }
    return out;
  };
  const result = convert(program.main);
  return typeof result === 'string' ? { ok: false, reason: result } : { ok: true, blocks: result };
}

/** Write blocks as tidy Logo, one command per line, with REPEAT bodies indented. */
export function blocksToLogo(blocks: Block[], depth = 0): string {
  const pad = '  '.repeat(depth);
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'forward': return `${pad}FD ${b.n}`;
        case 'back': return `${pad}BK ${b.n}`;
        case 'right': return `${pad}RT ${b.n}`;
        case 'left': return `${pad}LT ${b.n}`;
        case 'penup': return `${pad}PU`;
        case 'pendown': return `${pad}PD`;
        case 'color': return `${pad}SETPENCOLOR "${b.color}`;
        case 'size': return `${pad}SETPENSIZE ${b.n}`;
        case 'circle': return `${pad}CIRCLE ${b.n}`;
        case 'note': return `${pad}PLAY [${b.pitch}${b.beats === 2 ? ' 2' : ''}]`;
        case 'frame': return `${pad}FRAME`;
        case 'wait': return `${pad}WAIT ${b.n}`;
        case 'repeat': {
          if (!b.body.length) return `${pad}REPEAT ${b.n} [ ]`;
          return `${pad}REPEAT ${b.n} [\n${blocksToLogo(b.body, depth + 1)}\n${pad}]`;
        }
      }
    })
    .join('\n');
}

export function isBlockColor(name: string): boolean {
  return (BLOCK_COLORS as readonly string[]).includes(name) && NAMED_COLORS[name.toUpperCase()] !== undefined;
}
