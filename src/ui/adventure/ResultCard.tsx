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

export interface ResultCardProps {
  level: Level;
  outcome: LevelOutcome;
  /** The best stars so far, after this run. */
  stars: number;
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
export function ResultCard({ level, outcome, stars, par, next, opened, friendLine, stickers, offerHint, onHint, onTryAgain, onClose }: ResultCardProps) {
  const won = outcome.status === 'won';
  const primary = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const nextRule = won ? nextStarRule(stars, outcome.commands, par) : null;
  const boss = level.kind === 'boss' && level.boss ? level.boss.name : null;
  const others = won ? variantMaps(level, outcome) : [];
  const title = won ? (boss ? `You beat ${boss}!` : 'You did it!') : outcome.status === 'unfinished' ? 'Almost there!' : 'Oops!';
  return (
    <Sheet open variant="dialog" labelledBy="adv-result-title" onClose={onClose} initialFocus={primary} className="sheet-white adv-result">
      <div className="adv-result-body" data-sheet-header data-result={won ? 'won' : outcome.status}>
        <button type="button" className="btn btn-ghost btn-icon adv-result-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="adv-result-gio" aria-hidden="true">
          <TurtleSprite mood={won ? 'cheer' : 'curious'} />
        </div>
        <p className="eyebrow m-0">
          Level {level.n}: {level.title}
        </p>
        <h2 id="adv-result-title" className="adv-result-title">
          {title}
        </h2>
        {won ? (
          <>
            <StarRow stars={stars} size={40} pop />
            <p className="adv-result-line">
              {outcome.gems} of {outcome.gemsTotal} {outcome.gemsTotal === 1 ? 'gem' : 'gems'}. {outcome.commands} {outcome.commands === 1 ? 'command' : 'commands'}.
            </p>
            {nextRule ? <p className="adv-result-rule">{nextRule}</p> : <p className="adv-result-rule">Three stars! That plan is as short as it gets.</p>}
            {friendLine && <p className="adv-result-friend">{friendLine}</p>}
            {opened && <p className="adv-result-friend">{realmName(opened)} is open!</p>}
            {stickers.map((s) => (
              <p key={s} className="adv-result-friend">
                New sticker: {s}
              </p>
            ))}
            {others.length > 0 && (
              <div className="adv-others" aria-label="Your plan on the other maps">
                <p className="adv-result-line m-0">Your plan on the other maps</p>
                <ul className="adv-others-row">
                  {others.map((o, i) => (
                    <li key={i} className="adv-other">
                      <div className="adv-other-scene">
                        <AdventureScene level={level} scene={sceneAt(level, o.map, o.trace, o.trace.length)} />
                      </div>
                      <span>
                        Map {i + 2}: {o.won ? 'works' : 'needs work'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="adv-result-line">{outcome.message}</p>
        )}
        <div className="adv-result-actions">
          {won ? (
            <>
              {next ? (
                <Link ref={primary} to={`/adventure/${next.id}`} className="btn btn-primary btn-lg">
                  Next level
                </Link>
              ) : (
                <Link ref={primary} to="/adventure" className="btn btn-primary btn-lg">
                  Back to the map
                </Link>
              )}
              {stars < 3 && (
                <button type="button" className="btn btn-quiet btn-lg" onClick={onTryAgain}>
                  Try for 3 stars
                </button>
              )}
              {next && (
                <Link to="/adventure" className="btn btn-ghost btn-lg">
                  Back to the map
                </Link>
              )}
            </>
          ) : (
            <>
              <button ref={primary} type="button" className="btn btn-primary btn-lg" onClick={onTryAgain}>
                Try again
              </button>
              {offerHint && (
                <button type="button" className="btn btn-quiet btn-lg" onClick={onHint}>
                  Want a hint?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
