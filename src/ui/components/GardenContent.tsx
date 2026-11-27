import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Quest, QuestAudience } from '../../logo/quests.js';
import { FRIENDS, SHELL_SLOTS, STICKERS, stickerById, type StickerId } from '../gio/catalog';
import { localDateKey, weekCopy, weekView, type RewardsState } from '../gio/rewards';
import type { Badge } from '../progress';
import { localizeFriend, localizeSticker } from '../../i18n/content.js';
import type { Lang } from '../../i18n/index.js';
import { useLang, useT } from '../lang';
import { FriendPicture } from './gio/FriendArt';
import { StickerPicture } from './gio/StickerArt';
import { GardenScene } from './GardenScene';
import { TurtleSprite } from './TurtleSprite';
export interface GardenContentProps {
  mode: QuestAudience;
  rewards: RewardsState;
  quests: readonly Quest[];
  completed: readonly string[];
  badges: readonly Badge[];
  onWear(slot: number, id: StickerId | null): void;
}
/** The centre of each shell spot as a share of the sprite's 120 by 120 view box (-60 to 60). */
const SPOT_XY: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 17, y: -22 },
  { x: 24, y: 0 },
  { x: 17, y: 22 },
  { x: -17, y: 22 },
  { x: -24, y: 0 },
  { x: -17, y: -22 },
];
function weekdayName(dateKey: string, lang: Lang): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString(lang === 'en' ? undefined : lang, { weekday: 'long' });
}
/**
 * The body of Gio's garden: the shell to decorate, the sticker book, friends, the garden itself and a calm
 * week. Used by the garden sheet and by the adventure map's side column, so wearing a sticker works the
 * same in both. Two columns when its own box is wide enough (a container query on .garden-content).
 */
