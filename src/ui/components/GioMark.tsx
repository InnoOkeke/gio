import { useId } from 'react';

/** The GIO app icon: a happy turtle drawing a sunny line, on a rounded green tile. */
export function GioMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fe0a0" />
          <stop offset="1" stopColor="#0c9a6a" />
        </linearGradient>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#ffd166" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="116" fill={`url(#${id}-glow)`} />
      <path d="M84 418 C 132 346, 196 436, 236 368 S 248 300, 262 292" fill="none" stroke="#ffe066" strokeWidth="24" strokeLinecap="round" />
      <g transform="translate(300 232) rotate(38)">
        <ellipse cx="-74" cy="-46" rx="30" ry="22" fill="#fff" transform="rotate(-30 -74 -46)" />
        <ellipse cx="74" cy="-46" rx="30" ry="22" fill="#fff" transform="rotate(30 74 -46)" />
        <ellipse cx="-68" cy="60" rx="28" ry="20" fill="#fff" transform="rotate(30 -68 60)" />
        <ellipse cx="68" cy="60" rx="28" ry="20" fill="#fff" transform="rotate(-30 68 60)" />
        <path d="M -14 100 L 0 128 L 14 100 Z" fill="#fff" />
        <circle cx="0" cy="-112" r="36" fill="#fff" />
        <circle cx="-13" cy="-120" r="7" fill="#0b3d2c" />
        <circle cx="13" cy="-120" r="7" fill="#0b3d2c" />
        <path d="M -12 -100 Q 0 -90 12 -100" fill="none" stroke="#0b3d2c" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="0" cy="0" rx="88" ry="102" fill={`url(#${id}-shell)`} stroke="#fff" strokeWidth="12" />
        <path d="M 0 -40 L 34 -20 L 34 20 L 0 40 L -34 20 L -34 -20 Z" fill="none" stroke="#f4a72c" strokeWidth="9" strokeLinejoin="round" />
        <path
          d="M 0 -40 L 0 -96 M 34 -20 L 80 -42 M 34 20 L 80 42 M 0 40 L 0 96 M -34 20 L -80 42 M -34 -20 L -80 -42"
          stroke="#f4a72c"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <GioMark size={40} />
      <span className="wordmark-text text-[26px] font-black tracking-tight text-ink leading-none">GIO</span>
    </span>
  );
}
