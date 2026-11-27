import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Level, LevelOutcome, RealmId } from '../../logo/adventure/index.js';
import { CloseIcon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { TurtleSprite } from '../components/TurtleSprite';
import { AdventureScene } from './AdventureScene';
import { variantMaps } from './playback';
import { nextStarRule, realmName } from './realms';
import { sceneAt } from './scene-state';
import { StarRow } from './StarRow';
import { localizeLevel } from '../../i18n/content.js';
import { pluralForm, pluralIn } from '../../i18n/index.js';
import { useLang, useT } from '../lang';
import { sayText } from '../lang-state';

export interface ResultCardProps {
  level: Level;
  /** The level's number as this child's mode counts it. Defaults to `level.n`. */
  number?: number;
  outcome: LevelOutcome;
  /** The best stars so far, after this run. */
  stars: number;
  /** The stars this run earned, for the sentence about the next star. Defaults to `stars`. */
  runStars?: number;
  /** Commands in this plan, for the rule of the next star. */
  par: number;
  /** The level after this one, when the child can open it. */
  next: Level | null;
  /** A world this win opened for the first time. */
  opened: RealmId | null;
  /** What happened to the caged friend, as a sentence. */
  friendLine: string | null;
  /** Names of stickers earned by this win. */
  stickers: string[];
  offerHint: boolean;
  onHint(): void;
  onTryAgain(): void;
  onClose(): void;
}

/** What a finished run says: stars and the rule for the next one after a win, one kind sentence after a miss. */
export function ResultCard({ level: source, number, outcome, stars, runStars, par, next, opened, friendLine, stickers, offerHint, onHint, onTryAgain, onClose }: ResultCardProps) {
  const t = useT();
  const { lang } = useLang();
  const level = localizeLevel(source, lang);
  const won = outcome.status === 'won';
  const primary = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const nextRule = won ? nextStarRule(runStars ?? stars, outcome.commands, par, lang) : null;
  const boss = level.kind === 'boss' && level.boss ? level.boss.name : null;
  const others = won ? variantMaps(source, outcome) : [];
  const title = won ? (boss ? t('adv.result.beat', { boss }) : t('adv.result.won')) : outcome.status === 'unfinished' ? t('adv.result.almost') : t('adv.result.oops');
  return (
    <Sheet open variant="dialog" labelledBy="adv-result-title" onClose={onClose} initialFocus={primary} className="sheet-white adv-result">
      <div className="adv-result-body" data-sheet-header data-result={won ? 'won' : outcome.status}>
        <button type="button" className="btn btn-ghost btn-icon adv-result-close" onClick={onClose} aria-label={t('btn.close')}>
          <CloseIcon />
        </button>
        <div className="adv-result-gio" aria-hidden="true">
          <TurtleSprite mood={won ? 'cheer' : 'curious'} />
        </div>
        <p className="eyebrow m-0">
          {t('adv.levelTitle', { n: number ?? level.n, title: level.title })}
        </p>
        <h2 id="adv-result-title" className="adv-result-title">
          {title}
        </h2>
        {won ? (
          <>
            <StarRow stars={stars} size={40} pop />
            <p className="adv-result-line">
              {t(`adv.result.gems.${pluralForm(lang, outcome.gemsTotal)}`, { n: outcome.gems, total: outcome.gemsTotal })} {pluralIn(lang, 'adv.result.commands', outcome.commands)}
            </p>
            {nextRule ? <p className="adv-result-rule">{nextRule}</p> : <p className="adv-result-rule">{t('adv.result.three')}</p>}
            {friendLine && <p className="adv-result-friend">{friendLine}</p>}
            {opened && <p className="adv-result-friend">{t('adv.result.opened', { realm: realmName(opened, lang) })}</p>}
            {stickers.map((s) => (
              <p key={s} className="adv-result-friend">
                {t('adv.result.sticker', { name: s })}
              </p>
            ))}
            {others.length > 0 && (
              <div className="adv-others" aria-label={t('adv.result.others')}>
                <p className="adv-result-line m-0">{t('adv.result.others')}</p>
                <ul className="adv-others-row">
                  {others.map((o, i) => (
                    <li key={i} className="adv-other">
                      <div className="adv-other-scene">
                        <AdventureScene level={source} scene={sceneAt(source, o.map, o.trace, o.trace.length)} />
                      </div>
                      <span>
                        {t('adv.result.map', { n: i + 2, state: o.won ? t('adv.result.works') : t('adv.result.needsWork') })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="adv-result-line">{sayText(outcome.message)}</p>
        )}
        <div className="adv-result-actions">
          {won ? (
            <>
              {next ? (
                <Link ref={primary} to={`/adventure/${next.id}`} className="btn btn-primary btn-lg">
                  {t('adv.result.next')}
                </Link>
              ) : (
                <Link ref={primary} to="/adventure" className="btn btn-primary btn-lg">
                  {t('adv.backMap')}
                </Link>
              )}
              {stars < 3 && (
                <button type="button" className="btn btn-quiet btn-lg" onClick={onTryAgain}>
                  {t('adv.result.try3')}
                </button>
              )}
              {next && (
                <Link to="/adventure" className="btn btn-ghost btn-lg">
                  {t('adv.backMap')}
                </Link>
              )}
            </>
          ) : (
            <>
              <button ref={primary} type="button" className="btn btn-primary btn-lg" onClick={onTryAgain}>
                {t('btn.tryAgain')}
              </button>
              {offerHint && (
                <button type="button" className="btn btn-quiet btn-lg" onClick={onHint}>
                  {t('adv.result.wantHint')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
