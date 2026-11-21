import { useRef, type ReactNode } from 'react';
import { CONCEPTS, type Concept, type QuestAudience } from '../../logo/quests.js';
import type { StickerId } from '../gio/catalog';
import { friendById } from '../gio/catalog';
import { islandByKey, stageCount, stageNumber } from '../path/islands';
import { MAP_LINES, say } from '../path/lines';
import { GOLD_TO_MASTER } from '../path/state';
import { FriendPicture } from './gio/FriendArt';
import { StickerPicture } from './gio/StickerArt';
import { StarIcon } from './icons';
import { Sheet } from './Sheet';
import { TurtleSprite } from './TurtleSprite';

/** A moment worth stopping for: a unit mastered, an island sailed, a review or skill check finished, or Logo Master earned. */
export type Moment =
  | { kind: 'unit'; islandKey: string; unitIndex: number }
  | { kind: 'island'; islandKey: string; /** The island that opened because this one was sailed. */ opened: string | null; badge: Concept | null }
  | { kind: 'review'; islandKey: string; helped: boolean }
  /** A skill check ended. islandKey is the stage it was opening. */
  | { kind: 'skill'; islandKey: string; passed: boolean }
  /** The final stage was sailed. islandKey is that stage. */
  | { kind: 'master'; islandKey: string };

interface MasteryMomentProps {
  moment: Moment;
  mode: QuestAudience;
  shell: readonly (StickerId | null)[];
  /** The main button: carry on to the next stop. */
  onContinue(): void;
  onMap(): void;
  onClose(): void;
  /** Logo Master only: open the printable certificate. */
  onCertificate?(): void;
  /** Logo Master only: open Gio's garden. */
  onGarden?(): void;
}

const CONFETTI = ['#ffc93c', '#ec3f86', '#2b9bf4', '#12a36b', '#7a4cf0', '#ef5a4c'];

function Confetti() {
  // Lighter devices get half the pieces.
  const count = document.documentElement.dataset['perf'] === 'lite' ? 9 : 18;
  return (
    <div className="moment-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
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
export function MasteryMoment({ moment, mode, shell, onContinue, onMap, onClose, onCertificate, onGarden }: MasteryMomentProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  const island = islandByKey(moment.islandKey);
  const name = island?.name ?? 'the island';
  const lines = MAP_LINES[mode];
  const counter = (island?.key.length ?? 0) + (moment.kind === 'unit' ? moment.unitIndex : 0);

  let eyebrow = '';
  let title = '';
  let body = '';
  let extra: ReactNode = null;
  let primary = 'Keep going';
  let secondary = 'See the map';
  let primaryRun = moment.kind === 'review' ? onClose : onContinue;
  let secondaryRun = onMap;

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
          {moment.badge && <span className="text-[14px] font-black text-ink-2">{CONCEPTS[moment.badge].badge} badge</span>}
        </div>
      </div>
    );
  } else if (moment.kind === 'skill') {
    const stage = island ? stageNumber(island) : 0;
    eyebrow = 'Skill check';
    if (moment.passed) {
      title = `Stage ${stage} is open!`;
      body = stage > 2 ? `Stages 1 to ${stage - 1} are sailed or tested out.` : 'The stage before it is tested out.';
      primary = `Start Stage ${stage}`;
    } else {
      title = 'Not yet';
      body = 'A skill check has no hints, so it cannot be passed after using help. That is fine! Practise the stage with all the help you like, then try again.';
      primary = 'Practise';
    }
    extra = island && (
      <div className="flex justify-center">
        <FriendPicture id={island.resident} size={96} />
      </div>
    );
  } else if (moment.kind === 'master') {
    eyebrow = 'Logo Master';
    title = 'You are a Logo Master!';
    body = `You finished all ${stageCount(mode)} stages of Logo. Gio has a golden shell now, and your certificate is ready to print.`;
    primary = 'See my certificate';
    secondary = 'Gio\u2019s garden';
    primaryRun = onCertificate ?? onContinue;
    secondaryRun = onGarden ?? onMap;
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
    <Sheet open variant="page" labelledBy="moment-title" onClose={onClose} initialFocus={primaryRef} className="sheet-white moment-panel" overlay={<Confetti />}>
      <div className="relative mx-auto w-full max-w-[400px] p-6 text-center">
        <p className="m-0 text-[14px] font-extrabold uppercase tracking-wide text-[#08603e]">{eyebrow}</p>
        <div className="mx-auto my-1 h-[112px] w-[112px]" aria-hidden="true">
          <TurtleSprite mood="cheer" stickers={shell} golden={moment.kind === 'master'} />
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
          <button ref={primaryRef} type="button" className="btn btn-primary btn-lg w-full" onClick={primaryRun}>
            {primary}
          </button>
          <button type="button" className="btn btn-quiet w-full" onClick={secondaryRun}>
            {secondary}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
