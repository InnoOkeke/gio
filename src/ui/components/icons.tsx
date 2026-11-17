import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const StepIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5.5v13a1 1 0 0 0 1.5.86l9.2-6.5a1 1 0 0 0 0-1.72L6.5 4.64A1 1 0 0 0 5 5.5Z" fill="currentColor" stroke="none" />
    <path d="M19 5v14" />
  </Icon>
);

export const ResetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4v4.5H8" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.9 9a1.5 1.5 0 0 0 1 1l5.6 2-5.6 2a1.5 1.5 0 0 0-1 1L12 20.5 10.1 15a1.5 1.5 0 0 0-1-1L3.5 12l5.6-2a1.5 1.5 0 0 0 1-1Z" fill="currentColor" stroke="none" />
    <path d="M19 3v3M17.5 4.5h3" strokeWidth={2} />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12" />
    <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </Icon>
);

export const SaveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4h11l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
    <path d="M8 4v5h7V4" />
    <path d="M8 20v-6h8v6" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 20h14" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TurtleSpeedIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M4 15.5c0-3.6 2.9-6.5 6.5-6.5S17 11.9 17 15.5Z" fill="currentColor" fillOpacity={0.18} />
    <path d="M17 15.5h1.5a2.5 2.5 0 0 0 0-5H17" />
    <path d="M6 15.5 5 18M15 15.5l1 2.5" />
  </Icon>
);

export const RabbitSpeedIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M10 9.5 8.6 4.2a1.3 1.3 0 0 1 2.4-.9L12.5 8" />
    <path d="M13.5 8.3 15 3.6a1.3 1.3 0 0 1 2.4.9l-1.6 5.2" />
    <circle cx="12.5" cy="13.5" r="5.5" fill="currentColor" fillOpacity={0.18} />
    <path d="M11 13h.01M14 13h.01" strokeWidth={2.6} />
  </Icon>
);

export const RocketSpeedIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 2.8c3 2 4.5 5.4 4.5 9.4l-2 3.8h-5l-2-3.8c0-4 1.5-7.4 4.5-9.4Z" fill="currentColor" fillOpacity={0.18} />
    <circle cx="12" cy="10" r="1.7" />
    <path d="M9.5 16 7 19.5l3.4-.8M14.5 16l2.5 3.5-3.4-.8M12 18.2v2.8" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
