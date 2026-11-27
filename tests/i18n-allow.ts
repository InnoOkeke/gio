/**
 * Text that may appear as a literal in src/ui/**\/*.tsx without a message key: brand and command names, code
 * shown as code, and decoration. Everything else a child reads goes through t(...).
 */
export const ALLOWED_LITERALS: ReadonlySet<string> = new Set([
  // Brand names
  'GIO',
  'Logo',
  'Python',
  'JavaScript',
  // Logo code shown as code on the first screen's picture
  'REPEAT',
  'FD',
  'RT',
  'PU',
  '↓ Python',
  'for',
  'i',
  'in',
  'range(',
  // Decoration: the sleeping "z z", the number marker on island art, HTML entities for − and ·
  'z',
  'Z',
  'n',
  '&minus;',
  '&middot;',
]);
