import { haptic } from '../haptics';
import type { AdventureKey } from './keys';
import { useT } from '../lang';

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
  const t = useT();
  const keep = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div className="adv-keys" role="toolbar" aria-label={t('adv.keys')} onPointerDown={keep} onMouseDown={keep}>
      {keys.map((key) => (
        <button
          key={key.id}
          type="button"
          className="adv-key"
          aria-label={t('adv.keyType', { label: key.label, hint: key.word ? t('adv.key.word', { w: key.word }) : t(`adv.key.${key.hintId}`) })}
          onClick={() => {
            haptic('tap');
            onKey(key);
          }}
        >
          {key.label}
        </button>
      ))}
      <button type="button" className="adv-key adv-key-go" aria-label={t('adv.goAria')} onClick={onGo}>
        {t('adv.go')}
      </button>
    </div>
  );
}
