import { useRef } from 'react';
import type { Friend } from '../gio/catalog';
import { FriendPicture } from './gio/FriendArt';
import { Sheet } from './Sheet';
/** A new friend arrives. Silent on purpose: Gio's bubble already told the story once, aloud. */
export function FriendDialog({ friend, onClose }: { friend: Friend; onClose(): void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Sheet open variant="dialog" labelledBy="friend-title" onClose={onClose} initialFocus={buttonRef} className="sheet-white sheet-narrow">
      <div className="px-6 pb-6 pt-2 text-center sm:pt-6" data-sheet-header>
        <p className="m-0 text-[14px] font-extrabold uppercase tracking-wide text-[#08603e]">A new friend</p>
        <div className="mx-auto my-2 w-[150px]">
          <FriendPicture id={friend.id} size={150} />
        </div>
        <h2 id="friend-title" className="m-0 text-[28px] font-black text-ink">
          {friend.name} the {friend.species}
        </h2>
        <p className="mx-0 mb-5 mt-2 text-[17px] font-bold leading-snug text-ink-2">
          {friend.name} came to visit because you learned about {friend.idea.toLowerCase()}.
        </p>
        <button ref={buttonRef} type="button" className="btn btn-primary btn-lg w-full" onClick={() => onClose()}>
          Hi, {friend.name}!
        </button>
      </div>
    </Sheet>
  );
}
