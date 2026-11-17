import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder } from '@codemirror/view';
import { logoLanguage, setProblemLine, setRunningLine } from './logo-language';

export interface LogoEditorHandle {
  /** Replace the whole program as one undoable change. */
  replaceAll(code: string): void;
  /** Insert a snippet at the cursor on its own line, placing the cursor after it. */
  insert(snippet: string): void;
  focus(): void;
  setRunningLine(line: number | null): void;
  setProblemLine(line: number | null): void;
  undo(): void;
}

interface LogoEditorProps {
  initialCode: string;
  onChange(code: string): void;
  onRunShortcut(): void;
}

export const LogoEditor = forwardRef<LogoEditorHandle, LogoEditorProps>(function LogoEditor(
  { initialCode, onChange, onRunShortcut },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRunShortcut);
  onChangeRef.current = onChange;
  onRunRef.current = onRunShortcut;

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
          placeholder('Type Logo here, like  FD 100  RT 90 …'),
          keymap.of([
            { key: 'Mod-Enter', run: () => (onRunRef.current(), true) },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          logoLanguage(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Logo code', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
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
