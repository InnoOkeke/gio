import { pluralIn, translator, type Lang } from '../../i18n/index.js';
/**
 * The Logo Master certificate keeps one thing in the browser: the name a child or grown-up types onto it.
 * It lives in localStorage under `gio.certificate`, is never sent anywhere and never goes into a link.
 */
export const NAME_MAX = 40;

export interface CertificateStore {
  v: 1;
  name: string;
}

export function emptyCertificate(): CertificateStore {
  return { v: 1, name: '' };
}

/** Make typed text safe to keep: no control characters, single spaces, no leading space, at most 40 characters. */
export function cleanName(raw: string): string {
  const spaced = Array.from(raw, (ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code < 32 || (code >= 127 && code < 160) ? ' ' : ch;
  }).join('');
  const flat = spaced.replace(/\s+/g, ' ').trimStart();
  return Array.from(flat).slice(0, NAME_MAX).join('');
}

/** Read stored data without ever throwing. Anything unexpected is an empty name. */
export function parseCertificate(raw: unknown): CertificateStore {
  if (typeof raw !== 'object' || raw === null) return emptyCertificate();
  const name = (raw as { name?: unknown }).name;
  return { v: 1, name: typeof name === 'string' ? cleanName(name).trim() : '' };
}

/** How many stages were sailed and how many were tested out, from the stage list of one mode. */
export function stageTally(views: readonly { sailed: boolean; tested: boolean }[]): { sailed: number; tested: number } {
  const sailed = views.filter((v) => v.sailed).length;
  return { sailed, tested: views.filter((v) => v.tested && !v.sailed).length };
}

/** "20 stages sailed" or "18 stages sailed, 2 tested out". */
export function tallyLine(tally: { sailed: number; tested: number }, lang: Lang = 'en'): string {
  const sailed = pluralIn(lang, 'certificate.stages', tally.sailed);
  return tally.tested > 0 ? translator(lang)('certificate.tested', { sailed, n: tally.tested }) : sailed;
}

/** A date key such as 2026-06-14 as a long date. An invalid key gives an empty string. */
export function formatEarned(dateKey: string, locale?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}
