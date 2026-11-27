import { useRef } from 'react';
import type { Friend } from '../gio/catalog';
import { FriendPicture } from './gio/FriendArt';
import { Sheet } from './Sheet';
import { localizeFriend } from '../../i18n/content.js';
import { useLang, useT } from '../lang';
/** A new friend arrives. Silent on purpose: Gio's bubble already told the story once, aloud. */
export function FriendDialog({ friend: source, onClose }: { friend: Friend; onClose(): void }) {
  const t = useT();
  const { lang } = useLang();
  const friend = localizeFriend(source, lang);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Sheet open variant="dialog" labelledBy="friend-title" onClose={onClose} initialFocus={buttonRef} className="sheet-white sheet-narrow">
      <div className="px-6 pb-6 pt-2 text-center sm:pt-6" data-sheet-header>
        <p className="m-0 text-[14px] font-extrabold uppercase tracking-wide text-[#08603e]">{t('friend.new')}</p>
        <div className="mx-auto my-2 w-[150px]">
          <FriendPicture id={friend.id} size={150} />
        </div>
        <h2 id="friend-title" className="m-0 text-[28px] font-black text-ink">
          {t('friend.title', { name: friend.name, species: friend.species })}
        </h2>
        <p className="mx-0 mb-5 mt-2 text-[17px] font-bold leading-snug text-ink-2">
          {t('friend.body', { name: friend.name, idea: friend.idea.toLowerCase() })}
        </p>
        <button ref={buttonRef} type="button" className="btn btn-primary btn-lg w-full" onClick={() => onClose()}>
          {t('friend.hi', { name: friend.name })}
        </button>
      </div>
    </Sheet>
  );
}
