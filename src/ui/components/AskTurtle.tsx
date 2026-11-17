import { useState, type FormEvent } from 'react';
import { SparkleIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

const IDEAS = ['a rainbow flower', 'a smiling sun', 'a spiral of squares', 'a snowflake', 'a house with a tree', 'a starry night'];

interface AskTurtleProps {
  hasCode: boolean;
  busy: boolean;
  /** Resolves true when the turtle drew it, so the box can clear for the next idea. */
  onAsk(prompt: string): Promise<boolean>;
}

export function AskTurtle({ hasCode, busy, onAsk }: AskTurtleProps) {
  const [prompt, setPrompt] = useState('');

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    void onAsk(text).then((done) => done && setPrompt(''));
  };

  return (
    <section className="ask px-5 py-5 sm:px-7 sm:py-6" aria-labelledby="ask-title">
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 p-1.5" aria-hidden="true">
            <TurtleSprite />
          </div>
          <div>
            <h2 id="ask-title" className="text-[22px] sm:text-[26px] font-black leading-tight tracking-tight">
              {hasCode ? 'What should I change?' : 'What should I draw?'}
            </h2>
            <p className="text-[15px] font-semibold text-white/85">
              {hasCode ? 'Tell me in your own words, and I\u2019ll update your code.' : 'Say it in your own words. I\u2019ll write the Logo code, and you can change it.'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="ask-input" className="sr-only">
            Describe a drawing
          </label>
          <input
            id="ask-input"
            className="ask-input flex-1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={hasCode ? 'e.g. make it rainbow coloured' : 'e.g. a flower with 8 petals'}
            maxLength={500}
            autoComplete="off"
            disabled={busy}
          />
          <button type="submit" className="btn btn-lg bg-white text-[#0b7a4f] shadow-[0_4px_0_rgba(8,60,40,0.35)]" disabled={busy || !prompt.trim()}>
            {busy ? (
              <span className="thinking-dots" aria-label="Thinking">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <>
                <SparkleIcon size={22} />
                {hasCode ? 'Change it' : 'Draw it'}
              </>
            )}
          </button>
        </form>

        {!hasCode && (
          <div className="flex flex-wrap gap-2" aria-label="Ideas">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                className="chip chip-suggestion"
                disabled={busy}
                onClick={() => {
                  setPrompt(idea);
                  void onAsk(idea).then((done) => done && setPrompt(''));
                }}
              >
                {idea}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
