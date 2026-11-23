import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder } from '@codemirror/view';
import { logoLanguage, setProblemLine, setRunningLine } from './logo-language';
import { inlineInsertion } from './key-row';

/** Height of the on-screen command key row, written by CommandKeyRow as --key-row-h. */
function keyRowHeight(): number {
  return Number.parseFloat(document.documentElement.style.getPropertyValue('--key-row-h')) || 0;
}

export interface LogoEditorHandle {
  /** Replace the whole program as one undoable change. */
  replaceAll(code: string): void;
  /** Insert a snippet at the cursor on its own line, placing the cursor after it. */
  insert(snippet: string): void;
  /** Type text at the caret without starting a new line (digits, brackets); keeps focus. */
  insertInline(text: string): void;
  focus(): void;
  setRunningLine(line: number | null): void;
  setProblemLine(line: number | null): void;
  undo(): void;
}

interface LogoEditorProps {
  initialCode: string;
  onChange(code: string): void;
  onRunShortcut(): void;
  onFocusChange?(focused: boolean): void;
  /** Gio's Adventure gives the editor its own words. The studio leaves this out. */
  language?: Extension;
  /** Text shown in an empty editor. */
  hint?: string;
}

export const LogoEditor = forwardRef<LogoEditorHandle, LogoEditorProps>(function LogoEditor(
  { initialCode, onChange, onRunShortcut, onFocusChange, language, hint },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRunShortcut);
  onChangeRef.current = onChange;
  onRunRef.current = onRunShortcut;
  const onFocusRef = useRef(onFocusChange);
  onFocusRef.current = onFocusChange;

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          placeholder(hint ?? 'Type Logo here, like  FD 100  RT 90 …'),
          keymap.of([
            { key: 'Mod-Enter', run: () => (onRunRef.current(), true) },
            { key: 'Escape', run: (v) => (v.contentDOM.blur(), true) },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          language ?? logoLanguage(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Logo code', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', enterkeyhint: 'enter', inputmode: 'text' }),
          EditorView.scrollMargins.of(() => ({ bottom: keyRowHeight() + 16 })),
          EditorView.domEventHandlers({
            focus: () => void onFocusRef.current?.(true),
            blur: () => void onFocusRef.current?.(false),
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    // When the on-screen keyboard opens or closes, keep the caret line above the key row.
    const vv = window.visualViewport;
    const keepCaretVisible = () => {
      if (!view.hasFocus) return;
      requestAnimationFrame(() => view.dispatch({ effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: 'nearest', yMargin: keyRowHeight() + 16 }) }));
    };
    view.contentDOM.addEventListener('focus', keepCaretVisible);
    vv?.addEventListener('resize', keepCaretVisible);
    return () => {
      view.contentDOM.removeEventListener('focus', keepCaretVisible);
      vv?.removeEventListener('resize', keepCaretVisible);
      view.destroy();
      viewRef.current = null;
    };
    // Created once on mount; later code changes go through the imperative handle.
  }, []);

  useImperativeHandle(ref, () => ({
    replaceAll(code) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code }, selection: { anchor: code.length } });
    },
    insert(snippet) {
      const view = viewRef.current;
      if (!view) return;
      const { state } = view;
      const pos = state.selection.main.head;
      const line = state.doc.lineAt(pos);
      const onEmptyLine = line.text.trim() === '';
      const before = onEmptyLine || pos === line.from ? '' : pos === line.to ? '\n' : ' ';
      const text = `${before}${snippet}`;
      const caretInBrackets = snippet.endsWith('[ ]') ? text.length - 2 : text.length;
      view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + caretInBrackets }, scrollIntoView: true });
      view.focus();
    },
    insertInline(text) {
      const view = viewRef.current;
      if (!view) return;
      const pos = view.state.selection.main.head;
      const r = inlineInsertion(text, pos > 0 ? view.state.sliceDoc(pos - 1, pos) : '');
      view.dispatch({ changes: { from: pos, insert: r.text }, selection: { anchor: pos + r.caret }, scrollIntoView: true });
    },
    focus() {
      viewRef.current?.focus();
    },
    setRunningLine(line) {
      viewRef.current?.dispatch({ effects: setRunningLine.of(line) });
    },
    setProblemLine(line) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ effects: setProblemLine.of(line) });
      if (line !== null && line >= 1 && line <= view.state.doc.lines) {
        view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.line(line).from, { y: 'center' }) });
      }
    },
    undo() {
      const view = viewRef.current;
      if (view) undo(view);
    },
  }));

  return <div ref={hostRef} className="editor-host h-full min-h-[240px] overflow-hidden" />;
});
