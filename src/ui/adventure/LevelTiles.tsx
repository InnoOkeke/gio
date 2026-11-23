import { Link } from 'react-router-dom';
import { LEVELS, type AgeModeId, type Level, type RealmId } from '../../logo/adventure/index.js';
import { LockIcon } from '../components/icons';
import { realmName } from './realms';
import { StarRow } from './StarRow';
import { levelStatus, realmLevels, type AdventureState } from './state';

const KIND_WORD: Record<Level['kind'], string | null> = { play: null, fix: 'Fix it', boss: 'Boss' };

interface LevelTilesProps {
  realm: RealmId;
  mode: AgeModeId;
  state: AdventureState;
  levels?: readonly Level[];
  /** The level the Continue button points at, drawn with a ring. */
  current?: string | null;
}

/** The levels of one world as big tiles: number, title, stars. Locked ones show a padlock and cannot be tapped. */
export function LevelTiles({ realm, mode, state, levels = LEVELS, current = null }: LevelTilesProps) {
  const list = realmLevels(realm, mode, levels);
  return (
    <ul className="adv-tiles" aria-label={`${realmName(realm)} levels`}>
      {list.map((level) => {
        const status = levelStatus(state, mode, level, levels);
        const kind = KIND_WORD[level.kind];
        const inner = (
          <>
            <span className="adv-tile-n" aria-hidden="true">
              {level.n}
            </span>
            <span className="adv-tile-body">
              <span className="adv-tile-title">{level.title}</span>
              {kind && <span className="adv-tile-kind">{kind}</span>}
            </span>
            {status.open ? <StarRow stars={status.stars} size={20} /> : <LockIcon size={22} className="adv-tile-lock" />}
          </>
        );
        return (
          <li key={level.id}>
            {status.open ? (
              <Link to={`/adventure/${level.id}`} className="adv-tile" data-current={current === level.id} aria-label={`Level ${level.n}, ${level.title}${kind ? `, ${kind}` : ''}, ${status.stars} of 3 stars`}>
                {inner}
              </Link>
            ) : (
              <div className="adv-tile" data-locked="true" role="group" aria-label={`Level ${level.n}, ${level.title}, locked`}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
