import { Link } from 'react-router-dom';
import { CertificateArt, type CertificateStage } from '../components/CertificateArt';
import { Wordmark } from '../components/GioMark';
import { useCertificateName } from '../certificate';
import { MODE_LABEL, useMode, type AgeMode } from '../mode';
import { NAME_MAX, formatEarned, stageTally, tallyLine } from '../path/certificate';
import { stageCount, stageNumber } from '../path/islands';
import { useProgress } from '../progress';

/** The printable Logo Master certificate. The name is typed here and kept only in this browser. */
export default function Certificate() {
  const { mode: chosen } = useMode();
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
          <h1 className="m-0 text-[24px] font-black leading-tight">Your Logo Master certificate is waiting</h1>
          <p className="m-0 text-[16px] font-semibold text-ink-2">
            Sail all {total} stages of {MODE_LABEL[mode]} and Gio will give you a printable certificate and a golden shell.
          </p>
          <Link to="/" className="btn btn-primary btn-lg">
            Back to drawing
          </Link>
        </div>
      </div>
    );
  }

  const stages: CertificateStage[] = progress.islands.flatMap((v): CertificateStage[] =>
    v.sailed || v.tested ? [{ number: stageNumber(v.island), stamp: v.island.stamp, kind: v.sailed ? 'sailed' : 'tested' }] : [],
  );

  return (
    <div className="cert-page min-h-full flex flex-col items-center gap-5 p-4 sm:p-6">
      <div className="no-print flex w-full max-w-[920px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Wordmark />
          <Link to="/" className="btn btn-quiet">
            Back to drawing
          </Link>
        </div>
        <div className="panel flex flex-col gap-3 p-5">
          <h1 className="m-0 text-[24px] font-black leading-tight">You are a Logo Master!</h1>
          <label htmlFor="cert-name" className="text-[16px] font-extrabold text-ink">
            Type the name for the certificate
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="off"
              spellCheck={false}
              placeholder="Your name"
              className="min-h-[48px] min-w-0 flex-1 rounded-full border border-line bg-white px-5 text-[18px] font-extrabold text-ink outline-none focus:border-[#12a36b]"
            />
            <button type="button" className="btn btn-primary btn-lg" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="btn btn-quiet" onClick={forget} disabled={!name}>
              Forget my name
            </button>
          </div>
          <p className="m-0 text-[14px] font-semibold text-ink-3">
            The name stays in this browser. It is never sent anywhere or put in a link. Leave it empty to write the name by hand.
          </p>
        </div>
      </div>

      <div className="cert-sheet w-full max-w-[920px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-2)]">
        <CertificateArt name={name} total={total} stages={stages} tally={tallyLine(stageTally(progress.islands))} date={formatEarned(earnedOn)} />
      </div>
    </div>
  );
}
