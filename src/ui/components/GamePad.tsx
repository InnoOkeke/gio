import { useEffect, useRef } from 'react';
import type { GameKey } from '../../logo/index.js';
import { ArrowDownIcon, ArrowUpIcon } from './icons';

const REPEAT_MS = 140;

const LABEL: Record<GameKey, string> = { UP: 'Up', DOWN: 'Down', LEFT: 'Left', RIGHT: 'Right', SPACE: 'Space' };

function PadButton({ k, onPress, className = '' }: { k: GameKey; onPress(key: GameKey): void; className?: string }) {
  const timer = useRef<number>();
  const stop = () => window.clearInterval(timer.current);
  useEffect(() => stop, []);

  const icon =
    k === 'UP' ? <ArrowUpIcon size={28} /> : k === 'DOWN' ? <ArrowDownIcon size={28} /> : k === 'LEFT' ? <ArrowUpIcon size={28} className="-rotate-90" /> : k === 'RIGHT' ? <ArrowUpIcon size={28} className="rotate-90" /> : <span className="text-[16px] font-black">Space</span>;

  return (
    <button
      type="button"
      aria-label={`${LABEL[k]} key`}
      className={`btn btn-quiet ${k === 'SPACE' ? 'px-6' : 'btn-icon'} min-h-[56px] ${k === 'SPACE' ? '' : 'w-[56px]'} ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(k);
        stop();
        timer.current = window.setInterval(() => onPress(k), REPEAT_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPress(k))}
    >
      {icon}
    </button>
  );
}

/** On-screen keys for games, so tablets and phones can play too. Only the keys the game uses are active. */
export function GamePad({ keys, onPress }: { keys: GameKey[]; onPress(key: GameKey): void }) {
  const has = (k: GameKey) => keys.includes(k);
  const arrows = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as GameKey[]).some(has);
  return (
    <div className="rounded-[22px] bg-[#e6f8f5] px-4 py-3 flex flex-wrap items-center justify-center gap-4" aria-label="Game controls">
      <p className="m-0 text-[15px] font-black text-[#0f6d63]">Game on! Use the arrow keys or these buttons.</p>
      {arrows && (
        <div className="grid grid-cols-3 gap-1.5" style={{ gridTemplateAreas: '". up ." "left down right"' }}>
          {has('UP') && <PadButton k="UP" onPress={onPress} className="[grid-area:up]" />}
          {has('LEFT') && <PadButton k="LEFT" onPress={onPress} className="[grid-area:left]" />}
          {has('DOWN') && <PadButton k="DOWN" onPress={onPress} className="[grid-area:down]" />}
          {has('RIGHT') && <PadButton k="RIGHT" onPress={onPress} className="[grid-area:right]" />}
        </div>
      )}
      {has('SPACE') && <PadButton k="SPACE" onPress={onPress} />}
    </div>
  );
}
