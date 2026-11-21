import type { StickerId } from '../gio/catalog';
import { moodFor, type GioMood } from '../gio/mood';
import { TurtleSprite } from './TurtleSprite';

export type BubbleKind = 'info' | 'success' | 'problem';

export interface BubbleMessage {
  kind: BubbleKind;
  text: string;
  /** Source line to jump to, for problems. */
  line?: number;
  /** Gio's face. Defaults from the kind; the kid-safe redirect sets 'calm'. */
  mood?: GioMood;
}

interface TurtleBubbleProps {
  message: BubbleMessage;
  onShowLine(line: number): void;
  /** Overrides the message's mood, e.g. while Gio is thinking or after the mood has faded. */
  mood?: GioMood;
  stickers?: readonly (StickerId | null)[];
}

export function TurtleBubble({ message, onShowLine, mood, stickers }: TurtleBubbleProps) {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <div className="w-11 h-11 shrink-0 mt-0.5" aria-hidden="true">
        <TurtleSprite mood={mood ?? moodFor(message)} stickers={stickers} />
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
          <button type="button" className="mt-1 inline-flex min-h-[48px] items-center text-[14px] font-extrabold underline underline-offset-4" onClick={() => onShowLine(message.line!)}>
            Show me line {message.line}
          </button>
        )}
      </div>
    </div>
  );
}
