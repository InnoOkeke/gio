import { useRef, type ReactNode } from 'react';
import { CONCEPTS, type Concept, type QuestAudience } from '../../logo/quests.js';
import type { StickerId } from '../gio/catalog';
import { friendById } from '../gio/catalog';
import { islandByKey } from '../path/islands';
import { MAP_LINES, say } from '../path/lines';
import { GOLD_TO_MASTER } from '../path/state';
import { useDialog } from '../useDialog';
import { FriendPicture } from './gio/FriendArt';
import { StickerPicture } from './gio/StickerArt';
import { StarIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

/** A moment worth stopping for: a unit mastered, an island sailed, or a review finished. */
export type Moment =
  | { kind: 'unit'; islandKey: string; unitIndex: number }
  | { kind: 'island'; islandKey: string; /** The island that opened because this one was sailed. */ opened: string | null; badge: Concept | null }
  | { kind: 'review'; islandKey: string; helped: boolean };

interface MasteryMomentProps {
  moment: Moment;
  mode: QuestAudience;
  shell: readonly (StickerId | null)[];
  /** The main button: carry on to the next stop. */
  onContinue(): void;
  onMap(): void;
  onClose(): void;
}

const CONFETTI = ['#ffc93c', '#ec3f86', '#2b9bf4', '#12a36b', '#7a4cf0', '#ef5a4c'];

function Confetti() {
  return (
    <div className="moment-confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const reach = 120 + (i % 3) * 36;
        return (
          <span
            key={i}
            style={{
              background: CONFETTI[i % CONFETTI.length],
              ['--dx' as string]: `${Math.round(Math.cos(angle) * reach)}px`,
              ['--dy' as string]: `${Math.round(Math.sin(angle) * reach * 0.8 - 30)}px`,
              ['--rot' as string]: `${(i * 67) % 360}deg`,
              animationDelay: `${(i % 6) * 40}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The celebration. Silent on purpose, like FriendDialog: Gio's bubble already told the story once, aloud. */
export function MasteryMoment({ moment, mode, shell, onContinue, onMap, onClose }: MasteryMomentProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  useDialog(panelRef, primaryRef, onClose);

  const island = islandByKey(moment.islandKey);
  const name = island?.name ?? 'the island';
  const lines = MAP_LINES[mode];
  const counter = (island?.key.length ?? 0) + (moment.kind === 'unit' ? moment.unitIndex : 0);

  let eyebrow = '';
  let title = '';
  let body = '';
  let extra: ReactNode = null;
  let primary = 'Keep going';
  const secondary = 'See the map';

  if (moment.kind === 'unit') {
    eyebrow = 'Unit mastered';
    title = `Unit ${moment.unitIndex + 1} mastered!`;
    body = say(lines.unitMastered, counter);
    extra = (
      <div className="flex justify-center gap-2" aria-hidden="true">
        {Array.from({ length: GOLD_TO_MASTER }, (_, i) => (
          <StarIcon key={i} size={44} className="moment-star text-[#f5a700] drop-shadow-[0_3px_0_rgba(160,100,0,0.35)]" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
    );
  } else if (moment.kind === 'island') {
    const opened = moment.opened ? islandByKey(moment.opened) : undefined;
    eyebrow = 'Island sailed';
    title = `You sailed ${name}!`;
    body = [say(lines.islandSailed, counter, { island: name }), opened ? say(lines.opened, counter, { island: opened.name }) : ''].filter(Boolean).join(' ');
    primary = 'Sail on!';
    extra = island && (
      <div className="flex items-end justify-center gap-4">
        <FriendPicture id={island.resident} size={92} />
        <div className="flex flex-col items-center gap-1">
          <StickerPicture id={island.concept} size={64} className="moment-star" />
          {moment.badge && <span className="text-[13px] font-black text-ink-2">{CONCEPTS[moment.badge].badge} badge</span>}
        </div>
      </div>
    );
  } else {
    eyebrow = 'Review';
    title = moment.helped ? 'Nice visit!' : 'Review done!';
    body = say(moment.helped ? lines.reviewHelped : lines.reviewDone, counter, { island: name });
    primary = 'Done';
    extra = island && (
      <div className="flex justify-center">
        <FriendPicture id={island.resident} size={96} />
      </div>
    );
  }

  const friendLabel = island && moment.kind === 'island' ? friendById(island.resident).name : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="moment-title">
      <div className="absolute inset-0 bg-[rgba(23,38,31,0.5)] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="friend-card relative w-full max-w-[400px] rounded-[28px] bg-white p-6 text-center shadow-[0_24px_60px_rgba(8,40,60,0.35)]">
        <Confetti />
        <p className="m-0 text-[14px] font-extrabold uppercase tracking-wide text-[#08603e]">{eyebrow}</p>
        <div className="mx-auto my-1 h-[112px] w-[112px]" aria-hidden="true">
          <TurtleSprite mood="cheer" stickers={shell} />
        </div>
        <h2 id="moment-title" className="m-0 text-[28px] font-black leading-tight text-ink">
          {title}
        </h2>
        <p className="mx-0 mb-4 mt-2 text-[17px] font-bold leading-snug text-ink-2">{body}</p>
        {extra && (
          <div className="mb-5" role={friendLabel ? 'img' : undefined} aria-label={friendLabel ? `${friendLabel} and the ${CONCEPTS[island!.concept].badge} sticker` : undefined}>
            {extra}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <button ref={primaryRef} type="button" className="btn btn-primary btn-lg w-full" onClick={moment.kind === 'review' ? onClose : onContinue}>
            {primary}
          </button>
          <button type="button" className="btn btn-quiet w-full" onClick={onMap}>
            {secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
