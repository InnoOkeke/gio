/** Named colours kids are likely to type, tuned to look good on a light canvas. */
export const NAMED_COLORS: Record<string, string> = {
  BLACK: '#1f2933',
  WHITE: '#ffffff',
  GRAY: '#8a94a6',
  GREY: '#8a94a6',
  RED: '#ef4444',
  ORANGE: '#f97316',
  YELLOW: '#facc15',
  GOLD: '#eab308',
  GREEN: '#22c55e',
  LIME: '#84cc16',
  TEAL: '#14b8a6',
  CYAN: '#06b6d4',
  SKY: '#38bdf8',
  BLUE: '#3b82f6',
  NAVY: '#1e3a8a',
  PURPLE: '#8b5cf6',
  VIOLET: '#8b5cf6',
  MAGENTA: '#d946ef',
  PINK: '#ec4899',
  BROWN: '#92400e',
};

/** The classic 16-colour Logo palette, so `SETPENCOLOR 4` works as it did in school labs. */
export const PALETTE_16: readonly string[] = [
  '#1f2933', '#3b82f6', '#22c55e', '#06b6d4',
  '#ef4444', '#d946ef', '#facc15', '#ffffff',
  '#92400e', '#d2b48c', '#15803d', '#2dd4bf',
  '#fa8072', '#8b5cf6', '#f97316', '#8a94a6',
];

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}
