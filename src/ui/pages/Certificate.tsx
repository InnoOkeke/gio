import { Link } from 'react-router-dom';
import { CertificateArt, type CertificateStage } from '../components/CertificateArt';
import { Wordmark } from '../components/GioMark';
import { useCertificateName } from '../certificate';
import { useMode, type AgeMode } from '../mode';
import { useLang, useT } from '../lang';
import { NAME_MAX, formatEarned, stageTally, tallyLine } from '../path/certificate';
import { stageCount, stageNumber } from '../path/islands';
import { useProgress } from '../progress';

/** The printable Logo Master certificate. The name is typed here and kept only in this browser. */
export default function Certificate() {
  const { mode: chosen } = useMode();
  const t = useT();
  const { lang } = useLang();
  const mode: AgeMode = chosen ?? 'coder';
  const progress = useProgress(mode);
  const { name, setName, forget } = useCertificateName();
  const earnedOn = progress.masterOn;
  const total = stageCount(mode);

  if (earnedOn === null) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
          <Wordmark />
          <h1 className="m-0 text-[24px] font-black leading-tight">{t('certificate.waiting')}</h1>
          <p className="m-0 text-[16px] font-semibold text-ink-2">
            {t('certificate.how', { n: total, mode: t(`mode.${mode}`) })}
          </p>
          <Link to="/" className="btn btn-primary btn-lg">
            {t('btn.backToDrawing')}
          </Link>
        </div>
      </div>
    );
  }

  const stages: CertificateStage[] = progress.islands.flatMap((v): CertificateStage[] =>
    v.sailed || v.tested ? [{ number: stageNumber(v.island), stamp: v.island.stamp, kind: v.sailed ? 'sailed' : 'tested' }] : [],
  );

  return (
    <div className="cert-page safe-page min-h-full flex flex-col items-center gap-5 [--page-pad:16px] sm:[--page-pad:24px]">
      <div className="no-print flex w-full max-w-[920px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Wordmark />
          <Link to="/" className="btn btn-quiet min-h-[48px]">
            {t('btn.backToDrawing')}
          </Link>
        </div>
        <div className="panel flex flex-col gap-3 p-4 sm:p-5">
          <h1 className="m-0 text-[24px] font-black leading-tight">{t('certificate.youAre')}</h1>
          <label htmlFor="cert-name" className="text-[16px] font-extrabold text-ink">
            {t('certificate.typeName')}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('certificate.namePh')}
              className="min-h-[48px] min-w-0 flex-1 max-sm:basis-full rounded-full border border-line bg-white px-5 text-[18px] font-extrabold text-ink outline-none focus:border-[#12a36b]"
            />
            <button type="button" className="btn btn-primary btn-lg max-sm:w-full" onClick={() => window.print()}>
              {t('btn.print')}
            </button>
            <button type="button" className="btn btn-quiet min-h-[48px] max-sm:w-full" onClick={forget} disabled={!name}>
              {t('btn.forgetName')}
            </button>
          </div>
          <p className="m-0 text-[16px] font-semibold text-ink-3">
            {t('certificate.nameNote')}
          </p>
        </div>
      </div>

      <div className="cert-sheet w-full max-w-[920px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-2)]">
        <CertificateArt name={name} total={total} stages={stages} tally={tallyLine(stageTally(progress.islands), lang)} date={formatEarned(earnedOn, lang === 'en' ? undefined : lang)} />
      </div>
    </div>
  );
}
