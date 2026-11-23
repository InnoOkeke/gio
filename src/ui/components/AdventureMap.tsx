import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { QuestAudience } from '../../logo/quests.js';
import type { FriendId, StickerId } from '../gio/catalog';
import type { GioMood } from '../gio/mood';
import { islandByKey, questById, stageCount, stageNumber } from '../path/islands';
import { MAP_LINES, reviewInvite, say } from '../path/lines';
import type { SkillChallenge } from '../path/skill';
import type { IslandView, NextStop } from '../path/state';
import { worldStartingAt } from '../path/worlds';
import { useTwoPane } from '../responsive/useMedia';
import { useSheetDrag } from '../responsive/useSheetDrag';
import { IslandArt, isGoldArt } from './IslandArt';
import { Sheet } from './Sheet';
import { IslandSheet } from './IslandSheet';
import { ArrowLeftIcon, CloseIcon, LeafIcon, LockIcon, MapIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

interface AdventureMapProps {
  open: boolean;
  mode: QuestAudience;
  /** The islands of this mode in sailing order, with their stars and locks. */
  islands: readonly IslandView[];
  /** The friends who have been met. A friend who has not is asleep on their island. */
  friends: readonly FriendId[];
  next: NextStop;
  /** The island whose review is waiting, if any. */
  reviewKey: string | null;
  mood: GioMood;
  shell: readonly (StickerId | null)[];
  /** The challenges of a skill check that opens a stage. Empty when the stage cannot be skipped to. */
  skillPlan(islandKey: string): readonly SkillChallenge[];
  /** The Logo Master certificate is earned in this mode. */
  certificate: boolean;
  onPlay(questId: string): void;
  /** Start the skill check that opens a stage. */
  onSkip(islandKey: string): void;
  /** The one Go button: follow the next stop. */
  onGo(): void;
  onReview(islandKey: string): void;
  onGarden(): void;
  onClose(): void;
  /** Gio's garden, shown as a live side column when a wide landscape screen has room. */
  renderGarden?(): ReactNode;
}

/** Which island Gio stands on: where the next quest is, or else the last island sailed. */
function currentKey(islands: readonly IslandView[], next: NextStop): string {
  if (next.kind === 'quest' || next.kind === 'retry' || next.kind === 'bonus') return next.islandKey;
  const sailed = islands.filter((i) => i.sailed);
  return (sailed[sailed.length - 1] ?? islands[0])!.island.key;
}

function statusWords(view: IslandView, here: boolean, review: boolean, previousName: string | null): string {
  const parts: string[] = [`Stage ${stageNumber(view.island)}`];
  if (view.sailed) parts.push('sailed');
  else if (view.tested) parts.push('tested out, you can still sail it');
  else if (view.status === 'locked') parts.push(previousName ? `locked, sail ${previousName} first` : 'locked');
  else parts.push(`open, ${view.units.filter((u) => u.mastered).length} of ${view.units.length} units mastered`);
  if (here && !view.sailed && view.status === 'open') parts.push('Gio is here');
  if (review) parts.push('a review is waiting');
  return parts.join(', ');
}

function Trail({ from, to, sailed, wide = false }: { from: 'left' | 'right'; to: 'left' | 'right'; sailed: boolean; wide?: boolean }) {
  // Narrow lists use 68% cards, wide lists two 48% columns: the trail joins the card centres.
  const [l, r] = wide ? [24, 76] : [34, 66];
  const x1 = from === 'left' ? l : r;
  const x2 = to === 'left' ? l : r;
  return (
    <svg viewBox="0 0 100 52" preserveAspectRatio="none" className={`${wide ? 'trail-wide' : 'trail-narrow'} h-[52px] w-full`} aria-hidden="true" focusable="false">
      <path
        d={`M ${x1} 0 C ${x1} 30, ${x2} 22, ${x2} 52`}
        fill="none"
        stroke={sailed ? '#12a36b' : '#b9ae96'}
        strokeWidth={sailed ? 5 : 4}
        strokeLinecap="round"
        strokeDasharray={sailed ? '0.1 11' : '9 10'}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The adventure map: one island for each big idea, a winding trail between them, and one Go button. */
export function AdventureMap(props: AdventureMapProps) {
  return props.open ? <MapDialog {...props} /> : null;
}

function MapDialog({ mode, islands, friends, next, reviewKey, mood, shell, skillPlan, certificate, onPlay, onSkip, onGo, onReview, onGarden, onClose, renderGarden }: AdventureMapProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const twoPane = useTwoPane() && !!renderGarden;
  const backRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const islandScrollRef = useRef<HTMLDivElement>(null);
  const hereRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const lastSelected = useRef<string | null>(null);
  const first = useRef(true);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  // On phones the island opens as a sheet over the map: swipe it down to go back.
  useSheetDrag(layerRef, () => setSelected(null), selected !== null);

  const here = currentKey(islands, next);
  /** The first locked stage a skill check can open: the way in for a confident child or a grown-up. */
  const firstSkippable = islands.find((v) => v.status === 'locked' && skillPlan(v.island.key).length > 0)?.island.key ?? null;
  const sailedCount = islands.filter((i) => i.sailed).length;
  const total = islands.length || stageCount(mode);

  // Show Gio's island when the map opens, and return to the island that was open when coming back.
  useEffect(() => {
    // The list stays mounted under an open island (so its scroll is kept) but cannot be reached.
    bodyRef.current?.toggleAttribute('inert', !!selected);
    if (selected) {
      lastSelected.current = selected;
      islandScrollRef.current?.scrollTo({ top: 0 });
      backRef.current?.focus();
    } else {
      hereRef.current?.scrollIntoView({ block: 'center' });
      if (!first.current && lastSelected.current) cardRefs.current[lastSelected.current]?.focus();
    }
    first.current = false;
  }, [selected]);

  const selectedView = selected ? islands.find((i) => i.island.key === selected) : undefined;
  const selectedAt = selectedView ? islands.indexOf(selectedView) : -1;

  const stopQuest = next.kind === 'quest' || next.kind === 'retry' || next.kind === 'bonus' ? questById(next.questId) : undefined;
  const reviewName = reviewKey ? islandByKey(reviewKey)?.name : undefined;
  const go =
    next.kind === 'review'
      ? { label: 'Go!', text: reviewInvite(islandByKey(next.islandKey)?.name ?? 'An island'), run: () => onReview(next.islandKey) }
      : next.kind === 'done'
        ? { label: "Gio's garden", text: say(MAP_LINES[mode].allDone, 0), run: onGarden }
        : {
            label: 'Go!',
            text: next.kind === 'retry' ? `Try ${stopQuest?.title ?? 'it'} again for a gold star` : next.kind === 'bonus' ? `Bonus quest: ${stopQuest?.title ?? ''}` : `Next: ${stopQuest?.title ?? ''}`,
            run: onGo,
          };

  return (
    <Sheet open variant="page" labelledBy="map-title" onClose={onClose} onEscape={() => (selectedRef.current ? setSelected(null) : onClose())} initialFocus={closeRef} scroll={false}>
      <div className="map-shell">
        <div className="border-b border-line bg-[rgba(245,242,234,0.92)] backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4">
          {selectedView && (
            <button ref={backRef} type="button" className="btn btn-quiet btn-icon min-h-[48px] min-w-[48px] shrink-0" onClick={() => setSelected(null)} aria-label="Back to the map">
              <ArrowLeftIcon />
            </button>
          )}
          <h2 id="map-title" className="m-0 flex min-w-0 flex-1 items-center gap-2.5 text-[22px] font-black leading-tight sm:text-[26px]">
            {selectedView ? (
              <span className="truncate">{selectedView.island.name}</span>
            ) : (
              <>
                <MapIcon size={28} className="hidden shrink-0 text-[#0f8fa6] sm:block" /> <span className="truncate">Quest map</span>
              </>
            )}
          </h2>
          <span className="shrink-0 rounded-full bg-paper-3 px-3 py-1.5 text-[14px] font-black tabular-nums text-ink">
            <span aria-hidden="true">
              {sailedCount}/{total}
              <span className="hidden sm:inline"> sailed</span>
            </span>
            <span className="sr-only">
              {sailedCount} of {total} stages sailed
            </span>
          </span>
          {!twoPane && (
            <button type="button" className="btn btn-quiet min-w-[48px] max-sm:px-3" onClick={onGarden} aria-label="Gio's garden">
              <LeafIcon className="text-[#12a36b]" /> <span className="hidden sm:inline">Garden</span>
            </button>
          )}
          <button ref={closeRef} type="button" className="btn btn-quiet btn-icon shrink-0" onClick={onClose} aria-label="Close the map">
            <CloseIcon />
          </button>
        </div>
        <div className="flex gap-[3px] px-4 pb-3 sm:px-6" aria-hidden="true" data-testid="stage-pips">
          {islands.map((v) => (
            <span
              key={v.island.key}
              data-pip={v.sailed ? 'sailed' : v.tested ? 'tested' : 'open'}
              className="h-[7px] min-w-0 flex-1 rounded-full"
              style={
                v.sailed
                  ? { background: '#12a36b' }
                  : v.tested
                    ? { background: '#fff', boxShadow: 'inset 0 0 0 2px #12a36b' }
                    : { background: '#d9d2bf' }
              }
            />
          ))}
        </div>
        </div>

        <div className="map-panes">
        <div className="map-main">
          {selectedView && (
            <div className="island-layer">
              <div className="island-layer-scrim" onClick={() => setSelected(null)} aria-hidden="true" />
              <div ref={layerRef} className="island-layer-panel">
                <div className="sheet-grab" data-sheet-grab aria-hidden="true">
                  <span className="sheet-handle" />
                </div>
                <div ref={islandScrollRef} className="island-layer-scroll overflow-y-auto">
                  <IslandSheet
                    view={selectedView}
                    previous={selectedAt > 0 ? islands[selectedAt - 1]! : null}
                    met={friends.includes(selectedView.island.resident)}
                    nextQuestId={(next.kind === 'quest' || next.kind === 'retry' || next.kind === 'bonus') && next.islandKey === selected ? next.questId : null}
                    reviewWaiting={reviewKey === selected}
                    skill={skillPlan(selectedView.island.key)}
                    certificate={certificate}
                    onSkip={() => onSkip(selectedView.island.key)}
                    onPlay={onPlay}
                    onReview={() => onReview(selectedView.island.key)}
                    onGoTo={setSelected}
                  />
                </div>
              </div>
            </div>
          )}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-4 sm:px-6" style={{ background: 'linear-gradient(#d9f0fb 0, #eef9fd 220px, #f5f2ea 520px)' }}>
          {(
            <div className="map-list flex flex-col">
              {(certificate || firstSkippable) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {firstSkippable && (
                    <button type="button" className="btn btn-quiet" onClick={() => setSelected(firstSkippable)}>
                      Skip ahead
                    </button>
                  )}
                  {certificate && (
                    <Link to="/certificate" className="btn btn-quiet">
                      My certificate
                    </Link>
                  )}
                </div>
              )}
              {reviewKey && reviewName && next.kind !== 'review' && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#fff4cc] px-4 py-3 shadow-[var(--shadow-1)]">
                  <p className="m-0 flex items-center gap-2.5 text-[16px] font-extrabold text-[#5a3b00]">
                    <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full bg-[#ffc93c] shadow-[0_0_0_4px_rgba(255,201,60,0.35)]" />
                    {reviewInvite(reviewName)}
                  </p>
                  <button type="button" className="btn btn-quiet" onClick={() => onReview(reviewKey)}>
                    Visit
                  </button>
                </div>
              )}
              {islands.map((view, i) => {
                const side = i % 2 === 0 ? 'left' : 'right';
                const nextSide = i % 2 === 0 ? 'right' : 'left';
                const key = view.island.key;
                const isHere = key === here;
                const locked = view.status === 'locked';
                const review = reviewKey === key;
                const previousName = i > 0 ? islands[i - 1]!.island.name : null;
                const color = view.island.stamp;
                const stage = stageNumber(view.island);
                const world = worldStartingAt(mode, stage);
                const gold = isGoldArt(view.island.art);
                const mastered = view.units.filter((u) => u.mastered).length;
                return (
                  <Fragment key={key}>
                    {world && (
                      <div className="mb-3 mt-1 flex items-center gap-3">
                        <span className="h-px flex-1 bg-[#b9ae96]" aria-hidden="true" />
                        <h3 className="m-0 text-[14px] font-black uppercase tracking-[0.08em] text-ink-2">
                          {world.title} <span className="font-extrabold normal-case tracking-normal">· Stages {world.from} to {world.to}</span>
                        </h3>
                        <span className="h-px flex-1 bg-[#b9ae96]" aria-hidden="true" />
                      </div>
                    )}
                    <div className={`isle-row flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}>
                      <button
                        ref={(el) => {
                          cardRefs.current[key] = el;
                          if (isHere) hereRef.current = el;
                        }}
                        type="button"
                        onClick={() => setSelected(key)}
                        aria-label={`${view.island.name}. ${statusWords(view, isHere, review, previousName)}`}
                        className={`isle-card ${isHere ? 'is-here' : ''}`}
                        data-locked={locked}
                        data-gold={gold}
                      >
                        <span className="relative block">
                          <IslandArt island={view.island} locked={locked} sailed={view.sailed} met={friends.includes(view.island.resident)} className="block h-auto w-full" />
                          {isHere && !view.sailed && !locked && (
                            <span className="map-gio" aria-hidden="true">
                              <TurtleSprite mood={mood} stickers={shell} />
                            </span>
                          )}
                          {view.tested && !view.sailed && (
                            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[14px] font-black text-[#08603e] shadow-[0_0_0_2px_#12a36b]" aria-hidden="true">
                              Tested out
                            </span>
                          )}
                          {review && <span className="absolute right-3 top-3 h-4 w-4 rounded-full bg-[#ffc93c] shadow-[0_0_0_5px_rgba(255,201,60,0.4)]" aria-hidden="true" />}
                        </span>
                        <span className="flex flex-col gap-1 px-3 pb-3 pt-2 text-left">
                          <span className="text-[14px] font-black uppercase tracking-[0.08em] text-ink-2">Stage {stage}</span>
                          <span className="text-[18px] font-black leading-tight text-ink">{view.island.name}</span>
                          <span
                            className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] font-black"
                            style={
                              view.sailed
                                ? { background: '#e1f7ec', color: '#08603e' }
                                : locked
                                  ? { background: '#f2eee4', color: '#44554c' }
                                  : { background: '#fff', color: '#17261f', boxShadow: `inset 0 0 0 2px ${color}` }
                            }
                          >
                            {locked && <LockIcon size={14} />}
                            {view.sailed ? 'Sailed' : locked ? 'Locked' : isHere ? 'You are here' : view.tested ? 'Tested out' : `${mastered} of ${view.units.length} units`}
                          </span>
                        </span>
                      </button>
                    </div>
                    {locked && skillPlan(key).length > 0 && (
                      <div className={`mt-2 flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}>
                        <button type="button" className="isle-skip btn btn-quiet w-[68%] max-w-[300px]" onClick={() => setSelected(key)} aria-label={`Skip ahead to ${view.island.name}: take a skill check`}>
                          Skip ahead
                        </button>
                      </div>
                    )}
                    {i < islands.length - 1 && (
                      <>
                        <Trail from={side} to={nextSide} sailed={view.sailed} />
                        <Trail from={side} to={nextSide} sailed={view.sailed} wide />
                      </>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        {!selectedView && (
          <div className="flex items-center gap-3 border-t border-line bg-[rgba(245,242,234,0.96)] px-4 pt-3 sm:px-6 sm:pb-4" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <p className="m-0 min-w-0 flex-1 text-[15px] font-extrabold leading-snug text-ink-2 sm:text-[16px]">{go.text}</p>
            <button type="button" className="btn btn-primary btn-lg shrink-0" onClick={go.run}>
              {go.label}
            </button>
          </div>
        )}
        </div>
        {twoPane && renderGarden && (
          <aside className="map-garden" aria-labelledby="map-garden-title">
            <h2 id="map-garden-title" className="m-0 mb-4 flex items-center gap-2 text-[22px] font-black">
              <LeafIcon size={24} className="text-[#12a36b]" /> Gio&rsquo;s garden
            </h2>
            {renderGarden()}
          </aside>
        )}
        </div>
      </div>
    </Sheet>
  );
}
