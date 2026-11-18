import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_FIRST_COLOUR, FIRST_WIN_COLOURS, type BlockColour } from '../first-win';
import type { AgeMode } from '../mode';
import { CheckIcon, SparkleIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

/** off: not offered. offer: the big button. drawing: the turtle is drawing the star. yours: pick a colour. */
export type FirstWinPhase = 'off' | 'offer' | 'drawing' | 'yours';

/** What Gio says in each phase. These go through the speech bubble, so Little Turtles hear them. */
export const FIRST_WIN_TEXT: Record<AgeMode, { offer: string; drawing: string; yours: string }> = {
  little: {
    offer: 'Hello! Tap the big button and I will draw you a star.',
    drawing: 'Watch me draw a star!',
    yours: 'Now make it yours! Pick a colour.',
  },
  coder: {
    offer: 'Welcome! One tap and I will draw your first picture. The code appears right here for you to change.',
    drawing: 'Watch me draw a star!',
    yours: 'Now make it yours! Pick a colour, or change the code yourself.',
  },
};

/** The first win's phases and the colour the child has chosen. */
export function useFirstWin(offered: boolean) {
  const [phase, setPhase] = useState<FirstWinPhase>(offered ? 'offer' : 'off');
  const [colour, setColour] = useState<BlockColour>(DEFAULT_FIRST_COLOUR);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const begin = useCallback(() => setPhase('drawing'), []);
  const showYours = useCallback(() => setPhase('yours'), []);
  const end = useCallback(() => setPhase('off'), []);
  return { phase, phaseRef, colour, setColour, begin, showYours, end };
}

interface OfferProps {
  mode: AgeMode;
  onStart(): void;
  onSkip(): void;
}

/** One huge button laid over the empty stage. Nothing to type, nothing to choose. */
export function FirstWinOffer({ mode, onStart, onSkip }: OfferProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const little = mode === 'little';

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label="Your first drawing"
      className="first-win-offer absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[rgba(255,255,255,0.88)] p-4 backdrop-blur-[3px]"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onSkip();
      }}
    >
      <div className="w-24 h-24 sm:w-28 sm:h-28" aria-hidden="true">
        <TurtleSprite mood="cheer" />
      </div>
      <div className="first-win-ring-wrap relative w-full max-w-[320px]">
        <span className="first-win-ring" aria-hidden="true" />
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-primary relative w-full min-h-[80px] px-5 text-[24px] font-black leading-tight"
          onClick={onStart}
        >
          <SparkleIcon size={30} />
          {little ? 'Draw a star!' : 'Make your first drawing'}
        </button>
      </div>
      <button type="button" className="btn btn-ghost min-h-[48px] min-w-[48px] px-4 text-[16px] font-extrabold text-ink-2" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}

interface YoursProps {
  mode: AgeMode;
  colour: BlockColour;
  onPick(colour: BlockColour): void;
  onAsk(): void;
  onDone(): void;
}

/** After the star is drawn: six colours, a way to ask for something else, and Done. */
export function FirstWinYours({ mode, colour, onPick, onAsk, onDone }: YoursProps) {
  const regionRef = useRef<HTMLElement>(null);
  const little = mode === 'little';

  // Move focus into the card so keyboard and screen reader users land on the new choices.
  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      aria-labelledby="first-win-yours"
      className="first-win-yours rounded-[24px] border-2 border-[#9bdcbc] bg-[var(--green-soft)] p-4 outline-none focus-visible:ring-4 focus-visible:ring-[#ffc93c]"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone();
      }}
    >
      <h3 id="first-win-yours" className="m-0 text-[22px] font-black text-[var(--green-deep)]">
        Now make it yours!
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6" role="group" aria-label="Pick a colour for your star">
        {FIRST_WIN_COLOURS.map((c) => {
          const on = c.name === colour;
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={on}
              aria-label={`${c.name} star`}
              onClick={() => onPick(c.name)}
              className={`first-win-swatch grid h-14 w-14 justify-self-center place-items-center rounded-full border-4 ${on ? 'border-[#17261f]' : 'border-white'}`}
              style={{ backgroundColor: c.hex }}
            >
              {on && <CheckIcon size={26} className={c.name === 'yellow' ? 'text-[#17261f]' : 'text-white'} />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-quiet min-h-[48px]" onClick={onAsk}>
          {little ? 'Or tell me what to draw' : 'Or change the code yourself'}
        </button>
        <button type="button" className="btn btn-primary min-h-[48px] ml-auto" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  );
}
