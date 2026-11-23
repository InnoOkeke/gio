import { haptic } from '../haptics';
import type { AdventureKey } from './keys';

interface AdventureKeysProps {
  keys: AdventureKey[];
  onKey(key: AdventureKey): void;
  /** Run the plan: shown as a key only while the on-screen keyboard hides the action dock. */
  onGo(): void;
}

/**
 * The command keys for the plan: big, wrapping, never scrolling sideways. A tap types the command at the
 * caret, so a child can build a plan without the on-screen keyboard. Only the words the level allows are here.
 */
export function AdventureKeys({ keys, onKey, onGo }: AdventureKeysProps) {
  // Pressing a key must not take focus from the editor, or the keyboard would close.
  const keep = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div className="adv-keys" role="toolbar" aria-label="Command keys" onPointerDown={keep} onMouseDown={keep}>
      {keys.map((key) => (
        <button
          key={key.id}
          type="button"
          className="adv-key"
          aria-label={`Type ${key.label}: ${key.hint}`}
          onClick={() => {
            haptic('tap');
            onKey(key);
          }}
        >
          {key.label}
        </button>
      ))}
      <button type="button" className="adv-key adv-key-go" aria-label="Go: run the plan" onClick={onGo}>
        Go
      </button>
    </div>
  );
}
