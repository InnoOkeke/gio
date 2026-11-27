import { TurtleSprite } from './TurtleSprite';
import { useT } from '../lang';

export interface CertificateStage {
  number: number;
  /** The stage's colour. */
  stamp: string;
  /** Sailed stages have a solid ring, tested-out stages a dashed one. */
  kind: 'sailed' | 'tested';
}

interface CertificateArtProps {
  /** The typed name. Empty leaves a line to write on. */
  name: string;
  total: number;
  stages: readonly CertificateStage[];
  /** For example "20 stages sailed, 2 tested out". */
  tally: string;
  /** The date the last stage was finished, already formatted. */
  date: string;
}

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const GOLD = '#a8741a';
const INK = '#17261f';

/** The name gets smaller as it gets longer, so forty characters still fit inside the border. */
function nameSize(name: string): number {
  const n = Array.from(name).length;
  return n <= 16 ? 68 : n <= 24 ? 56 : n <= 32 ? 46 : 38;
}

/**
 * The Logo Master certificate as one SVG. System fonts only, dark text on white and no colour that matters:
 * it prints the same in black and white. The caller sizes it, and it keeps its shape.
 */
export function CertificateArt({ name, total, stages, tally, date }: CertificateArtProps) {
  const t = useT();
  const clean = name.trim();
  const gap = 44;
  const start = 550 - ((stages.length - 1) * gap) / 2;
  const summary = t('certificate.summary', { for: clean ? t('certificate.for', { name: clean }) : '', n: total, tally, date: date ? ` ${date}.` : '' });
  return (
    <svg viewBox="0 0 1100 800" className="block h-auto w-full" role="img" aria-label={summary} data-testid="certificate-art" fontFamily={SANS}>
      <rect width="1100" height="800" fill="#ffffff" />
      <rect x="24" y="24" width="1052" height="752" rx="10" fill="none" stroke={GOLD} strokeWidth="7" />
      <rect x="42" y="42" width="1016" height="716" rx="6" fill="none" stroke={GOLD} strokeWidth="2" />

      <svg x="485" y="58" width="130" height="130" aria-hidden="true">
        <TurtleSprite mood="happy" golden />
      </svg>

      <text x="550" y="256" textAnchor="middle" fontFamily={SERIF} fontSize="74" fontWeight="700" fill={INK}>
        {t('certificate.title')}
      </text>
      <text x="550" y="298" textAnchor="middle" fontSize="23" fill="#44554c">
        {t('certificate.given')}
      </text>
      {clean && (
        <text x="550" y="376" textAnchor="middle" fontFamily={SERIF} fontSize={nameSize(clean)} fontStyle="italic" fontWeight="700" fill={INK}>
          {clean}
        </text>
      )}
      <line x1="210" y1="392" x2="890" y2="392" stroke={INK} strokeWidth="1.6" />
      <text x="550" y="440" textAnchor="middle" fontSize="28" fontWeight="700" fill={INK}>
        {t('certificate.finished', { n: total })}
      </text>
      <text x="550" y="478" textAnchor="middle" fontSize="22" fill="#44554c">
        {tally}
        {date ? ` · ${date}` : ''}
      </text>

      <g aria-hidden="true">
        {stages.map((s, i) => {
          const cx = start + i * gap;
          return (
            <g key={s.number}>
              <circle cx={cx} cy="548" r="17" fill="#ffffff" stroke={s.stamp} strokeWidth="4.5" strokeDasharray={s.kind === 'tested' ? '5 4' : undefined} />
              <text x={cx} y="554" textAnchor="middle" fontSize={s.number > 9 ? 15 : 17} fontWeight="800" fill={INK}>
                {s.number}
              </text>
            </g>
          );
        })}
      </g>

      <text x="550" y="620" textAnchor="middle" fontFamily={SERIF} fontSize="18" fontStyle="italic" fill="#44554c">
        {t('certificate.history1')}
      </text>
      <text x="550" y="645" textAnchor="middle" fontFamily={SERIF} fontSize="18" fontStyle="italic" fill="#44554c">
        {t('certificate.history2')}
      </text>

      <line x1="150" y1="716" x2="450" y2="716" stroke={INK} strokeWidth="1.4" />
      <text x="300" y="738" textAnchor="middle" fontSize="15" fill="#44554c">
        {t('certificate.parent')}
      </text>
      <line x1="650" y1="716" x2="950" y2="716" stroke={INK} strokeWidth="1.4" />
      <text x="800" y="738" textAnchor="middle" fontSize="15" fill="#44554c">
        {t('certificate.date')}
      </text>
    </svg>
  );
}
