import { useT } from '../lang';
interface SkillCheckBannerProps {
  /** The name of the stage this check opens. */
  stageName: string;
  /** Which challenge the child is on, counting from 1, and how many there are. */
  position: number;
  total: number;
  /** Help was used, so the check cannot be passed this time. */
  helped: boolean;
  onStop(): void;
}

/** Shown above the quest card during a skill check. It says plainly that help ends the check. */
export function SkillCheckBanner({ stageName, position, total, helped, onStop }: SkillCheckBannerProps) {
  const t = useT();
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[22px] border-2 px-5 py-3.5"
      style={helped ? { background: '#fff4cc', borderColor: '#e8962a' } : { background: '#e3f2ff', borderColor: '#2b9bf4' }}
      aria-label={t('stage.skill.aria')}
      data-testid="skill-banner"
    >
      <div className="min-w-0 flex-1" role="status">
        <p className="m-0 text-[14px] font-black uppercase tracking-[0.08em] text-ink-2">
          {t('stage.skill.title', { stage: stageName, n: position, total })}
        </p>
        <p className="skill-banner-note m-0 mt-0.5 text-[16px] font-extrabold text-ink">
          {helped
            ? t('stage.skill.helped')
            : t('stage.skill.clean')}
        </p>
      </div>
      <button type="button" className="btn btn-quiet shrink-0" onClick={onStop}>
        {t('btn.stopCheck')}
      </button>
    </section>
  );
}
