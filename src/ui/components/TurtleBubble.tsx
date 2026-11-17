import { TurtleSprite } from './TurtleSprite';

export type BubbleKind = 'info' | 'success' | 'problem';

export interface BubbleMessage {
  kind: BubbleKind;
  text: string;
  /** Source line to jump to, for problems. */
  line?: number;
}

export function TurtleBubble({ message, onShowLine }: { message: BubbleMessage; onShowLine(line: number): void }) {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <div className="w-11 h-11 shrink-0 mt-0.5" aria-hidden="true">
        <TurtleSprite />
      </div>
      <div key={message.text} className={`bubble bubble-${message.kind} flex-1`}>
        {message.text
          .split('\n')
          .filter((l) => l.trim())
          .map((l, k) => (
            <p key={k} className={`m-0 ${k ? 'mt-1.5' : ''}`}>
              {l}
            </p>
          ))}
        {message.kind === 'problem' && message.line !== undefined && (
          <button type="button" className="mt-1 text-[14px] font-extrabold underline underline-offset-4" onClick={() => onShowLine(message.line!)}>
            Show me line {message.line}
          </button>
        )}
      </div>
    </div>
  );
}
