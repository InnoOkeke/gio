import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StreamParser } from '@codemirror/language';
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { NAMED_COLORS, PRIMITIVES } from '../../logo/index.js';
import type { PrimitiveSpec } from '../../logo/primitives.js';

const COMMAND_WORDS = new Set(PRIMITIVES.flatMap((p) => [p.name, ...p.aliases]));
const CONTROL_WORDS = new Set(['REPEAT', 'IF', 'IFELSE', 'TO', 'END', 'MAKE', 'STOP', 'WHEN']);

/** Where the parser is relative to PLAY: right after the word, or inside its [ ] list of notes. */
interface LogoState {
  tune: 'none' | 'after-play' | 'inside';
}

/** The Logo stream parser. `extra` adds words that exist only in one place (Gio's Adventure), so the studio's list stays as it was. */
function makeParser(extra: ReadonlySet<string>): StreamParser<LogoState> {
  return {
  name: 'logo',
  startState: () => ({ tune: 'none' }),
  copyState: (s) => ({ ...s }),
  token(stream, state) {
    if (stream.eatSpace()) return null;
    if (state.tune === 'inside') {
      if (stream.match(']')) {
        state.tune = 'none';
        return 'bracket';
      }
      // Notes such as C, F#, Bb3 and R read as words of the tune.
      if (stream.match(/^[A-Ga-gRr](#|b)?\d?(?![A-Za-z0-9_.?])/)) return 'string';
    } else if (state.tune === 'after-play') {
      state.tune = stream.match('[') ? 'inside' : 'none';
      if (state.tune === 'inside') return 'bracket';
    }
    if (stream.match(';')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^\d*\.?\d+/)) return 'number';
    if (stream.match(/^:[A-Za-z0-9_.?]+/)) return 'variableName';
    if (stream.match(/^"[A-Za-z0-9_.?!,'&@#]+/)) return 'string';
    if (stream.match(/^[[\]()]/)) return 'bracket';
    if (stream.match(/^[+\-*/<>=]/)) return 'operator';
    const word = stream.match(/^[A-Za-z_][A-Za-z0-9_.?]*/) as RegExpMatchArray | null;
    if (word) {
      const upper = word[0].toUpperCase();
      if (upper === 'PLAY') state.tune = 'after-play';
      if (CONTROL_WORDS.has(upper)) return 'keyword';
      if (COMMAND_WORDS.has(upper) || extra.has(upper)) return 'atom';
      return 'def';
    }
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: ';' } },
  };
}

export const logoHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#7a4cf0', fontWeight: '800' },
  { tag: t.atom, color: '#0b7a4f', fontWeight: '800' },
  { tag: t.definition(t.variableName), color: '#c2410c', fontWeight: '700' },
  { tag: t.number, color: '#1e6fd9', fontWeight: '700' },
  { tag: t.variableName, color: '#c2410c', fontWeight: '700' },
  { tag: t.string, color: '#b4236b', fontWeight: '700' },
  { tag: t.comment, color: '#8b8574', fontStyle: 'italic' },
  { tag: t.bracket, color: '#7a4cf0', fontWeight: '800' },
  { tag: t.operator, color: '#44554c' },
]);

function logoCompletions(extra: readonly PrimitiveSpec[]) {
  return (context: CompletionContext): CompletionResult | null => completeLogo(context, extra);
}
function completeLogo(context: CompletionContext, extra: readonly PrimitiveSpec[]): CompletionResult | null {
  const color = context.matchBefore(/"[A-Za-z]*/);
  if (color) {
    return {
      from: color.from + 1,
      options: Object.keys(NAMED_COLORS).map((c) => ({ label: c.toLowerCase(), type: 'constant', detail: 'colour' })),
    };
  }
  const word = context.matchBefore(/[A-Za-z]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const options = [
    ...[...PRIMITIVES, ...extra].map((p) => ({
      label: p.name.toLowerCase(),
      type: p.kind === 'reporter' ? 'variable' : 'function',
      detail: p.aliases.length ? p.aliases.join(', ').toLowerCase() : undefined,
      info: p.help,
    })),
    { label: 'repeat', type: 'keyword', info: 'REPEAT 4 [FD 50 RT 90] does the commands in [ ] 4 times' },
    { label: 'to', type: 'keyword', info: 'TO name … END teaches the turtle a new command' },
    { label: 'end', type: 'keyword', info: 'Finishes a TO command' },
    { label: 'make', type: 'keyword', info: 'MAKE "size 50 stores a value you can use as :size' },
    { label: 'if', type: 'keyword', info: 'IF :size > 50 [ … ] does the commands only when it is true' },
    { label: 'ifelse', type: 'keyword', info: 'IFELSE question [yes] [no]' },
    { label: 'stop', type: 'keyword', info: 'Stops the current command' },
    { label: 'when', type: 'keyword', info: 'WHEN "up [FD 10] runs the commands each time the up arrow is pressed (games!)' },
  ];
  return { from: word.from, options, validFor: /^[A-Za-z]*$/ };
}

/* ---- Line highlights: the line the turtle is running, and the line with a problem ---- */

export const setRunningLine = StateEffect.define<number | null>();
export const setProblemLine = StateEffect.define<number | null>();

const runningDeco = Decoration.line({ class: 'cm-running-line' });
const problemDeco = Decoration.line({ class: 'cm-problem-line' });

function lineField(effect: typeof setRunningLine, deco: Decoration) {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
      let next = value.map(tr.changes);
      for (const e of tr.effects) {
        if (!e.is(effect)) continue;
        const line = e.value;
        if (line === null || line < 1 || line > tr.state.doc.lines) {
          next = Decoration.none;
        } else {
          next = Decoration.set([deco.range(tr.state.doc.line(line).from)]);
        }
      }
      // Editing clears the problem marker so it never points at the wrong line.
      if (effect === setProblemLine && tr.docChanged) next = Decoration.none;
      return next;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

/** The running-line and problem-line markers, shared with the Python editor. */
export function lineHighlights(): Extension {
  return [lineField(setRunningLine, runningDeco), lineField(setProblemLine, problemDeco)];
}
export interface LogoLanguageOptions {
  /** Words that exist only in this editor (Gio's Adventure words), highlighted and completed like commands. */
  words?: readonly PrimitiveSpec[];
}
export function logoLanguage(options: LogoLanguageOptions = {}): Extension {
  const words = options.words ?? [];
  const extra = new Set(words.flatMap((p) => [p.name, ...p.aliases]));
  return [
    StreamLanguage.define(makeParser(extra)),
    syntaxHighlighting(logoHighlight),
    autocompletion({ override: [logoCompletions(words)], icons: false }),
    lineHighlights(),
  ];
}
