import { Link } from 'react-router-dom';
import { LEVELS, type AgeModeId, type Level, type RealmId } from '../../logo/adventure/index.js';
import { LockIcon } from '../components/icons';
import { realmName } from './realms';
import { localizeLevel } from '../../i18n/content.js';
import { useLang, useT } from '../lang';
import { StarRow } from './StarRow';
import { levelNumber, levelStatus, realmLevels, type AdventureState } from './state';

const KIND_WORD: Record<Level['kind'], string | null> = { play: null, fix: 'adv.kind.fix', boss: 'adv.kind.boss' };

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
  const t = useT();
  const { lang } = useLang();
  const list = realmLevels(realm, mode, levels);
  return (
    <ul className="adv-tiles" aria-label={t('adv.levelsOf', { realm: realmName(realm, lang) })}>
      {list.map((raw) => {
        const status = levelStatus(state, mode, raw, levels);
        const level = localizeLevel(raw, lang);
        const kindKey = KIND_WORD[level.kind];
        const kind = kindKey ? t(kindKey) : null;
        const n = levelNumber(raw, mode, levels);
        const inner = (
          <>
            <span className="adv-tile-n" aria-hidden="true">
              {n}
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
              <Link to={`/adventure/${level.id}`} className="adv-tile" data-current={current === level.id} aria-label={t('adv.tile.aria', { n, title: level.title, kind: kind ? `, ${kind}` : '', stars: status.stars })}>
                {inner}
              </Link>
            ) : (
              <div className="adv-tile" data-locked="true" role="group" aria-label={t('adv.tile.locked', { n, title: level.title })}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
