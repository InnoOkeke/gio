import { useState, type FormEvent } from 'react';
import type { AgeMode } from '../mode';
import { useVoice } from '../voice';
import { MicIcon, SparkleIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

const IDEAS: Record<AgeMode, string[]> = {
  little: ['a big square', 'a star', 'a rainbow', 'a flower', 'a house', 'stairs'],
  coder: ['a rainbow flower', 'a smiling sun', 'a spiral of squares', 'a snowflake', 'a house with a tree', 'a starry night'],
};

interface AskTurtleProps {
  mode: AgeMode;
  hasCode: boolean;
  busy: boolean;
  /** Resolves true when the turtle drew it, so the box can clear for the next idea. */
  onAsk(prompt: string): Promise<boolean>;
}

export function AskTurtle({ mode, hasCode, busy, onAsk }: AskTurtleProps) {
  const [prompt, setPrompt] = useState('');
  const little = mode === 'little';

  const send = (text: string) => {
    setPrompt(text);
    void onAsk(text).then((done) => done && setPrompt(''));
  };

  const voice = useVoice((text) => !busy && send(text));

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    send(text);
  };

  const title = hasCode ? (little ? 'Change my drawing!' : 'What should I change?') : 'What should I draw?';
  const subtitle = little
    ? voice.supported
      ? 'Tap the microphone and tell me!'
      : 'Type it, or tap an idea!'
    : hasCode
      ? 'Tell me in your own words, and I\u2019ll update your code.'
      : 'Say it in your own words. I\u2019ll write the Logo code, and you can change it.';

  return (
    <section className="ask px-5 py-5 sm:px-7 sm:py-6" aria-labelledby="ask-title">
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 p-1.5" aria-hidden="true">
            <TurtleSprite />
          </div>
          <div>
            <h2 id="ask-title" className="text-[22px] sm:text-[26px] font-black leading-tight tracking-tight">
              {title}
            </h2>
            <p className="text-[15px] font-semibold text-white/85">{subtitle}</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          {voice.supported && (
            <button
              type="button"
              className={`btn ${little ? 'btn-lg w-full sm:w-[72px] sm:px-0' : 'btn-icon min-h-[56px] w-[56px]'} bg-[#ffc93c] text-[#5a3b00] shadow-[0_4px_0_#c99a1a] ${voice.listening ? 'mic-live' : ''}`}
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              disabled={busy}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? 'Stop listening' : 'Talk to the turtle'}
            >
              <MicIcon size={little ? 30 : 24} />
              {little && <span className="sm:hidden">{voice.listening ? 'Listening…' : 'Talk to me'}</span>}
            </button>
          )}
          <label htmlFor="ask-input" className="sr-only">
            Describe a drawing
          </label>
          <input
            id="ask-input"
            className="ask-input flex-1"
            value={voice.listening ? voice.heard : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={voice.listening ? 'I\u2019m listening…' : hasCode ? 'e.g. make it rainbow coloured' : little ? 'e.g. a big star' : 'e.g. a flower with 8 petals'}
            maxLength={500}
            autoComplete="off"
            disabled={busy || voice.listening}
          />
          <button type="submit" className="btn btn-lg bg-white text-[#0b7a4f] shadow-[0_4px_0_rgba(8,60,40,0.35)]" disabled={busy || !prompt.trim() || voice.listening}>
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

        {voice.error && (
          <p className="m-0 text-[15px] font-bold text-white" role="alert">
            {voice.error}
          </p>
        )}

        {!hasCode && (
          <div className="flex flex-wrap gap-2" aria-label="Ideas">
            {IDEAS[mode].map((idea) => (
              <button key={idea} type="button" className="chip chip-suggestion" disabled={busy} onClick={() => send(idea)}>
                {idea}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
