import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder } from '@codemirror/view';
import { lineHighlights, logoHighlight, setProblemLine, setRunningLine } from './logo-language';

export interface PythonEditorHandle {
  /** Replace the whole program as one undoable change. */
  replaceAll(code: string): void;
  focus(): void;
  setRunningLine(line: number | null): void;
  setProblemLine(line: number | null): void;
  undo(): void;
}

interface PythonEditorProps {
  initialCode: string;
  onChange(code: string): void;
  onRunShortcut(): void;
}

/** The child's own Python. Loaded lazily so CodeMirror's Python support stays out of the main bundle. */
export const PythonEditor = forwardRef<PythonEditorHandle, PythonEditorProps>(function PythonEditor({ initialCode, onChange, onRunShortcut }, ref) {
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
          placeholder('Type Python here, like  forward(100)'),
          keymap.of([
            { key: 'Mod-Enter', run: () => (onRunRef.current(), true) },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          python(),
          syntaxHighlighting(logoHighlight),
          lineHighlights(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Python code', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
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

export default PythonEditor;
