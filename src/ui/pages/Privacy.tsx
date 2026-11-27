import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../components/GioMark';
import { LanguageButton } from '../components/LanguageButton';
import { useT } from '../lang';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[20px] font-black m-0">{title}</h2>
      <div className="text-[16px] font-semibold text-ink-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** A paragraph whose message marks storage keys and Logo words as <code>…</code>. Nothing else is read as markup. */
function Para({ text }: { text: string }) {
  const parts = text.split(/<code>(.*?)<\/code>/);
  return <p className="m-0">{parts.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}</p>;
}

/** The sections of the page and their paragraphs, as message keys. */
const SECTIONS: readonly { title: string; paras: readonly string[] }[] = [
  { title: 'privacy.s.accounts', paras: ['privacy.accounts'] },
  { title: 'privacy.s.server', paras: ['privacy.server1', 'privacy.server2', 'privacy.server3'] },
  { title: 'privacy.s.browser', paras: ['privacy.browser1', 'privacy.lang', 'privacy.firstWin', 'privacy.stages', 'privacy.certificate'] },
  { title: 'privacy.s.adventure', paras: ['privacy.adventure'] },
  { title: 'privacy.s.daily', paras: ['privacy.daily1', 'privacy.daily2', 'privacy.daily3'] },
  { title: 'privacy.s.files', paras: ['privacy.files'] },
  { title: 'privacy.s.sound', paras: ['privacy.sound'] },
  { title: 'privacy.s.python', paras: ['privacy.python1', 'privacy.python2', 'privacy.python3'] },
  { title: 'privacy.s.offline', paras: ['privacy.offline1', 'privacy.offline2', 'privacy.offline3', 'privacy.offline4'] },
  { title: 'privacy.s.ai', paras: ['privacy.ai1', 'privacy.ai2', 'privacy.ai3', 'privacy.ai4'] },
  { title: 'privacy.s.voice', paras: ['privacy.voice'] },
  { title: 'privacy.s.limits', paras: ['privacy.limits1', 'privacy.limits2'] },
];

/** A plain-language page for parents and teachers. Every statement here matches what the code does. */
export default function Privacy() {
  const t = useT();
  return (
    <div className="safe-page min-h-full flex items-start justify-center [--page-pad:12px] sm:[--page-pad:24px]">
      <main className="panel max-w-2xl w-full min-w-0 p-5 sm:p-8 flex flex-col gap-6 break-words">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Wordmark />
          <Link to="/" className="btn btn-primary min-h-[48px] max-sm:w-full">
            {t('btn.backToDrawing')}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-black m-0">{t('privacy.title')}</h1>
          <p className="m-0 text-[16px] font-semibold text-ink-2">{t('privacy.intro')}</p>
        </div>

        {SECTIONS.map((s) => (
          <Section key={s.title} title={t(s.title)}>
            {s.paras.map((key) => (
              <Para key={key} text={t(key)} />
            ))}
          </Section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[16px] font-semibold text-ink-3">{t('privacy.licence')}</p>
          <LanguageButton />
        </div>
      </main>
    </div>
  );
}
