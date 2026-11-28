import { CONCEPTS, type Quest } from '../../logo/quests.js';
import { hiddenTestLine } from '../path/hidden';
import { placeOf, stageCount, stageNumber } from '../path/islands';
import { mapLinesFor, say } from '../path/lines';
import { conceptText, localizeQuest, localizeStage } from '../../i18n/content.js';
import { useLang, useT } from '../lang';
import type { Star } from '../path/state';
import { useVoice } from '../voice';
import { CheckIcon, MicIcon, StarIcon, TrophyIcon } from './icons';
import { TargetPreview } from './TargetPreview';
interface QuestCardProps {
  quest: Quest;
  done: boolean;
  feedback: string | null;
  /** The star this solve earned, once the quest is done. */
  star: Star | null;
  /** A hint was used on this quest, so it will be a silver star. */
  hinted: boolean;
  /** Set while playing a review: which quest of the visit this is. */
  review: { index: number; total: number } | null;
  /** Replaces the line that says where the quest sits on the map (the Daily Turtle Puzzle has no place on it). */
  eyebrow?: string;
  /** The label of the button that follows the path once the quest is done. */
  nextLabel: string;
  onHint(): void;
  onNext(): void;
  onLeave(): void;
  /** Spoken commands during a quest (run, hint, explain...). */
  onVoice(text: string): void;
}

/** Shown above the studio while a quest is active: where it sits on the map, and how it went. */
export function QuestCard({ quest: source, done, feedback, star, hinted, review, eyebrow, nextLabel, onHint, onNext, onLeave, onVoice }: QuestCardProps) {
  const t = useT();
  const { lang } = useLang();
  const quest = localizeQuest(source, lang);
  const c = conceptText(quest.concept, CONCEPTS[quest.concept], lang);
  const voice = useVoice(onVoice);
  const place = placeOf(quest.id);
  const islandName = place ? localizeStage(place.island, lang).name : '';
  const lines = mapLinesFor(quest.audience, lang);
  const hidden = hiddenTestLine(quest, lang);
  return (
    <section className="quest-card panel px-5 py-5 medium:px-7 flex flex-col medium:flex-row medium:items-center gap-4" aria-labelledby="quest-title" style={{ borderColor: c.color, borderWidth: 2 }}>
      <span className="w-14 h-14 shrink-0 rounded-[18px] flex items-center justify-center text-white" style={{ background: c.color }} aria-hidden="true">
        {done ? <CheckIcon size={30} /> : <TrophyIcon size={30} />}
      </span>
      <div className="flex-1 min-w-0">
        {review && place && (
          <p className="m-0 mb-1 inline-flex rounded-full bg-[#fff4cc] px-3 py-1 text-[14px] font-black text-[#5a3b00]">
            {t('quest.review', { n: review.index + 1, total: review.total, island: islandName })}
          </p>
        )}
        <p className="m-0 eyebrow" style={{ color: '#44554c' }}>
          {eyebrow ?? (place ? t('quest.place', { stage: stageNumber(place.island), stages: stageCount(place.island.audience), island: islandName, unit: place.unitIndex + 1, n: place.index + 1 }) : t('quest.conceptQuest', { concept: c.name }))}
        </p>
        <h2 id="quest-title" className="m-0 text-[22px] font-black leading-tight">
          {quest.title}
        </h2>
        <p className="m-0 mt-0.5 text-[16px] font-semibold text-ink-2">{quest.goal}</p>
        {hidden && !done && <p className="m-0 mt-1 text-[14px] font-bold text-[#5a3b00]">{hidden}</p>}
        {quest.target && !done && <p className="m-0 mt-1 text-[14px] font-bold text-[#0b6fc2]">{t('quest.copyFaint')}</p>}
        {!done && hinted && <p className="m-0 mt-2 text-[15px] font-extrabold text-[#5a3b00]">{say(lines.hintUsed, 0)}</p>}
        {feedback && <p className={`m-0 mt-2 text-[15px] font-extrabold ${done ? 'text-[#08603e]' : 'text-[#9b2419]'}`}>{feedback}</p>}
        {done && star && (
          <p className="m-0 mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[15px] font-black" style={star === 'clean' ? { background: '#fff0c2', color: '#5a3b00' } : { background: '#eef1f4', color: '#33424d' }}>
            <StarIcon size={22} className={`moment-star ${star === 'clean' ? 'text-[#f5a700]' : 'text-[#8796a3]'}`} />
            {say(star === 'clean' ? lines.gold : lines.silver, quest.id.length)}
          </p>
        )}
      </div>
      {quest.target && !done && <TargetPreview quest={quest} />}
      <div className="flex flex-wrap gap-2 shrink-0">
        {voice.supported && (
          <button
            type="button"
            className={`btn btn-icon bg-[#ffc93c] text-[#5a3b00] shadow-[0_4px_0_#c99a1a] ${voice.listening ? 'mic-live' : ''}`}
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? t('tutor.ask.stopListening') : t('quest.voiceAria')}
            title={t('quest.voiceTitle')}
          >
            <MicIcon />
          </button>
        )}
        {done ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={onHint}>
            {t('btn.hint')}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onLeave}>
          {t('btn.leaveQuest')}
        </button>
      </div>
    </section>
  );
}