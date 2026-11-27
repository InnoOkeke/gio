import { Fragment, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEVELS, type AgeModeId, type RealmId } from '../../logo/adventure/index.js';
import { ArrowLeftIcon, CloseIcon, LockIcon, PlayIcon, StarIcon } from '../components/icons';
import { LanguageButton } from '../components/LanguageButton';
import { Sheet } from '../components/Sheet';
import { TurtleSprite } from '../components/TurtleSprite';
import { useMode } from '../mode';
import { useTwoPane } from '../responsive/useMedia';
import { RealmBanner } from '../adventure/art/banner';
import { LevelTiles } from '../adventure/LevelTiles';
import { lockedText, realmInfo } from '../adventure/realms';
import { localizeLevel } from '../../i18n/content.js';
import { useLang, useT } from '../lang';
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
  const t = useT();
  const { lang } = useLang();
  const REALMS = { get: (r: RealmId) => realmInfo(r, lang) };
  const m: AgeModeId = mode ?? 'coder';
  const { state } = useAdventure();
  const twoPane = useTwoPane();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<RealmId | null>(null);
  const [sheet, setSheet] = useState<RealmId | null>(null);
  const realms = useMemo(() => realmsFor(m), [m]);
  const nextRaw = nextLevel(state, m);
  const next = nextRaw && localizeLevel(nextRaw, lang);
  const total = totalStars(state, m);
  const here: RealmId = next?.realm ?? realms[realms.length - 1] ?? 'maze';
  const shown: RealmId = picked ?? here;
  const finished = next === null && levelsFor(m).length > 0;

  const pick = (realm: RealmId) => (twoPane ? setPicked(realm) : setSheet(realm));

  return (
    <div className="adv-root adv-map-root">
      <header className="adv-header">
        <div className="adv-header-bar">
          <Link to="/" className="btn btn-quiet adv-back" aria-label={t('adv.backStudio')}>
            <ArrowLeftIcon /> <span className="adv-back-text">{t('adv.studio')}</span>
          </Link>
          <h1 className="adv-title">
            <span className="sr-only">{t('adv.title')}</span>
            <span aria-hidden="true">{t('adv.title')}</span>
          </h1>
          <span className="adv-chip" aria-label={t('adv.starsAria', { n: total.stars, total: total.max })}>
            <StarIcon size={20} className="adv-chip-star" />
            <span aria-hidden="true">
              {t('adv.nOf', { n: total.stars, total: total.max })}
            </span>
          </span>
          <LanguageButton />
        </div>
      </header>
      <div className="adv-map-scroll">
      <main className="adv-map-main">
        <div className="adv-map-trail">
          <section className="adv-hero" aria-label={t('adv.continue')}>
            <div className="adv-hero-gio" aria-hidden="true">
              <TurtleSprite mood={finished ? 'cheer' : 'happy'} />
            </div>
            <div className="adv-hero-text">
              {next ? (
                <>
                  <p className="adv-hero-line">
                    {t('adv.levelTitle', { n: levelNumber(next, m), title: next.title })}
                  </p>
                  <p className="adv-hero-sub">{REALMS.get(next.realm).name}</p>
                </>
              ) : finished ? (
                <p className="adv-hero-line">{t('adv.allWon')}</p>
              ) : (
                <p className="adv-hero-line">{t('adv.noLevels')}</p>
              )}
            </div>
            {next && (
              <Link to={`/adventure/${next.id}`} className="btn btn-primary btn-lg adv-continue">
                <PlayIcon size={24} /> {t('adv.continue')}
              </Link>
            )}
          </section>
          {state.critters > 0 && <p className="adv-friends">{t('adv.rescued', { n: state.critters })}</p>}
          <ol className="adv-realms">
            {realms.map((realm, i) => {
              const status = realmStatus(state, m, realm);
              const info = REALMS.get(realm);
              const side = i % 2 === 0 ? 'left' : 'right';
              const cleared = status.cleared;
              const label = t('adv.realmAria', { name: info.name, won: status.won, total: status.total, stars: status.stars, max: status.maxStars }) + (status.open ? '' : t('adv.lockedSuffix'));
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
                            {t('adv.wonMeta', { won: status.won, total: status.total })}{cleared ? t('adv.clearedSuffix') : ''}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className="adv-realm" data-locked="true" role="group" aria-label={label}>
                        <RealmBanner realm={realm} />
                        <span className="adv-realm-text">
                          <span className="adv-realm-name">{info.name}</span>
                          <span className="adv-realm-blurb adv-lock-line">
                            <LockIcon size={18} /> {lockedText(realm, m, undefined, lang)}
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
          <section className="adv-map-levels" aria-label={t('adv.levelsOf', { realm: REALMS.get(shown).name })}>
            <h2 className="adv-realm-heading">{REALMS.get(shown).name}</h2>
            <p className="adv-realm-sub">{REALMS.get(shown).blurb}</p>
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
                {REALMS.get(sheet).name}
              </h2>
              <p className="adv-realm-sub">
                {t('adv.levelsCount', { n: realmLevels(sheet, m).length, blurb: REALMS.get(sheet).blurb })}
              </p>
            </div>
            <button ref={closeRef} type="button" className="btn btn-quiet btn-icon" onClick={() => setSheet(null)} aria-label={t('btn.close')}>
              <CloseIcon />
            </button>
          </div>
          <LevelTiles realm={sheet} mode={m} state={state} current={next?.id ?? null} levels={LEVELS} />
        </Sheet>
      )}
    </div>
  );
}
