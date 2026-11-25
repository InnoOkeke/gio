import { useId, type CSSProperties, type ReactElement } from 'react';
import type { Level } from '../../logo/adventure/level.js';
import { TurtleSprite } from '../components/TurtleSprite';
import type { GioMood } from '../gio/mood';
import { CagedFriend, FriendInTile, GrumbleArt } from './art/creatures';
import { REALM_PALETTES, symbolId, TILE, TileDefs, tileFor } from './art/tiles';
import { describeScene } from './describe';
import { cellPercent, sceneBox, type SceneState } from './scene-state';

export interface AdventureSceneProps {
  level: Level;
  /** The scene to draw. Build it with `initialScene` or `sceneAt`. */
  scene: SceneState;
  mood?: GioMood;
  /** Glide Gio and the Grumbles to their new cells. False jumps straight there. */
  tween?: boolean;
  /** How long the glide lasts, in seconds. */
  seconds?: number;
  /** The cell where something just happened (a bump, a gem), outlined for a moment. */
  highlight?: { col: number; row: number } | null;
  /** Cells to mark with a dotted trail (the path hint). */
  trail?: readonly (readonly [number, number])[];
}

/**
 * One SVG scene per map: a `viewBox` of cols*50 by rows*50, every tile a `<use>` of a shared `<symbol>`,
 * so a 9 by 9 map is 81 small elements. Gio is the studio's TurtleSprite on a layer above, moved with a
 * CSS transform. There is no canvas. The picture is described by the `aria-label` (see `describeScene`).
 */
export function AdventureScene({ level, scene, mood = 'idle', tween = false, seconds = 0.2, highlight = null, trail = [] }: AdventureSceneProps): ReactElement {
  const uid = useId().replace(/:/g, '');
  const palette = REALM_PALETTES[level.realm];
  const { cols, rows } = scene;
  const box = sceneBox(cols, rows);
  const glide = tween ? `transform ${seconds}s linear` : 'none';
  const cell = cellPercent(0, 0, cols, rows);
  const friendArt = level.friend?.art;

  const sprite: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${cell.width}%`,
    height: `${cell.height}%`,
    transform: `translate(${scene.gio.col * 100}%, ${scene.gio.row * 100}%)`,
    transition: glide,
    pointerEvents: 'none',
  };
  const turner: CSSProperties = { width: '100%', height: '100%', padding: '6%', boxSizing: 'border-box', transform: `rotate(${scene.heading}deg)`, transition: glide };

  return (
    <div
      role="img"
      aria-label={describeScene(scene)}
      data-realm={level.realm}
      data-cols={cols}
      data-rows={rows}
      style={{ position: 'relative', width: '100%', aspectRatio: `${cols} / ${rows}`, maxHeight: '100%', lineHeight: 0 }}
    >
      <svg viewBox={`0 0 ${box.width} ${box.height}`} width="100%" height="100%" aria-hidden="true" focusable="false" style={{ display: 'block', borderRadius: 14 }}>
        <TileDefs uid={uid} palette={palette} />
        {scene.cells.map((row, r) =>
          row.map((ch, c) => {
            const { base, over } = tileFor(ch, c, r, level.realm);
            return (
              <g key={`${c},${r}`} transform={`translate(${c * TILE} ${r * TILE})`} data-cell={ch}>
                <use href={`#${symbolId(uid, base)}`} width={TILE} height={TILE} />
                {over && <use href={`#${symbolId(uid, over)}`} width={TILE} height={TILE} />}
                {ch === 'F' && friendArt && <CagedFriend uid={uid} art={friendArt} />}
              </g>
            );
          }),
        )}
        {friendArt &&
          scene.freed.map(([c, r]) => (
            <g key={`free${c},${r}`} transform={`translate(${c * TILE} ${r * TILE})`} data-freed="true">
              <FriendInTile art={friendArt} />
            </g>
          ))}
        {(level.fires ?? []).flatMap((f) =>
          f.cells.map(([c, r]) => <use key={`ember${f.id}${c},${r}`} href={`#${symbolId(uid, 'ember')}`} x={c * TILE} y={r * TILE} width={TILE} height={TILE} data-ember="true" />),
        )}
        {scene.fires.map(([c, r]) => (
          <use key={`fire${c},${r}`} href={`#${symbolId(uid, 'fire')}`} x={c * TILE} y={r * TILE} width={TILE} height={TILE} data-fire="true" />
        ))}
        {scene.enemies.map((e) => (
          <g key={e.id} data-enemy={e.id} style={{ transform: `translate(${e.col * TILE}px, ${e.row * TILE}px)`, transition: tween ? `transform ${seconds}s linear` : 'none' }}>
            <GrumbleArt color={palette.grumble} realm={level.realm} />
          </g>
        ))}
        {trail.map(([c, r]) => (
          <circle key={`trail${c},${r}`} cx={c * TILE + TILE / 2} cy={r * TILE + TILE / 2} r={6} fill="#17261f" fillOpacity="0.55" stroke="#fff" strokeWidth="2" data-trail="true" />
        ))}
        {highlight && (
          <rect x={highlight.col * TILE + 2} y={highlight.row * TILE + 2} width={TILE - 4} height={TILE - 4} rx="10" fill="none" stroke="#17261f" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="6 5" data-highlight="true" />
        )}
      </svg>
      <div aria-hidden="true" style={sprite} data-gio={`${scene.gio.col},${scene.gio.row},${scene.gio.dir}`}>
        <div style={turner}>
          <TurtleSprite mood={mood} />
        </div>
      </div>
    </div>
  );
}
