import { useMemo, useState, type ReactNode } from 'react';
import { check, toText, translate, type TargetLanguage, type Translation } from '../../logo/index.js';

const KEYWORDS: Record<TargetLanguage, RegExp> = {
  python: /^(from|import|def|for|in|range|if|else|return|global|pass|raise|while|and|or|not|True|False)$/,
  javascript: /^(function|for|let|const|if|else|return|while|throw|true|false)$/,
};

const TOKEN = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)|(\S)/g;

function highlight(text: string, language: TargetLanguage): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [whole, comment, str, num, call, word] = m;
    const key = `${at}`;
    if (comment) out.push(<span key={key} className="text-[#8b8574] italic">{whole}</span>);
    else if (str) out.push(<span key={key} className="text-[#b4236b] font-bold">{whole}</span>);
    else if (num) out.push(<span key={key} className="text-[#1e6fd9] font-bold">{whole}</span>);
    else if (call) out.push(<span key={key} className={KEYWORDS[language].test(call) ? 'text-[#7a4cf0] font-extrabold' : 'text-[#0b7a4f] font-extrabold'}>{whole}</span>);
    else if (word) out.push(<span key={key} className={KEYWORDS[language].test(word) ? 'text-[#7a4cf0] font-extrabold' : 'text-[#c2410c] font-bold'}>{whole}</span>);
    else out.push(whole);
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const CONCEPTS: Record<TargetLanguage, { logo: string; other: string; idea: string }[]> = {
  python: [
    { logo: 'REPEAT 4 [ ]', other: 'for i in range(4):', idea: 'a loop' },
    { logo: 'TO SQUARE … END', other: 'def square():', idea: 'a function' },
    { logo: 'MAKE "size 50', other: 'size = 50', idea: 'a variable' },
    { logo: 'IF :x > 5 [ ]', other: 'if x > 5:', idea: 'a decision' },
  ],
  javascript: [
    { logo: 'REPEAT 4 [ ]', other: 'for (let i = 0; i < 4; i++) { }', idea: 'a loop' },
    { logo: 'TO SQUARE … END', other: 'function square() { }', idea: 'a function' },
    { logo: 'MAKE "size 50', other: 'let size = 50;', idea: 'a variable' },
    { logo: 'IF :x > 5 [ ]', other: 'if (x > 5) { }', idea: 'a decision' },
  ],
};

interface TranslatedCodeProps {
  language: TargetLanguage;
  logo: string;
  runningLine: number | null;
  /** The line of this Python that a Python run is on (numbered as shown here). */
  pythonLine?: number | null;
  onCopied(): void;
}

/** Read-only view of the current Logo program in Python or JavaScript, with lines linked back to Logo. */
export function TranslatedCode({ language, logo, runningLine, pythonLine = null, onCopied }: TranslatedCodeProps) {
  const [picked, setPicked] = useState<number | null>(null);

  const result = useMemo((): { ok: true; t: Translation } | { ok: false; line: number } | { ok: 'empty' } => {
    if (!logo.trim()) return { ok: 'empty' };
    const parsed = check(logo);
    if (!parsed.ok) return { ok: false, line: parsed.problem.line };
    return { ok: true, t: translate(parsed.program, logo, language) };
  }, [logo, language]);

  const name = language === 'python' ? 'Python' : 'JavaScript';
  const logoLines = logo.split('\n');

  if (result.ok === 'empty') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-[17px] font-extrabold text-ink">Your {name} will appear here</p>
        <p className="text-[15px] font-semibold text-ink-2">Write some Logo, or ask the turtle to draw something, and I'll show you the same program in {name}.</p>
        <ConceptTable language={language} />
      </div>
    );
  }

  if (result.ok === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-[17px] font-extrabold text-ink">Fix the Logo first</p>
        <p className="text-[15px] font-semibold text-ink-2">
          There's a problem on Logo line {result.line}. Once the Logo works, I can turn it into {name}.
        </p>
      </div>
    );
  }

  const lines = result.t.lines;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText(result.t));
      onCopied();
    } catch {
      /* Clipboard can be blocked; the code is still selectable. */
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-paper-2 border-b border-line">
        <p className="m-0 text-[14px] font-bold text-ink-2">
          {language === 'python' ? 'Runs in real Python with its turtle module.' : 'How the same program looks in JavaScript.'}
        </p>
        <button type="button" className="btn btn-quiet min-h-[36px] coarse:min-h-touch px-3 text-[14px]" onClick={() => void copy()}>
          Copy
        </button>
      </div>
      <ol className="flex-1 min-h-0 overflow-auto m-0 py-3 list-none font-mono text-[16px] leading-[1.7] coarse:flex coarse:flex-col coarse:gap-2" aria-label={`${name} code`}>
        {lines.map((l, k) => {
          const running = (runningLine !== null && l.src === runningLine) || (pythonLine !== null && k + 1 === pythonLine);
          const isPicked = picked !== null && l.src === picked;
          return (
            <li key={k} className="flex">
              <span className="w-12 shrink-0 pr-3 text-right select-none text-[#b3ab99] font-bold">{k + 1}</span>
              <button
                type="button"
                disabled={l.src === undefined}
                onClick={() => setPicked(l.src ?? null)}
                className={`flex-1 text-left whitespace-pre pr-4 coarse:min-h-touch border-0 bg-transparent font-mono text-[16px] cursor-pointer disabled:cursor-default ${
                  running ? 'bg-[rgba(255,201,60,0.35)] shadow-[inset_4px_0_0_#ffc93c]' : isPicked ? 'bg-[#e3f2ff] shadow-[inset_4px_0_0_#2b9bf4]' : ''
                }`}
              >
                {l.text ? highlight(l.text, language) : '\u00a0'}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="px-4 py-3 border-t border-line bg-paper-2 min-h-[56px] flex items-center" aria-live="polite">
        {picked !== null ? (
          <p className="m-0 text-[14px] font-bold text-ink-2">
            This came from Logo line {picked}: <code className="font-mono font-extrabold text-ink">{logoLines[picked - 1]?.trim()}</code>
          </p>
        ) : (
          <p className="m-0 text-[14px] font-semibold text-ink-3">Tap a line to see which Logo line it came from.</p>
        )}
      </div>
    </div>
  );
}

function ConceptTable({ language }: { language: TargetLanguage }) {
  return (
    <table className="mt-3 text-left text-[14px] border-separate border-spacing-y-1.5">
      <tbody>
        {CONCEPTS[language].map((c) => (
          <tr key={c.idea}>
            <td className="pr-3 font-mono font-extrabold text-[#0b7a4f] whitespace-nowrap">{c.logo}</td>
            <td className="pr-3 text-ink-3 font-bold">→</td>
            <td className="pr-3 font-mono font-extrabold text-ink whitespace-nowrap">{c.other}</td>
            <td className="text-ink-3 font-semibold whitespace-nowrap">{c.idea}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
