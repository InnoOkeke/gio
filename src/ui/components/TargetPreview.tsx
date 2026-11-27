import { useT } from '../lang';
import { useEffect, useMemo, useRef } from 'react';
import { playWithPresses, type Quest } from '../../logo/quests.js';
import { WORLD_HALF } from '../runtime/player';

const SIZE = 160;

/** A small picture of the quest's target drawing, so it can be read next to the stage on wide screens. */
export function TargetPreview({ quest }: { quest: Quest }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const result = useMemo(() => {
    if (!quest.target) return null;
    const played = playWithPresses(quest.target, quest.presses);
    return played.ok ? played.result : null;
  }, [quest]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.round(SIZE * dpr);
    canvas.width = px;
    canvas.height = px;
    ctx.clearRect(0, 0, px, px);
    if (!result) return;
    const scale = px / (WORLD_HALF * 2);
    ctx.setTransform(scale, 0, 0, -scale, px / 2, px / 2);
    ctx.strokeStyle = 'rgba(43, 155, 244, 0.85)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const e of result.events) {
      if (e.type === 'clear') ctx.clearRect(-WORLD_HALF, -WORLD_HALF, WORLD_HALF * 2, WORLD_HALF * 2);
      if (e.type !== 'line') continue;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    }
  }, [result]);

  if (!result) return null;
  return (
    <figure className="quest-preview m-0" aria-label={t('quest.target.figure')}>
      <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} role="img" aria-label={t('quest.target.img')} />
      <figcaption className="text-[14px] font-extrabold text-[#0b6fc2]">{t('quest.target.caption')}</figcaption>
    </figure>
  );
}
