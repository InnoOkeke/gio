import { useEffect, useRef } from 'react';
import type { GameKey } from '../../logo/index.js';
import { haptic } from '../haptics';
import { useT } from '../lang';
import { ArrowDownIcon, ArrowUpIcon } from './icons';

const REPEAT_MS = 140;


function PadButton({ k, onPress, className = '' }: { k: GameKey; onPress(key: GameKey): void; className?: string }) {
  const t = useT();
  const timer = useRef<number>();
  const stop = () => window.clearInterval(timer.current);
  useEffect(() => stop, []);

  const icon =
    k === 'UP' ? <ArrowUpIcon size={32} /> : k === 'DOWN' ? <ArrowDownIcon size={32} /> : k === 'LEFT' ? <ArrowUpIcon size={32} className="-rotate-90" /> : k === 'RIGHT' ? <ArrowUpIcon size={32} className="rotate-90" /> : <span className="text-[18px] font-black">{t('game.key.SPACE')}</span>;

  return (
    <button
      type="button"
      aria-label={t('game.keyAria', { key: t(`game.key.${k}`) })}
      className={`btn btn-quiet pad-btn ${k === 'SPACE' ? 'pad-space px-6' : 'btn-icon pad-arrow'} ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        // A thumb on a pad button never starts a stage pan, and sliding it away ends the press cleanly.
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* the pointer is already gone */
        }
        haptic('tap');
        onPress(k);
        stop();
        timer.current = window.setInterval(() => onPress(k), REPEAT_MS);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        stop();
      }}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPress(k))}
    >
      {icon}
    </button>
  );
}

/**
 * On-screen keys for games, so tablets and phones can play too. Only the keys the game uses are active.
 * On touch screens it docks at the bottom with the arrows under the left thumb and Space under the right.
 */
export function GamePad({ keys, onPress }: { keys: GameKey[]; onPress(key: GameKey): void }) {
  const t = useT();
  const has = (k: GameKey) => keys.includes(k);
  const arrows = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as GameKey[]).some(has);
  return (
    <div className="gamepad rounded-[22px] bg-[#e6f8f5] px-4 py-3" aria-label={t('game.controls')}>
      <p className="gamepad-hint m-0 text-[15px] font-black text-[#0f6d63]">
        {t('game.on')} <span className="hint-fine">{t('game.fine')}</span>
        <span className="hint-coarse">{t('game.coarse')}</span>
      </p>
      {arrows && (
        <div className="gamepad-dpad grid grid-cols-3" style={{ gridTemplateAreas: '". up ." "left down right"' }}>
          {has('UP') && <PadButton k="UP" onPress={onPress} className="[grid-area:up]" />}
          {has('LEFT') && <PadButton k="LEFT" onPress={onPress} className="[grid-area:left]" />}
          {has('DOWN') && <PadButton k="DOWN" onPress={onPress} className="[grid-area:down]" />}
          {has('RIGHT') && <PadButton k="RIGHT" onPress={onPress} className="[grid-area:right]" />}
        </div>
      )}
      {has('SPACE') && (
        <div className="gamepad-action">
          <PadButton k="SPACE" onPress={onPress} />
        </div>
      )}
    </div>
  );
}
