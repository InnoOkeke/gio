import { Fragment, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEVELS, type AgeModeId, type RealmId } from '../../logo/adventure/index.js';
import { ArrowLeftIcon, CloseIcon, LockIcon, PlayIcon, StarIcon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { TurtleSprite } from '../components/TurtleSprite';
import { useMode } from '../mode';
import { useTwoPane } from '../responsive/useMedia';
import { RealmBanner } from '../adventure/art/banner';
import { LevelTiles } from '../adventure/LevelTiles';
import { lockedText, REALMS } from '../adventure/realms';
import { levelNumber, levelsFor, nextLevel, realmLevels, realmsFor, realmStatus, totalStars } from '../adventure/state';
import { useAdventure } from '../adventure/useAdventure';
import '../adventure/adventure.css';

function Trail({ from, to, done }: { from: 'left' | 'right'; to: 'left' | 'right'; done: boolean }) {
  const x1 = from === 'left' ? 30 : 70;
  const x2 = to === 'left' ? 30 : 70;
  return (
    <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="adv-trail" aria-hidden="true" focusable="false">
      <path d={`M ${x1} 0 C ${x1} 28, ${x2} 20, ${x2} 48`} fill="none" stroke={done ? '#12a36b' : '#b9ae96'} strokeWidth={done ? 5 : 4} strokeLinecap="round" strokeDasharray={done ? '0.1 11' : '9 10'} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The world map: a winding trail through the worlds, one big Continue button and the level tiles of the world you pick. */
export default function Adventure() {
  const { mode } = useMode();
  const m: AgeModeId = mode ?? 'coder';
  const { state } = useAdventure();
  const twoPane = useTwoPane();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<RealmId | null>(null);
  const [sheet, setSheet] = useState<RealmId | null>(null);
  const realms = useMemo(() => realmsFor(m), [m]);
  const next = nextLevel(state, m);
  const total = totalStars(state, m);
  const here: RealmId = next?.realm ?? realms[realms.length - 1] ?? 'maze';
  const shown: RealmId = picked ?? here;
  const finished = next === null && levelsFor(m).length > 0;

  const pick = (realm: RealmId) => (twoPane ? setPicked(realm) : setSheet(realm));

  return (
    <div className="adv-root adv-map-root">
      <header className="adv-header">
        <div className="adv-header-bar">
          <Link to="/" className="btn btn-quiet adv-back" aria-label="Back to the studio">
            <ArrowLeftIcon /> <span className="adv-back-text">Studio</span>
          </Link>
          <h1 className="adv-title">
            <span className="sr-only">Gio&apos;s Adventure</span>
            <span aria-hidden="true">Gio&apos;s Adventure</span>
          </h1>
          <span className="adv-chip" aria-label={`${total.stars} of ${total.max} stars`}>
            <StarIcon size={20} className="adv-chip-star" />
            <span aria-hidden="true">
              {total.stars} of {total.max}
            </span>
          </span>
        </div>
      </header>
      <div className="adv-map-scroll">
      <main className="adv-map-main">
        <div className="adv-map-trail">
          <section className="adv-hero" aria-label="Continue">
            <div className="adv-hero-gio" aria-hidden="true">
              <TurtleSprite mood={finished ? 'cheer' : 'happy'} />
            </div>
            <div className="adv-hero-text">
              {next ? (
                <>
                  <p className="adv-hero-line">
                    Level {levelNumber(next, m)}: {next.title}
                  </p>
                  <p className="adv-hero-sub">{REALMS[next.realm].name}</p>
                </>
              ) : finished ? (
                <p className="adv-hero-line">You won every level! Play any of them again for more stars.</p>
              ) : (
                <p className="adv-hero-line">No levels yet for this mode.</p>
              )}
            </div>
            {next && (
              <Link to={`/adventure/${next.id}`} className="btn btn-primary btn-lg adv-continue">
                <PlayIcon size={24} /> Continue
              </Link>
            )}
          </section>
          {state.critters > 0 && <p className="adv-friends">Friends rescued: {state.critters}</p>}
          <ol className="adv-realms">
            {realms.map((realm, i) => {
              const status = realmStatus(state, m, realm);
              const info = REALMS[realm];
              const side = i % 2 === 0 ? 'left' : 'right';
              const cleared = status.cleared;
              const label = `${info.name}, ${status.won} of ${status.total} levels won, ${status.stars} of ${status.maxStars} stars${status.open ? '' : ', locked'}`;
              return (
                <Fragment key={realm}>
                  {i > 0 && <Trail from={i % 2 === 0 ? 'right' : 'left'} to={side} done={realmStatus(state, m, realms[i - 1]!).cleared} />}
                  <li className="adv-realm-row" data-side={side}>
                    {status.open ? (
                      <button type="button" className="adv-realm" data-current={shown === realm && twoPane} data-here={here === realm} aria-label={label} aria-pressed={twoPane ? shown === realm : undefined} aria-haspopup={twoPane ? undefined : 'dialog'} onClick={() => pick(realm)}>
                        <RealmBanner realm={realm} />
                        <span className="adv-realm-text">
                          <span className="adv-realm-name">{info.name}</span>
                          <span className="adv-realm-blurb">{info.blurb}</span>
                          <span className="adv-realm-meta">
                            {status.won} of {status.total} won{cleared ? ', cleared' : ''}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className="adv-realm" data-locked="true" role="group" aria-label={label}>
                        <RealmBanner realm={realm} />
                        <span className="adv-realm-text">
                          <span className="adv-realm-name">{info.name}</span>
                          <span className="adv-realm-blurb adv-lock-line">
                            <LockIcon size={18} /> {lockedText(realm, m)}
                          </span>
                        </span>
                      </div>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
        {twoPane && (
          <section className="adv-map-levels" aria-label={`${REALMS[shown].name} levels`}>
            <h2 className="adv-realm-heading">{REALMS[shown].name}</h2>
            <p className="adv-realm-sub">{REALMS[shown].blurb}</p>
            <LevelTiles realm={shown} mode={m} state={state} current={next?.id ?? null} />
          </section>
        )}
      </main>
      </div>
      {!twoPane && sheet && (
        <Sheet open variant="page" labelledBy="adv-realm-title" onClose={() => setSheet(null)} initialFocus={closeRef} className="adv-sheet">
          <div className="adv-sheet-head" data-sheet-header>
            <div className="adv-sheet-titles">
              <h2 id="adv-realm-title" className="adv-realm-heading">
                {REALMS[sheet].name}
              </h2>
              <p className="adv-realm-sub">
                {realmLevels(sheet, m).length} levels. {REALMS[sheet].blurb}
              </p>
            </div>
            <button ref={closeRef} type="button" className="btn btn-quiet btn-icon" onClick={() => setSheet(null)} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
          <LevelTiles realm={sheet} mode={m} state={state} current={next?.id ?? null} levels={LEVELS} />
        </Sheet>
      )}
    </div>
  );
}
