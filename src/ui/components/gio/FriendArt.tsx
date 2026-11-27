import { useLang, useT } from '../../lang';
import { localizeFriend } from '../../../i18n/content.js';
import type { ReactElement } from 'react';
import { friendById, type FriendId } from '../../gio/catalog';

/* Nine original friends, drawn in a 100 by 100 box. Each has a small idle animation
 * (classes fr-* in styles.css) that ends on its rest pose. */

const INK = '#17261f';

function Eye({ x, y, r = 4.6 }: { x: number; y: number; r?: number }) {
  return (
    <g className="fr-eye">
      <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth="1.6" />
      <circle cx={x + r * 0.15} cy={y + r * 0.1} r={r * 0.5} fill={INK} />
    </g>
  );
}

function spikes(cx: number, cy: number, base: number, tip: number, count: number): string {
  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  };
  return Array.from({ length: count }, (_, k) => {
    const a = (k * 360) / count;
    return `${pt(base, a - 7)} ${pt(tip, a)} ${pt(base, a + 7)}`;
  }).join(' ');
}

export const FRIEND_ART: Record<FriendId, () => ReactElement> = {
  olly: () => (
    <g>
      <g className="fr-sway">
        {[30, 38, 46, 54, 62, 70].map((x) => (
          <path key={`d${x}`} d={`M ${x} 56 Q ${x - 7} 68 ${x - 1} 76 Q ${x + 5} 84 ${x - 3} 91`} fill="none" stroke="#4b2bb0" strokeWidth="9" strokeLinecap="round" />
        ))}
        {[30, 38, 46, 54, 62, 70].map((x) => (
          <path key={`l${x}`} d={`M ${x} 56 Q ${x - 7} 68 ${x - 1} 76 Q ${x + 5} 84 ${x - 3} 91`} fill="none" stroke="#8e63f2" strokeWidth="5" strokeLinecap="round" />
        ))}
      </g>
      <ellipse cx="50" cy="40" rx="27" ry="25" fill="#8e63f2" stroke="#4b2bb0" strokeWidth="3" />
      <circle cx="38" cy="26" r="3.2" fill="#b79cff" />
      <circle cx="49" cy="22" r="2.4" fill="#b79cff" />
      <circle cx="61" cy="27" r="3" fill="#b79cff" />
      <Eye x={40} y={42} r={5.4} />
      <Eye x={60} y={42} r={5.4} />
      <ellipse cx="32" cy="52" rx="4" ry="2.6" fill="#ff8fab" />
      <ellipse cx="68" cy="52" rx="4" ry="2.6" fill="#ff8fab" />
      <path d="M 43 53 Q 50 59 57 53" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  dot: () => (
    <g className="fr-bob">
      {[
        'M 28 50 L 13 43',
        'M 26 60 L 11 62',
        'M 28 72 L 15 83',
        'M 72 50 L 87 43',
        'M 74 60 L 89 62',
        'M 72 72 L 85 83',
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      ))}
      <circle cx="50" cy="58" r="28" fill="#ef5a4c" stroke="#8f1d14" strokeWidth="3" />
      <path d="M 50 32 L 50 86" stroke="#8f1d14" strokeWidth="3" />
      <circle cx="36" cy="50" r="5" fill="#3a0d0a" />
      <circle cx="64" cy="50" r="5" fill="#3a0d0a" />
      <circle cx="35" cy="69" r="4.5" fill="#3a0d0a" />
      <circle cx="65" cy="69" r="4.5" fill="#3a0d0a" />
      <path d="M 44 22 Q 40 12 33 10 M 56 22 Q 60 12 67 10" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33" cy="10" r="2.8" fill={INK} />
      <circle cx="67" cy="10" r="2.8" fill={INK} />
      <ellipse cx="50" cy="31" rx="15" ry="12" fill="#26332c" stroke={INK} strokeWidth="2.4" />
      <Eye x={44} y={29} r={3.6} />
      <Eye x={56} y={29} r={3.6} />
      <path d="M 45 36 Q 50 39 55 36" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  chip: () => (
    <g>
      <path d="M 4 85 Q 50 79 96 85" fill="none" stroke="#8a5a2b" strokeWidth="7" strokeLinecap="round" />
      <g className="fr-sway">
        <path d="M 22 62 Q 5 64 7 50 Q 9 40 19 44 Q 25 48 19 52" fill="none" stroke="#0b7a4f" strokeWidth="12" strokeLinecap="round" />
        <path d="M 22 62 Q 5 64 7 50 Q 9 40 19 44 Q 25 48 19 52" fill="none" stroke="#5fd39b" strokeWidth="6.5" strokeLinecap="round" />
      </g>
      <ellipse cx="36" cy="77" rx="7" ry="5" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="2.6" />
      <ellipse cx="58" cy="77" rx="7" ry="5" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="2.6" />
      <ellipse cx="46" cy="62" rx="29" ry="20" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" />
      <circle cx="31" cy="54" r="3.6" fill="#ffc93c" stroke={INK} strokeWidth="1" />
      <circle cx="43" cy="49" r="3.6" fill="#ec3f86" stroke={INK} strokeWidth="1" />
      <circle cx="55" cy="51" r="3.6" fill="#2b9bf4" stroke={INK} strokeWidth="1" />
      <circle cx="38" cy="64" r="3.6" fill="#7a4cf0" stroke={INK} strokeWidth="1" />
      <ellipse cx="76" cy="54" rx="16" ry="13" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" />
      <path d="M 66 42 L 70 35 L 75 41 L 80 35 L 84 43" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="2.6" strokeLinejoin="round" />
      <g className="fr-eye">
        <circle cx="80" cy="51" r="7.5" fill="#fff" stroke={INK} strokeWidth="2" />
        <circle cx="82" cy="51" r="3.4" fill={INK} />
      </g>
      <path d="M 82 61 Q 89 62 92 57" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  ),
  puff: () => (
    <g className="fr-puff">
      <polygon points={spikes(50, 52, 25, 38, 12)} fill="#c9741a" stroke="#c9741a" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="22" cy="58" rx="8" ry="4.5" fill="#ffd27a" stroke="#c9741a" strokeWidth="2.4" style={{ transform: 'rotate(-25deg)', transformOrigin: 'center' }} />
      <circle cx="50" cy="52" r="28" fill="#ffb347" stroke="#c9741a" strokeWidth="3" />
      <ellipse cx="50" cy="66" rx="17" ry="10" fill="#ffe0a8" />
      <Eye x={39} y={46} r={5.6} />
      <Eye x={61} y={46} r={5.6} />
      <ellipse cx="29" cy="57" rx="4" ry="2.6" fill="#ff8fab" />
      <ellipse cx="71" cy="57" rx="4" ry="2.6" fill="#ff8fab" />
      <ellipse cx="50" cy="60" rx="3.6" ry="4.2" fill={INK} />
    </g>
  ),
  nutmeg: () => (
    <g>
      <g className="fr-sway">
        <path d="M 62 86 C 98 86 98 34 70 28 C 82 44 80 64 60 68 Z" fill="#d58f4f" stroke="#8a4f1d" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 78 40 Q 86 52 80 66" fill="none" stroke="#a96a2f" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <ellipse cx="46" cy="66" rx="19" ry="23" fill="#b9753a" stroke="#6b3d14" strokeWidth="3" />
      <ellipse cx="46" cy="72" rx="11" ry="14" fill="#f1d3a3" />
      <path d="M 33 22 L 31 7 L 44 17 Z M 59 22 L 61 7 L 48 17 Z" fill="#b9753a" stroke="#6b3d14" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="46" cy="34" r="16" fill="#b9753a" stroke="#6b3d14" strokeWidth="3" />
      <ellipse cx="46" cy="40" rx="8" ry="6" fill="#f1d3a3" />
      <Eye x={39} y={31} r={3.8} />
      <Eye x={53} y={31} r={3.8} />
      <ellipse cx="46" cy="38" rx="3" ry="2.2" fill={INK} />
      <path d="M 43 43 Q 46 46 49 43" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="46" cy="68" rx="6.5" ry="7" fill="#d9a05b" stroke="#6b4423" strokeWidth="2" />
      <path d="M 38.5 65 Q 46 55 53.5 65 Z" fill="#6b4423" stroke="#3f2810" strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  ),
  hoot: () => (
    <g className="fr-tilt">
      <path d="M 30 26 L 25 8 L 43 19 Z M 70 26 L 75 8 L 57 19 Z" fill="#a47c5b" stroke="#5c4030" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="58" rx="29" ry="33" fill="#a47c5b" stroke="#5c4030" strokeWidth="3" />
      <ellipse cx="50" cy="69" rx="17" ry="20" fill="#e8d3b4" />
      <path d="M 42 62 Q 46 66 50 62 Q 54 66 58 62 M 42 72 Q 46 76 50 72 Q 54 76 58 72 M 42 82 Q 46 86 50 82 Q 54 86 58 82" fill="none" stroke="#a47c5b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="22" cy="62" rx="7" ry="19" fill="#7e5b3e" stroke="#5c4030" strokeWidth="2.6" />
      <ellipse cx="78" cy="62" rx="7" ry="19" fill="#7e5b3e" stroke="#5c4030" strokeWidth="2.6" />
      <g className="fr-eye">
        <circle cx="38" cy="44" r="12.5" fill="#fff3d6" stroke="#5c4030" strokeWidth="3" />
        <circle cx="39" cy="45" r="5.6" fill={INK} />
        <circle cx="41" cy="43" r="1.8" fill="#fff" />
      </g>
      <g className="fr-eye">
        <circle cx="62" cy="44" r="12.5" fill="#fff3d6" stroke="#5c4030" strokeWidth="3" />
        <circle cx="61" cy="45" r="5.6" fill={INK} />
        <circle cx="63" cy="43" r="1.8" fill="#fff" />
      </g>
      <path d="M 45 52 L 55 52 L 50 63 Z" fill="#ff9f1c" stroke="#b36a00" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M 36 97 L 40 91 L 44 97 M 56 97 L 60 91 L 64 97" fill="none" stroke="#ff9f1c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  bree: () => (
    <g>
      <g className="fr-tail">
        <ellipse cx="80" cy="78" rx="17" ry="8" fill="#5c3a1c" stroke="#3a2310" strokeWidth="3" style={{ transform: 'rotate(-20deg)', transformOrigin: 'center' }} />
        <path d="M 70 78 L 77 84 M 77 72 L 85 80 M 85 68 L 91 75" stroke="#8b6139" strokeWidth="2" strokeLinecap="round" />
      </g>
      <ellipse cx="46" cy="68" rx="22" ry="23" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="3" />
      <ellipse cx="46" cy="74" rx="13" ry="14" fill="#c99a63" />
      <circle cx="31" cy="21" r="6" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="2.8" />
      <circle cx="61" cy="21" r="6" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="2.8" />
      <circle cx="46" cy="38" r="18" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="3" />
      <ellipse cx="46" cy="46" rx="11" ry="8" fill="#c99a63" />
      <Eye x={38} y={34} r={3.8} />
      <Eye x={54} y={34} r={3.8} />
      <ellipse cx="46" cy="42" rx="4.2" ry="3" fill={INK} />
      <rect x="42" y="47" width="8" height="9" rx="1.8" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <path d="M 46 47 L 46 56" stroke={INK} strokeWidth="1.4" />
      <rect x="22" y="70" width="48" height="10" rx="5" fill="#c28a4a" stroke="#6b4423" strokeWidth="2.6" />
      <circle cx="27" cy="75" r="2.4" fill="none" stroke="#6b4423" strokeWidth="1.6" />
      <circle cx="30" cy="76" r="5.5" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="2.4" />
      <circle cx="62" cy="76" r="5.5" fill="#8d5a2b" stroke="#4e2f12" strokeWidth="2.4" />
    </g>
  ),
  spindle: () => (
    <g className="fr-dangle">
      <path d="M 50 -10 L 50 31" stroke="#9aa6a0" strokeWidth="2" strokeLinecap="round" />
      {[
        'M 42 52 Q 24 38 14 50 L 11 62',
        'M 40 57 Q 20 52 9 63 L 8 77',
        'M 40 62 Q 20 66 12 80 L 12 92',
        'M 43 66 Q 30 76 25 92',
        'M 58 52 Q 76 38 86 50 L 89 62',
        'M 60 57 Q 80 52 91 63 L 92 77',
        'M 60 62 Q 80 66 88 80 L 88 92',
        'M 57 66 Q 70 76 75 92',
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#3d2766" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <circle cx="50" cy="60" r="17" fill="#6a4aa8" stroke="#3d2766" strokeWidth="3" />
      <path d="M 44 53 L 56 53 L 50 60 L 56 67 L 44 67 L 50 60 Z" fill="#ffc93c" stroke="#3d2766" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="50" cy="40" r="12" fill="#6a4aa8" stroke="#3d2766" strokeWidth="3" />
      <Eye x={45} y={38} r={3.6} />
      <Eye x={55} y={38} r={3.6} />
      <path d="M 46 45 Q 50 48 54 45" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  hop: () => (
    <g className="fr-hop">
      <ellipse cx="22" cy="78" rx="13" ry="8" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="3" style={{ transform: 'rotate(-20deg)', transformOrigin: 'center' }} />
      <ellipse cx="78" cy="78" rx="13" ry="8" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="3" style={{ transform: 'rotate(20deg)', transformOrigin: 'center' }} />
      <ellipse cx="50" cy="64" rx="30" ry="23" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="3" />
      <ellipse cx="50" cy="73" rx="19" ry="12" fill="#c8f0c0" />
      <ellipse cx="38" cy="88" rx="9" ry="4.5" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="2.6" />
      <ellipse cx="62" cy="88" rx="9" ry="4.5" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="2.6" />
      <circle cx="33" cy="40" r="12" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="3" />
      <circle cx="67" cy="40" r="12" fill="#3fbf6f" stroke="#1f7a43" strokeWidth="3" />
      <Eye x={33} y={39} r={7} />
      <Eye x={67} y={39} r={7} />
      <circle cx="46" cy="52" r="1.5" fill={INK} />
      <circle cx="54" cy="52" r="1.5" fill={INK} />
      <ellipse cx="29" cy="62" rx="4" ry="2.6" fill="#ff8fab" />
      <ellipse cx="71" cy="62" rx="4" ry="2.6" fill="#ff8fab" />
      <path d="M 30 62 Q 50 78 70 62" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
    </g>
  ),
};

/** A friend on their own, for the friend dialog and the garden. */
export function FriendPicture({ id, size = 120, className }: { id: FriendId; size?: number; className?: string }) {
  const Art = FRIEND_ART[id];
  const t = useT();
  const { lang } = useLang();
  const f = localizeFriend(friendById(id), lang);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={t('friend.title', { name: f.name, species: f.species })} className={`friend-art overflow-visible ${className ?? ''}`}>
      <Art />
    </svg>
  );
}
