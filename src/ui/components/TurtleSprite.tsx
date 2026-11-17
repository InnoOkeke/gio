/** The turtle on the stage, drawn facing up (heading 0). Rotation is applied by the stage. */
export function TurtleSprite() {
  return (
    <svg viewBox="-60 -60 120 120" width="100%" height="100%" aria-hidden="true" className="turtle-body">
      <g className="turtle-legs">
        <ellipse cx="-30" cy="-20" rx="13" ry="9" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(-30 -30 -20)" />
        <ellipse cx="30" cy="-20" rx="13" ry="9" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(30 30 -20)" />
        <ellipse cx="-27" cy="25" rx="12" ry="8" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(30 -27 25)" />
        <ellipse cx="27" cy="25" rx="12" ry="8" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" transform="rotate(-30 27 25)" />
      </g>
      <path d="M -6 40 L 0 52 L 6 40 Z" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="0" cy="-44" r="14" fill="#5fd39b" stroke="#0b7a4f" strokeWidth="3" />
      <circle cx="-5.5" cy="-47" r="3" fill="#0b3d2c" />
      <circle cx="5.5" cy="-47" r="3" fill="#0b3d2c" />
      <ellipse cx="0" cy="0" rx="34" ry="40" fill="#ffd166" stroke="#0b7a4f" strokeWidth="3.5" />
      <path d="M 0 -15 L 13 -7.5 L 13 7.5 L 0 15 L -13 7.5 L -13 -7.5 Z" fill="#ffe8a3" stroke="#e8962a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 0 -15 L 0 -38 M 13 -7.5 L 31 -16 M 13 7.5 L 31 16 M 0 15 L 0 38 M -13 7.5 L -31 16 M -13 -7.5 L -31 -16" stroke="#e8962a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
