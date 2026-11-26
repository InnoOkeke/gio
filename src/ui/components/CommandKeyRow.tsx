import { useEffect, useMemo, useRef } from 'react';
import { haptic } from '../haptics';
import { useLang, useT } from '../lang';
import { KEY_ROW, keyRowFor, wordSnippet, type KeyRowKey } from '../editor/key-row';
import type { LogoEditorHandle } from '../editor/LogoEditor';
import '../responsive/keyboard.css';

const RUN_KEY = KEY_ROW.find((k) => k.kind === 'run')!;

/** What a key does: Run runs, digits and brackets type inline, command words start their own line. */
export function applyKey(key: KeyRowKey, editor: LogoEditorHandle | null, run: () => void): void {
  if (key.kind === 'run') run();
  else if (key.kind === 'inline') editor?.insertInline(key.insert ?? '');
  else editor?.insert(wordSnippet(key));
}

interface CommandKeyRowProps {
  visible: boolean;
  onKey(key: KeyRowKey): void;
}

/**
 * A row of big command keys above the on-screen keyboard. Pressing a key must not take focus away
 * from the editor, or the keyboard would close: pointer and mouse down are cancelled.
 * The row's height is published as --key-row-h so the editor can keep the caret line above it.
 */
export function CommandKeyRow({ visible, onKey }: CommandKeyRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const t = useT();
  const keys = useMemo(() => keyRowFor(lang, t), [lang, t]);

  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !ref.current) {
      root.style.removeProperty('--key-row-h');
      return undefined;
    }
    const el = ref.current;
    const publish = () => root.style.setProperty('--key-row-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--key-row-h');
    };
  }, [visible]);

  if (!visible) return null;
  const keep = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div ref={ref} className="key-row" role="toolbar" aria-label={t('keys.toolbar')} onPointerDown={keep} onMouseDown={keep}>
      <div className="key-row-scroll" data-hscroll>
        {keys.filter((k) => k.kind !== 'run').map((key) => (
          <button
            key={key.id}
            type="button"
            className="key-row-key"
            aria-label={t('keys.type', { label: key.label, hint: key.hint })}
            onClick={() => {
              haptic('tap');
              onKey(key);
            }}
          >
            {key.label}
          </button>
        ))}
      </div>
      <button type="button" className="key-row-key is-run" aria-label={t('keys.runAria')} onClick={() => onKey(RUN_KEY)}>
        {t('btn.run')}
      </button>
    </div>
  );
}
