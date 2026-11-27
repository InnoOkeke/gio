import { useState, type FormEvent } from 'react';
import type { AgeMode } from '../mode';
import { useT } from '../lang';
import { useVoice } from '../voice';
import { MicIcon, SparkleIcon } from './icons';
import { TurtleSprite } from './TurtleSprite';

const IDEA_COUNT = 6;

interface AskTurtleProps {
  mode: AgeMode;
  hasCode: boolean;
  busy: boolean;
  /** Resolves true when the turtle drew it, so the box can clear for the next idea. */
  onAsk(prompt: string): Promise<boolean>;
}

export function AskTurtle({ mode, hasCode, busy, onAsk }: AskTurtleProps) {
  const t = useT();
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

  const ideas = Array.from({ length: IDEA_COUNT }, (_, k) => t(`tutor.idea.${mode}.${k}`));
  const title = hasCode ? (little ? t('tutor.ask.title.changeLittle') : t('tutor.ask.title.change')) : t('tutor.ask.title.draw');
  const subtitle = little
    ? voice.supported
      ? t('tutor.ask.sub.littleVoice')
      : t('tutor.ask.sub.littleType')
    : hasCode
      ? t('tutor.ask.sub.change')
      : t('tutor.ask.sub.new');

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
              aria-label={voice.listening ? t('tutor.ask.stopListening') : t('tutor.ask.talk')}
            >
              <MicIcon size={little ? 30 : 24} />
              {little && <span className="sm:hidden">{voice.listening ? t('tutor.ask.listening') : t('tutor.ask.talkToMe')}</span>}
            </button>
          )}
          <label htmlFor="ask-input" className="sr-only">
            {t('tutor.ask.describe')}
          </label>
          <input
            id="ask-input"
            className="ask-input flex-1"
            value={voice.listening ? voice.heard : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={voice.listening ? t('tutor.ask.ph.listening') : hasCode ? t('tutor.ask.ph.change') : little ? t('tutor.ask.ph.little') : t('tutor.ask.ph.coder')}
            maxLength={500}
            autoComplete="off"
            disabled={busy || voice.listening}
          />
          <button type="submit" className="btn btn-lg bg-white text-[#0b7a4f] shadow-[0_4px_0_rgba(8,60,40,0.35)]" disabled={busy || !prompt.trim() || voice.listening}>
            {busy ? (
              <>
                <span className="thinking-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="sr-only" role="status">
                  {t('tutor.ask.thinking')}
                </span>
              </>
            ) : (
              <>
                <SparkleIcon size={22} />
                {hasCode ? t('tutor.ask.changeIt') : t('tutor.ask.drawIt')}
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
          <div className="flex flex-wrap gap-2" aria-label={t('tutor.ask.ideas')}>
            {ideas.map((idea) => (
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
