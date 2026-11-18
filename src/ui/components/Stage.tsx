import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { DEFAULT_BACKGROUND, type RunResult, type TurtleEvent } from '../../logo/index.js';
import { Player, WORLD_HALF, type PlayerStatus, type Speed, type SpriteState } from '../runtime/player';
import type { StickerId } from '../gio/catalog';
import type { GioMood } from '../gio/mood';
import { TurtleSprite } from './TurtleSprite';

export interface StageHandle {
  load(result: RunResult): void;
  play(): void;
  pause(): void;
  step(): void;
  finish(): void;
  reset(): void;
  setSpeed(speed: Speed): void;
  /** PNG of the drawing on its background, for downloading. */
  toPNG(): string;
  /** Games: draw the moves from one key press, without a celebration each time. */
  appendEvents(events: TurtleEvent[]): void;
  /** How many moves are still waiting to be drawn. */
  pending(): number;
  /** A faint target drawing under the child's own, for quests. */
  setGuide(result: RunResult | null): void;
}

interface StageProps {
  onGameOver(): void;
  onLine(line: number | null): void;
  onPrint(text: string): void;
  onStatus(status: PlayerStatus): void;
  mood?: GioMood;
  stickers?: readonly (StickerId | null)[];
}

const BURST_COLORS = ['#ffc93c', '#12a36b', '#2b9bf4', '#ec3f86', '#7a4cf0', '#ef5a4c'];

export const Stage = forwardRef<StageHandle, StageProps>(function Stage({ onLine, onPrint, onStatus, onGameOver, mood, stickers }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const guideResultRef = useRef<RunResult | null>(null);
  const turtleRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const spriteRef = useRef<SpriteState>({ x: 0, y: 0, heading: 0, visible: true });
  const backgroundRef = useRef(DEFAULT_BACKGROUND);
  const lastStatusRef = useRef<PlayerStatus>('idle');
  const gameRef = useRef(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onLine, onPrint, onStatus, onGameOver });
  callbacks.current = { onLine, onPrint, onStatus, onGameOver };

  const showScore = (text: string | null) => {
    const el = scoreRef.current;
    if (!el) return;
    el.hidden = text === null;
    if (text !== null && el.textContent !== text) {
      el.textContent = text;
      el.classList.remove('score-pop');
      void el.offsetWidth;
      el.classList.add('score-pop');
    }
  };

  const placeTurtle = (sprite: SpriteState, moving: boolean) => {
    spriteRef.current = sprite;
    const stage = stageRef.current;
    const turtle = turtleRef.current;
    if (!stage || !turtle) return;
    const size = stage.clientWidth;
    const px = ((sprite.x + WORLD_HALF) / (WORLD_HALF * 2)) * size;
    const py = ((WORLD_HALF - sprite.y) / (WORLD_HALF * 2)) * size;
    turtle.style.transform = `translate(${px}px, ${py}px) rotate(${sprite.heading}deg)`;
    turtle.style.opacity = sprite.visible ? '1' : '0';
    turtle.classList.toggle('is-moving', moving);
    turtle.classList.toggle('is-idle', !moving);
  };

  const celebrate = () => {
    const turtle = turtleRef.current;
    const burst = burstRef.current;
    const stage = stageRef.current;
    if (!turtle || !burst || !stage) return;
    turtle.classList.add('is-happy');
    window.setTimeout(() => turtle.classList.remove('is-happy'), 1500);

    const { x, y } = spriteRef.current;
    const size = stage.clientWidth;
    burst.style.left = `${((x + WORLD_HALF) / (WORLD_HALF * 2)) * size}px`;
    burst.style.top = `${((WORLD_HALF - y) / (WORLD_HALF * 2)) * size}px`;
    burst.replaceChildren();
    for (let k = 0; k < 16; k++) {
      const piece = document.createElement('span');
      const angle = (k / 16) * Math.PI * 2;
      const dist = 46 + Math.random() * 40;
      piece.style.background = BURST_COLORS[k % BURST_COLORS.length]!;
      piece.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      piece.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      piece.style.setProperty('--rot', `${Math.random() * 360}deg`);
      burst.appendChild(piece);
    }
  };

  const drawGuide = () => {
    const canvas = guideRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(1, Math.round(stage.clientWidth * dpr));
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);
    const result = guideResultRef.current;
    if (!result) return;
    const scale = px / (WORLD_HALF * 2);
    ctx.setTransform(scale, 0, 0, -scale, px / 2, px / 2);
    ctx.strokeStyle = 'rgba(43, 155, 244, 0.38)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 12]);
    for (const e of result.events) {
      if (e.type === 'clear') ctx.clearRect(-WORLD_HALF, -WORLD_HALF, WORLD_HALF * 2, WORLD_HALF * 2);
      if (e.type !== 'line') continue;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    }
  };

  const applyBackground = (color: string) => {
    backgroundRef.current = color;
    const stage = stageRef.current;
    if (!stage) return;
    const isDefault = color.toLowerCase() === DEFAULT_BACKGROUND;
    stage.style.backgroundColor = color;
    stage.style.backgroundImage = isDefault ? '' : 'none';
  };

  useEffect(() => {
    const player = new Player(canvasRef.current!, {
      onSprite: placeTurtle,
      onLine: (line) => callbacks.current.onLine(line),
      onPrint: (text) => callbacks.current.onPrint(text),
      onBackground: applyBackground,
      onShow: showScore,
      onGameOver: () => callbacks.current.onGameOver(),
      onStatus: (status) => {
        if (status === 'done' && lastStatusRef.current === 'playing' && !gameRef.current) celebrate();
        lastStatusRef.current = status;
        callbacks.current.onStatus(status);
      },
    });
    playerRef.current = player;

    const observer = new ResizeObserver(() => {
      player.resize();
      drawGuide();
      placeTurtle(spriteRef.current, false);
    });
    observer.observe(stageRef.current!);
    return () => {
      observer.disconnect();
      player.destroy();
      playerRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    load: (result) => {
      gameRef.current = false;
      playerRef.current?.load(result);
    },
    appendEvents: (events) => {
      gameRef.current = true;
      playerRef.current?.append(events);
    },
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    step: () => playerRef.current?.step(),
    finish: () => playerRef.current?.finish(),
    reset: () => {
      gameRef.current = false;
      playerRef.current?.reset();
    },
    setSpeed: (speed) => playerRef.current?.setSpeed(speed),
    pending: () => playerRef.current?.pending() ?? 0,
    setGuide(result) {
      guideResultRef.current = result;
      drawGuide();
    },
    toPNG() {
      const source = canvasRef.current!;
      const out = document.createElement('canvas');
      out.width = source.width;
      out.height = source.height;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = backgroundRef.current;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(source, 0, 0);
      return out.toDataURL('image/png');
    },
  }));

  return (
    <div ref={stageRef} className="stage" role="img" aria-label="Turtle drawing area">
      <canvas ref={guideRef} aria-hidden="true" />
      <canvas ref={canvasRef} />
      <div ref={burstRef} className="burst" aria-hidden="true" />
      <div ref={scoreRef} className="scoreboard" role="status" aria-live="polite" hidden />
      <div ref={turtleRef} className="turtle is-idle">
        <TurtleSprite mood={mood} stickers={stickers} />
      </div>
    </div>
  );
});
