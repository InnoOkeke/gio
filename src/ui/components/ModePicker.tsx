import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { MODE_LABEL, useMode, type AgeMode } from '../mode';
import { Wordmark } from './GioMark';
import { TurtleSprite } from './TurtleSprite';

const CARDS: { id: AgeMode; age: string; blurb: string; tags: string[]; tint: string; art: 'blocks' | 'code' }[] = [
  {
    id: 'little',
    age: 'Under 8',
    blurb: 'Snap colourful blocks together, or just say what to draw.',
    tags: ['Blocks', 'Talk to the turtle', 'Picture quests'],
    tint: 'linear-gradient(160deg, #fff4cc 0%, #ffe08a 100%)',
    art: 'blocks',
  },
  {
    id: 'coder',
    age: '8 to 12',
    blurb: 'Write real code, then see it in Python and JavaScript.',
    tags: ['Logo', 'Python', 'JavaScript', 'Coding quests'],
    tint: 'linear-gradient(160deg, #e1f7ec 0%, #b7ecd3 100%)',
    art: 'code',
  },
];

function BlocksArt() {
  const blocks = [
    { w: 120, c: '#12a36b', t: 'forward 50' },
    { w: 96, c: '#2b9bf4', t: 'turn right' },
    { w: 140, c: '#7a4cf0', t: 'repeat 4' },
  ];
  return (
    <div className="flex flex-col gap-1.5 items-start" aria-hidden="true">
      {blocks.map((b, k) => (
        <div
          key={b.t}
          className="h-9 rounded-[12px] px-3 flex items-center text-white text-[15px] font-extrabold shadow-[0_3px_0_rgba(0,0,0,0.18)]"
          style={{ width: b.w + 40, background: b.c, marginLeft: k === 2 ? 0 : 0 }}
        >
          {b.t}
        </div>
      ))}
    </div>
  );
}

function CodeArt() {
  return (
    <div className="rounded-[14px] bg-white/80 px-3 py-2.5 font-mono text-[14px] leading-[1.6] font-bold shadow-[0_3px_0_rgba(0,0,0,0.08)]" aria-hidden="true">
      <div>
        <span className="text-[#7a4cf0]">REPEAT</span> <span className="text-[#1e6fd9]">4</span> [<span className="text-[#0b7a4f]">FD</span> <span className="text-[#1e6fd9]">50</span> <span className="text-[#0b7a4f]">RT</span> <span className="text-[#1e6fd9]">90</span>]
      </div>
      <div className="text-[#8b8574]">↓ Python</div>
      <div>
        <span className="text-[#7a4cf0]">for</span> i <span className="text-[#7a4cf0]">in</span> range(<span className="text-[#1e6fd9]">4</span>):
      </div>
    </div>
  );
}

export function ModePicker() {
  const { setMode } = useMode();
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => firstRef.current?.focus(), []);

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-5 py-10 gap-8">
      <Wordmark />
      <div className="text-center flex flex-col items-center gap-3">
        <div className="w-20 h-20 turtle is-happy" style={{ position: 'static', margin: 0 }} aria-hidden="true">
          <TurtleSprite />
        </div>
        <h1 className="m-0 text-[34px] sm:text-[44px] font-black leading-[1.05] tracking-tight">Who's coding today?</h1>
        <p className="m-0 text-[18px] font-semibold text-ink-2">Pick one. You can switch any time.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 w-full max-w-[860px]">
        {CARDS.map((c, k) => (
          <button
            key={c.id}
            ref={k === 0 ? firstRef : undefined}
            type="button"
            onClick={() => setMode(c.id)}
            className="group text-left rounded-[32px] p-6 sm:p-7 border-0 cursor-pointer shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-3)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 active:scale-[0.98] flex flex-col gap-5 min-h-[340px]"
            style={{ background: c.tint }}
          >
            <span className="inline-flex self-start items-center rounded-full bg-white/80 px-3 py-1 text-[14px] font-black text-ink">{c.age}</span>
            <div className="flex-1 flex items-center">{c.art === 'blocks' ? <BlocksArt /> : <CodeArt />}</div>
            <div className="flex flex-col gap-2">
              <span className="text-[28px] font-black leading-tight text-ink">{MODE_LABEL[c.id]}</span>
              <span className="text-[17px] font-semibold text-ink-2">{c.blurb}</span>
              <span className="flex flex-wrap gap-1.5 mt-1">
                {c.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/70 px-2.5 py-1 text-[13px] font-extrabold text-ink-2">
                    {t}
                  </span>
                ))}
              </span>
            </div>
          </button>
        ))}
      </div>
      <Link to="/privacy" className="text-[14px] font-extrabold text-ink-3 underline underline-offset-4">
        Privacy for parents
      </Link>
    </div>
  );
}
