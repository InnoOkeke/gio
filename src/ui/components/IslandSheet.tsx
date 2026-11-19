import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { CONCEPTS } from '../../logo/quests.js';
import { friendById } from '../gio/catalog';
import { islandByKey, questById, stageCount, stageNumber } from '../path/islands';
import type { SkillChallenge } from '../path/skill';
import { MASTER_RULE, UNIT_TIME, reviewInvite, say, MAP_LINES } from '../path/lines';
import { GOLD_TO_MASTER, type IslandView, type QuestView, type UnitView } from '../path/state';
import { FriendPicture } from './gio/FriendArt';
import { IslandArt } from './IslandArt';
import { LockIcon, StarIcon } from './icons';

interface IslandSheetProps {
  view: IslandView;
  /** The island before this one, so a locked island can send the child there. */
  previous: IslandView | null;
  /** The resident friend has been met. */
  met: boolean;
  /** The quest "Go!" would start, when it is on this island. */
  nextQuestId: string | null;
  /** A review of this island is waiting. */
  reviewWaiting: boolean;
  /** The challenges of a skill check that opens this stage. Empty when it cannot be skipped to. */
  skill: readonly SkillChallenge[];
  /** The Logo Master certificate is earned in this mode. */
  certificate: boolean;
  onPlay(questId: string): void;
  onReview(): void;
  onGoTo(islandKey: string): void;
  onSkip(): void;
}

function Star({ star, size = 30 }: { star: QuestView['star']; size?: number }): ReactElement {
  if (star === 'clean') return <StarIcon size={size} className="text-[#f5a700] drop-shadow-[0_2px_0_rgba(160,100,0,0.35)]" />;
  if (star === 'helped') return <StarIcon size={size} className="text-[#8796a3] drop-shadow-[0_2px_0_rgba(60,70,80,0.25)]" />;
  return <span aria-hidden="true" className="block rounded-full border-[3px] border-dashed border-[#c9c0ad]" style={{ width: size - 4, height: size - 4 }} />;
}

function stateWords(q: QuestView): string {
  if (q.status === 'locked') return 'locked';
  if (q.star === 'clean') return 'gold star';
  if (q.star === 'helped') return 'silver star, you can try again for gold';
  return 'ready to play';
}

function Tile({ q, position, bonus, isNext, color, onPlay }: { q: QuestView; position: number; bonus: boolean; isNext: boolean; color: string; onPlay(id: string): void }) {
  const quest = questById(q.id);
  const locked = q.status === 'locked';
  const caption = q.star === 'helped' ? 'Try for gold' : q.star === 'clean' ? 'Gold' : bonus ? 'Bonus' : locked ? '' : isNext ? 'Next' : '';
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onPlay(q.id)}
      aria-label={`${bonus ? 'Bonus quest' : `Quest ${position}`}: ${quest?.title ?? q.id}, ${stateWords(q)}`}
      className={`qtile ${isNext ? 'is-next' : ''}`}
      data-state={locked ? 'locked' : (q.star ?? 'open')}
      style={isNext ? { borderColor: color } : undefined}
    >
      <span className="flex h-[34px] items-center justify-center">{locked ? <LockIcon size={26} className="text-[#a79f8c]" /> : <Star star={q.star} />}</span>
      <span className="block text-[14px] font-black leading-tight text-ink">{quest?.title ?? q.id}</span>
      <span className="block min-h-[16px] text-[12px] font-extrabold" style={{ color: q.star === 'helped' ? '#4f5e69' : isNext ? '#08603e' : '#66756d' }}>
        {caption}
      </span>
    </button>
  );
}

