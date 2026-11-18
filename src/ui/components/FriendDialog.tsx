import { useEffect, useRef } from 'react';
import type { Friend } from '../gio/catalog';
import { FriendPicture } from './gio/FriendArt';

/** A new friend arrives. Silent on purpose: Gio's bubble already told the story once, aloud. */
export function FriendDialog({ friend, onClose }: { friend: Friend; onClose(): void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      // The button is the only control in the dialog, so Tab stays on it.
      else if (e.key === 'Tab') {
        e.preventDefault();
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="friend-title">
      <div className="absolute inset-0 bg-[rgba(23,38,31,0.45)] backdrop-blur-[2px]" onClick={() => onClose()} aria-hidden="true" />
      <div className="friend-card relative w-full max-w-[380px] rounded-[28px] bg-white p-6 text-center shadow-[0_24px_60px_rgba(8,40,60,0.35)]">
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
    </div>
  );
}
