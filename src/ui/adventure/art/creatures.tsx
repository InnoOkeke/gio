import type { ReactElement } from 'react';
import type { Level } from '../../../logo/adventure/level.js';
import { FRIEND_ART } from '../../components/gio/FriendArt';
import type { FriendId } from '../../gio/catalog';
import { symbolId, type RealmPalette } from './tiles';

const INK = '#17261f';
const LINE = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** A Grumble in a 50 by 50 tile: round, big-eyed and cross, never scary. No weapons. */
export function GrumbleArt({ color }: { color: string }): ReactElement {
  return (
    <g>
      <ellipse cx="25" cy="44" rx="13" ry="3.4" fill={INK} fillOpacity="0.18" />
      <circle cx="25" cy="26" r="16" fill={color} stroke={INK} strokeOpacity="0.45" strokeWidth="2.2" />
      <path d="M 14 14 L 17 8 M 25 10 L 25 4 M 36 14 L 33 8" {...LINE} strokeOpacity="0.5" />
      <circle cx="19" cy="25" r="5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="31" cy="25" r="5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="20" cy="26" r="2.4" fill={INK} />
      <circle cx="30" cy="26" r="2.4" fill={INK} />
      <path d="M 13 18 L 22 22 M 37 18 L 28 22" {...LINE} strokeWidth={2.6} />
      <path d="M 19 35 Q 25 31 31 35" {...LINE} />
    </g>
  );
}

/** A small critter for cages that hold no named friend. 100 by 100, like the friends. */
export function CritterArt(): ReactElement {
  return (
    <g className="fr-bob">
      <ellipse cx="32" cy="22" rx="9" ry="17" fill="#e9c9a0" stroke="#8a5a2b" strokeWidth="3" />
      <ellipse cx="68" cy="22" rx="9" ry="17" fill="#e9c9a0" stroke="#8a5a2b" strokeWidth="3" />
      <ellipse cx="50" cy="58" rx="30" ry="28" fill="#f3dcbc" stroke="#8a5a2b" strokeWidth="3" />
      <circle cx="40" cy="54" r="4.4" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <circle cx="60" cy="54" r="4.4" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <circle cx="40.6" cy="55" r="2.1" fill={INK} />
      <circle cx="60.6" cy="55" r="2.1" fill={INK} />
      <ellipse cx="50" cy="63" rx="3.6" ry="2.6" fill="#ff8fab" />
      <path d="M 43 70 Q 50 76 57 70" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

export function friendArtFor(art: NonNullable<Level['friend']>['art']): () => ReactElement {
  return art === 'critter' ? CritterArt : FRIEND_ART[art as FriendId];
}

/** A friend inside a tile, scaled from the 100 by 100 friend box. Sits at the bottom of the tile. */
export function FriendInTile({ art }: { art: NonNullable<Level['friend']>['art'] }): ReactElement {
  const Art = friendArtFor(art);
  return (
    <g transform="translate(7 8) scale(0.36)">
      <Art />
    </g>
  );
}

/** A cage with its friend inside: the friend first, the bars over them. */
export function CagedFriend({ uid, art }: { uid: string; art: NonNullable<Level['friend']>['art'] }): ReactElement {
  return (
    <g>
      <FriendInTile art={art} />
      <use href={`#${symbolId(uid, 'bars')}`} width="50" height="50" />
    </g>
  );
}

/** How cross the boss looks: 0 is cross, 2 is asleep. It drops as the gem counter rises. */
export function bossMoodStep(gems: number, gemsTotal: number): 0 | 1 | 2 {
  if (gemsTotal <= 0) return 0;
  const f = gems / gemsTotal;
  return f >= 1 ? 2 : f >= 0.5 ? 1 : 0;
}

const BOSS_NAMES: Record<string, string> = { 'hedge-giant': 'Hedge Giant' };

/**
 * The big boss picture that stands beside the map. Same family as a Grumble, much bigger. The art id picks
 * nothing but the name when it is not in the table, so every boss has a picture. Art only: it changes the
 * look, never the rules.
 */
export function BossArt({ art, gems, gemsTotal, palette, name }: { art: string; gems: number; gemsTotal: number; palette: RealmPalette; name?: string }): ReactElement {
  const step = bossMoodStep(gems, gemsTotal);
  const label = name ?? BOSS_NAMES[art] ?? 'Boss';
  const leaf = palette.tuft;
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={`${label}, ${step === 2 ? 'fast asleep' : step === 1 ? 'getting sleepy' : 'cross'}`} data-boss-mood={step} width="100%" height="100%">
      <ellipse cx="80" cy="148" rx="52" ry="9" fill={INK} fillOpacity="0.18" />
      {[28, 52, 80, 108, 132].map((x, k) => (
        <circle key={x} cx={x} cy={k % 2 === 0 ? 40 : 30} r={k === 2 ? 22 : 17} fill={leaf} stroke={INK} strokeOpacity="0.4" strokeWidth="2.4" />
      ))}
      <circle cx="80" cy="88" r="58" fill={palette.grumble} stroke={INK} strokeOpacity="0.45" strokeWidth="3" />
      <ellipse cx="55" cy="112" rx="9" ry="5.5" fill="#ff8fa3" fillOpacity="0.7" />
      <ellipse cx="105" cy="112" rx="9" ry="5.5" fill="#ff8fa3" fillOpacity="0.7" />
      {step === 2 ? (
        <>
          <path d="M 48 84 Q 58 94 68 84 M 92 84 Q 102 94 112 84" {...LINE} strokeWidth={4} />
          <path d="M 68 112 Q 80 120 92 112" {...LINE} strokeWidth={4} />
          <text x="124" y="64" fontSize="18" fontWeight="700" fill={INK} fillOpacity="0.6">
            z
          </text>
          <text x="136" y="48" fontSize="24" fontWeight="700" fill={INK} fillOpacity="0.6">
            Z
          </text>
        </>
      ) : (
        <>
          <circle cx="58" cy="82" r={step === 1 ? 11 : 14} fill="#fff" stroke={INK} strokeWidth="2.4" />
          <circle cx="102" cy="82" r={step === 1 ? 11 : 14} fill="#fff" stroke={INK} strokeWidth="2.4" />
          <circle cx="60" cy={step === 1 ? 86 : 84} r="5.6" fill={INK} />
          <circle cx="100" cy={step === 1 ? 86 : 84} r="5.6" fill={INK} />
          {step === 1 ? (
            <>
              <path d="M 44 74 L 72 74 M 88 74 L 116 74" {...LINE} strokeWidth={5} />
              <path d="M 68 114 L 92 114" {...LINE} strokeWidth={4} />
            </>
          ) : (
            <>
              <path d="M 40 62 L 72 76 M 120 62 L 88 76" {...LINE} strokeWidth={6} />
              <path d="M 64 118 Q 80 106 96 118" {...LINE} strokeWidth={4.4} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
