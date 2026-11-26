import { useMemo, useState } from 'react';
import { NAMED_COLORS } from '../../logo/index.js';
import { localizeSource, wordIn } from '../../logo/words.js';
import { useLang, useT } from '../lang';
import { useWindowClass } from '../responsive/useWindowClass';

interface Snippet {
  /** The English code; shown and inserted in the child's language. */
  code: string;
  hint: string;
}

const GROUPS: { id: string; snippets: Snippet[] }[] = [
  {
    id: 'move',
    snippets: [
      { code: 'FD 50', hint: 'shelf.hint.forward' },
      { code: 'BK 50', hint: 'shelf.hint.back' },
    ],
  },
  {
    id: 'turn',
    snippets: [
      { code: 'RT 90', hint: 'shelf.hint.right' },
      { code: 'LT 90', hint: 'shelf.hint.left' },
    ],
  },
  {
    id: 'pen',
    snippets: [
      { code: 'PU', hint: 'shelf.hint.penup' },
      { code: 'PD', hint: 'shelf.hint.pendown' },
      { code: 'SETPENSIZE 5', hint: 'shelf.hint.size' },
    ],
  },
  {
    id: 'magic',
    snippets: [
      { code: 'REPEAT 4 [ ]', hint: 'shelf.hint.repeat' },
      { code: 'CIRCLE 40', hint: 'shelf.hint.circle' },
      { code: 'FILL', hint: 'shelf.hint.fill' },
    ],
  },
  {
    id: 'music',
    snippets: [
      { code: 'PLAY [C D E]', hint: 'shelf.hint.play3' },
      { code: 'PLAY [C E G 2]', hint: 'shelf.hint.playLong' },
      { code: 'SETTEMPO 90', hint: 'shelf.hint.tempo' },
    ],
  },
  {
    id: 'movie',
    snippets: [
      { code: 'FRAME', hint: 'shelf.hint.frame' },
      { code: 'WAIT 30', hint: 'shelf.hint.wait' },
      { code: 'CLEAN', hint: 'shelf.hint.clean' },
    ],
  },
  {
    id: 'game',
    snippets: [{ code: 'WHEN "up [ ]', hint: 'shelf.hint.when' }],
  },
];

const SWATCHES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'black'];

export function CommandShelf({ onInsert }: { onInsert(code: string): void }) {
  // On phones the groups become a swipeable tab strip so the shelf stays one short row.
  const compact = useWindowClass().widthClass === 'compact';
  const { lang } = useLang();
  const t = useT();
  const [tab, setTab] = useState(GROUPS[0]!.id);
  const shown = (id: string) => !compact || tab === id;
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, snippets: g.snippets.map((s) => ({ code: localizeSource(s.code, lang), hint: s.hint })) })),
    [lang],
  );
  const colourWord = wordIn(lang, 'SETPENCOLOR');
  return (
    <div className="command-shelf flex flex-col gap-3 px-4 py-4 border-t border-line bg-paper-2 rounded-b-[28px] lg:min-h-0 lg:overflow-y-auto">
      {compact && (
        <div className="shelf-tabs" role="tablist" aria-label={t('shelf.groups')} data-hscroll>
          {[...GROUPS.map((g) => g.id), 'colours'].map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className="chip" onClick={() => setTab(id)}>
              {t(`shelf.group.${id}`)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {groups.filter((group) => shown(group.id)).map((group) => (
          <div key={group.id} className="flex flex-col gap-1.5">
            <span className="eyebrow">{t(`shelf.group.${group.id}`)}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.snippets.map((s) => (
                <button key={s.code} type="button" className="chip" title={t(s.hint)} aria-label={t('shelf.insert', { code: s.code, hint: t(s.hint) })} onClick={() => onInsert(s.code)}>
                  {s.code}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5" hidden={!shown('colours')}>
        <span className="eyebrow">{t('shelf.group.colours')}</span>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((name) => (
            <button
              key={name}
              type="button"
              className="swatch"
              style={{ backgroundColor: NAMED_COLORS[name.toUpperCase()] }}
              title={`${colourWord} "${name}`}
              aria-label={t('shelf.insertColour', { name })}
              onClick={() => onInsert(`${colourWord} "${name}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}