function Unit({ unit, number, color, nextQuestId, onPlay }: { unit: UnitView; number: number; color: string; nextQuestId: string | null; onPlay(id: string): void }) {
  const gold = Math.min(unit.gold, GOLD_TO_MASTER);
  const lockedUnit = unit.status === 'locked';
  return (
    <section aria-label={`Unit ${number}`} className={`rounded-[24px] border border-line bg-white p-4 shadow-[var(--shadow-1)] ${lockedUnit ? 'opacity-90' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h4 className="m-0 text-[17px] font-black text-ink">Unit {number}</h4>
        <div className="flex items-center gap-2" role="img" aria-label={`${gold} of ${GOLD_TO_MASTER} gold stars${unit.mastered ? ', unit mastered' : ''}`}>
          {Array.from({ length: GOLD_TO_MASTER }, (_, i) => (
            <span key={i} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full" style={{ background: i < gold ? '#fff0c2' : '#f2eee4' }}>
              <StarIcon size={18} className={i < gold ? 'text-[#f5a700]' : 'text-[#d6cebd]'} />
            </span>
          ))}
          {unit.mastered && <span className="rounded-full bg-[#e1f7ec] px-2.5 py-1 text-[12px] font-black text-[#08603e]">Mastered</span>}
        </div>
      </div>
      <p className="m-0 mt-1 text-[13px] font-bold text-ink-2">
        {lockedUnit ? `Master unit ${number - 1} to open this one.` : `${MASTER_RULE} ${UNIT_TIME}.`}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {unit.quests.map((q, i) => (
          <Tile key={q.id} q={q} position={i + 1} bonus={i === 2 && unit.mastered} isNext={q.id === nextQuestId} color={color} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}

/** One island: who lives there, its units of three quests with their stars, and the way back if it is still locked. */
export function IslandSheet({ view, previous, met, nextQuestId, reviewWaiting, skill, certificate, onPlay, onReview, onGoTo, onSkip }: IslandSheetProps) {
  const { island } = view;
  const color = CONCEPTS[island.concept].color;
  const friend = friendById(island.resident);
  const locked = view.status === 'locked';

  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-col gap-4">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-2)] border border-line">
        <IslandArt island={island} locked={locked} sailed={view.sailed} met={met} className="block h-auto w-full" />
        <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
          <p className="eyebrow m-0 flex items-center gap-2">
            <span aria-hidden="true" className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-[12px] font-black normal-case tracking-normal text-ink" style={{ boxShadow: `inset 0 0 0 3px ${island.stamp}` }}>
              {stageNumber(island)}
            </span>
            Stage {stageNumber(island)} of {stageCount(island.audience)} · {CONCEPTS[island.concept].name}
          </p>
          <p className="m-0 text-[17px] font-bold leading-snug text-ink-2">{island.tagline}</p>
          <div className="mt-1 flex items-center gap-3 rounded-[20px] bg-paper-3 p-3">
            <span className="shrink-0" style={met ? undefined : { filter: 'brightness(0) opacity(0.28)' }}>
              <FriendPicture id={friend.id} size={52} />
            </span>
            <p className="m-0 text-[15px] font-bold leading-snug text-ink">
              {met ? (
                <>
                  {friend.name} the {friend.species} lives here and loves {friend.idea.toLowerCase()}.
                </>
              ) : (
                <>
                  {friend.name} the {friend.species} is asleep here. {friend.hint}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {locked ? (
        <>
        <div className="rounded-[24px] border border-line bg-white p-5 text-center shadow-[var(--shadow-1)]" role="status">
          <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-[#44554c]" aria-hidden="true">
            <LockIcon size={26} />
          </span>
          <p className="m-0 text-[18px] font-black text-ink">{previous ? say(MAP_LINES[island.audience].locked, 0, { island: island.name, prev: previous.island.name }) : `${island.name} is not open yet.`}</p>
          {previous && (
            <button type="button" className="btn btn-primary btn-lg mt-4" onClick={() => onGoTo(previous.island.key)}>
              Go to {previous.island.name}
            </button>
          )}
        </div>
        {skill.length > 0 && (
          <section aria-labelledby="skill-title" className="rounded-[24px] border-2 border-[#2b9bf4] bg-[#e3f2ff] p-5 shadow-[var(--shadow-1)]">
            <h3 id="skill-title" className="m-0 text-[18px] font-black text-ink">
              Already know this? Take a skill check
            </h3>
            <p className="m-0 mt-1.5 text-[15px] font-bold leading-snug text-ink-2">
              Solve {skill.length} {skill.length === 1 ? 'quest' : 'quests'} on your own, with no hints, no Explain and no tutor:{' '}
              {skill.map((c) => islandByKey(c.stageKey)?.name ?? c.stageKey).join(', ')}. Pass them all and {island.name} opens. The stages before it count as tested out, and you can still play them any time.
            </p>
            <p className="m-0 mt-1.5 text-[14px] font-bold text-ink-2">You can try as often as you like. No stars are won in a skill check.</p>
            <button type="button" className="btn btn-primary btn-lg mt-3" onClick={onSkip}>
              Start the skill check
            </button>
          </section>
        )}
        </>
      ) : (
        <>
          {view.tested && !view.sailed && (
            <p className="m-0 rounded-[20px] bg-[#e1f7ec] px-4 py-3 text-[15px] font-extrabold text-[#08603e]">
              You tested out of {island.name}. You can still play any quest here and sail it.
            </p>
          )}
          {view.sailed && (
            <p className="m-0 rounded-[20px] bg-[#e1f7ec] px-4 py-3 text-[15px] font-extrabold text-[#08603e]">
              You sailed {island.name}. Replay any quest to win a gold star.
            </p>
          )}
          {certificate && stageNumber(island) === stageCount(island.audience) && (
            <Link to="/certificate" className="btn btn-primary btn-lg w-full">
              See my Logo Master certificate
            </Link>
          )}
          {reviewWaiting && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[#fff4cc] px-4 py-3">
              <p className="m-0 text-[15px] font-extrabold text-[#5a3b00]">{reviewInvite(island.name)}</p>
              <button type="button" className="btn btn-quiet" onClick={onReview}>
                Visit
              </button>
            </div>
          )}
          {view.units.map((unit) => (
            <Unit key={unit.index} unit={unit} number={unit.index + 1} color={color} nextQuestId={nextQuestId} onPlay={onPlay} />
          ))}
        </>
      )}
    </div>
  );
}