export function GardenContent({ mode, rewards, quests, completed, badges, onWear }: GardenContentProps) {
  const t = useT();
  const { lang } = useLang();
  const [slot, setSlot] = useState(0);
  const [said, setSaid] = useState('');
  const today = localDateKey(new Date());
  const week = weekView(rewards.days, today);
  const copy = weekCopy(rewards, today, lang);
  const stickers = STICKERS.filter((s) => s.modes.includes(mode) || rewards.stickers.includes(s.id)).map((s) => localizeSticker(s, lang));
  const friends = FRIENDS.filter((f) => f.modes.includes(mode) || rewards.friends.includes(f.id)).map((f) => localizeFriend(f, lang));
  const stickerName = (id: StickerId) => localizeSticker(stickerById(id), lang).name;
  const wornHere = rewards.shell[slot] ?? null;
  const choose = (id: StickerId) => {
    if (wornHere === id) {
      onWear(slot, null);
      setSaid(t('garden.took', { sticker: stickerName(id), n: slot + 1 }));
    } else {
      onWear(slot, id);
      setSaid(t('garden.wearing', { sticker: stickerName(id), n: slot + 1 }));
    }
  };
  return (
    <div className="garden-content">
      <div className="garden-columns">
        <div className="garden-col">
          <section aria-labelledby="shell-title" className="flex flex-col items-center gap-2">
            <h3 id="shell-title" className="m-0 self-start text-[18px] font-black">
              {t('garden.shell')}
            </h3>
            <div className="relative w-[min(320px,100%)] aspect-square">
              <TurtleSprite mood="happy" stickers={rewards.shell} />
              {SPOT_XY.slice(0, SHELL_SLOTS).map((p, i) => {
                const id = rewards.shell[i] ?? null;
                const selected = slot === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlot(i)}
                    aria-pressed={selected}
                    aria-label={id ? t('garden.spot.full', { n: i + 1, sticker: stickerName(id) }) : t('garden.spot.empty', { n: i + 1 })}
                    className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer flex items-center justify-center bg-transparent border-0 p-0 group"
                    style={{ left: `${((p.x + 60) / 120) * 100}%`, top: `${((p.y + 60) / 120) * 100}%` }}
                  >
                    <span
                      aria-hidden="true"
                      className={`rounded-full flex items-center justify-center font-black text-[#08603e] ${
                        selected
                          ? 'w-11 h-11 border-[3px] border-[#08603e] bg-white/30'
                          : id
                            ? 'w-11 h-11 border-2 border-transparent group-hover:border-[#08603e]/60'
                            : 'w-7 h-7 text-[16px] border-2 border-dashed border-[#08603e] bg-white/60'
                      }`}
                    >
                      {!id && !selected && '+'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="m-0 text-center text-[15px] font-bold text-ink-2">
              {t('garden.tapSpot')}
            </p>
            <button type="button" className="btn btn-quiet min-h-[48px]" disabled={!wornHere} onClick={() => (onWear(slot, null), setSaid(t('garden.spotEmpty', { n: slot + 1 })))}>
              {t('garden.takeOff', { n: slot + 1 })}
            </button>
            <p className="sr-only" role="status" aria-live="polite">
              {said}
            </p>
          </section>
          <section aria-labelledby="stickers-title" className="flex flex-col gap-3">
            <h3 id="stickers-title" className="m-0 text-[18px] font-black">
              {t('garden.stickers')} <span className="text-[14px] font-bold text-ink-2">{t('garden.count', { n: rewards.stickers.length, total: stickers.length })}</span>
            </h3>
            <ul className="sticker-grid m-0 p-0 list-none grid gap-2.5">
              {stickers.map((s) => {
                const earned = rewards.stickers.includes(s.id);
                const worn = rewards.shell.includes(s.id);
                return (
                  <li key={s.id} className="flex">
                    {earned ? (
                      <button
                        type="button"
                        onClick={() => choose(s.id)}
                        aria-pressed={worn}
                        aria-label={t('garden.stickerAria', { sticker: s.name }) + (worn ? t('garden.wornSuffix') : '')}
                        className={`w-full min-h-[48px] rounded-[20px] p-3 flex flex-col items-center gap-1 text-center cursor-pointer border-2 bg-white shadow-[var(--shadow-1)] ${worn ? 'border-[#08603e]' : 'border-transparent'}`}
                      >
                        <StickerPicture id={s.id} size={52} />
                        <span className="text-[14px] font-black leading-tight text-ink">{s.name}</span>
                        {worn && <span className="text-[14px] font-extrabold text-[#08603e]">{t('garden.wearingTag')}</span>}
                      </button>
                    ) : (
                      <div className="w-full rounded-[20px] p-3 flex flex-col items-center gap-1 text-center border-2 border-dashed border-[#b9ae96] bg-paper-3">
                        <div className="opacity-30 grayscale" aria-hidden="true">
                          <StickerPicture id={s.id} size={52} />
                        </div>
                        <span className="text-[14px] font-black leading-tight text-ink-2">{s.name}</span>
                        <span className="text-[14px] font-bold leading-tight text-ink-2">{t('garden.learnToEarn', { hint: s.hint })}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <div className="garden-col">
          <section aria-labelledby="friends-title" className="flex flex-col gap-3">
            <h3 id="friends-title" className="m-0 text-[18px] font-black">
              {t('garden.friends')} <span className="text-[14px] font-bold text-ink-2">{t('garden.count', { n: rewards.friends.length, total: friends.length })}</span>
            </h3>
            <ul className="friend-grid m-0 p-0 list-none grid gap-2.5">
              {friends.map((f) => {
                const met = rewards.friends.includes(f.id);
                return (
                  <li key={f.id} className={`rounded-[20px] p-3 flex flex-col items-center gap-1 text-center ${met ? 'bg-white shadow-[var(--shadow-1)]' : 'bg-paper-3 border-2 border-dashed border-[#b9ae96]'}`}>
                    {met ? (
                      <>
                        <FriendPicture id={f.id} size={72} />
                        <span className="text-[15px] font-black text-ink">{f.name}</span>
                        <span className="text-[14px] font-bold leading-tight text-ink-2">{t('garden.friendLine', { species: f.species, idea: f.idea.toLowerCase() })}</span>
                      </>
                    ) : (
                      <>
                        <div className="brightness-0 opacity-20" aria-hidden="true">
                          <FriendPicture id={f.id} size={72} />
                        </div>
                        <span className="text-[15px] font-black text-ink-2">{t('garden.friendWaiting')}</span>
                        <span className="text-[14px] font-bold leading-tight text-ink-2">{f.hint}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="scene-title" className="flex flex-col gap-3">
            <h3 id="scene-title" className="m-0 text-[18px] font-black">
              {t('garden.mine')}
            </h3>
            <GardenScene quests={quests} completed={completed} badges={badges} friends={rewards.friends} golden={rewards.goldenShell} />
            {rewards.goldenShell && (
              <p className="m-0 flex flex-wrap items-center justify-between gap-2 rounded-[20px] bg-[#fff4cc] px-4 py-3 text-[16px] font-extrabold text-[#5a3b00]">
                {t('garden.golden')}
                <Link to="/certificate" className="btn btn-quiet">
                  {t('moment.master.cert')}
                </Link>
              </p>
            )}
          </section>
          <section aria-labelledby="week-title" className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-1)] flex flex-col gap-3">
            <h3 id="week-title" className="m-0 text-[18px] font-black">
              {t('garden.days')}
            </h3>
            <p className="m-0 text-[17px] font-bold text-ink">
              {copy.headline}
            </p>
            <ul className="m-0 p-0 list-none flex justify-between gap-1">
              {week.map((d) => (
                <li key={d.date} className="flex flex-col items-center gap-1 min-w-[36px]">
                  <span
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-black ${d.learned ? 'bg-[#12a36b] text-white' : 'border-2 border-[#b9ae96] bg-transparent'}`}
                  >
                    {d.learned ? '\u2713' : ''}
                  </span>
                  <span className="text-[14px] font-bold text-ink-2" aria-hidden="true">
                    {d.isToday ? t('garden.today') : weekdayName(d.date, lang).slice(0, 3)}
                  </span>
                  <span className="sr-only">
                    {d.isToday ? t('garden.today') : weekdayName(d.date, lang)}: {d.learned ? t('garden.learned') : t('garden.notYet')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[15px] font-bold text-ink-2">
              {copy.footer}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
