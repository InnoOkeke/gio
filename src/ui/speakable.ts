/**
 * Turns on-screen text into sentences a speech voice reads well. Kept apart from speech.ts so it can be tested in Node.
 *
 * Voices pause on punctuation, so punctuation is kept: a list or a line without a full stop gets one, Logo
 * brackets become a short pause, and each sentence is spoken on its own (Chrome on Android stops reading
 * a long text after about 15 seconds).
 */

const LOGO_WORDS: [RegExp, string][] = [
  [/\bFD\b/g, 'forward'],
  [/\bBK\b/g, 'back'],
  [/\bRT\b/g, 'right'],
  [/\bLT\b/g, 'left'],
  [/\bPU\b/g, 'pen up'],
  [/\bPD\b/g, 'pen down'],
];

/** The longest piece sent to the voice at once. Short sentences are joined up to this length. */
const MAX_PIECE = 220;

export function speakable(text: string): string[] {
  const lines = text
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, ' ')
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*[•·\-*]\s*/u, '').trim())
    .filter(Boolean)
    // A line that ends without punctuation (a list item, a heading) gets a full stop, so the voice pauses.
    .map((line) => (/[.!?…:;,]$/u.test(line) ? line : `${line}.`));

  let words = lines.join(' ');
  for (const [pattern, word] of LOGO_WORDS) words = words.replace(pattern, word);
  words = words
    // Logo variables and words (:size, "name) are read as the plain word.
    .replace(/(^|[\s[(])[:"](?=\p{L})/gu, '$1')
    // Brackets and arrows are a short pause.
    .replace(/\s*[[\]→⇒]\s*/gu, ', ')
    .replace(/["“”«»]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:…])/gu, '$1')
    .replace(/,\s*([,.!?;:…])/gu, '$1')
    .replace(/^[\s,]+/u, '')
    .trim();
  if (!words) return [];

  const sentences = words.split(/(?<=[.!?…])\s+/u).filter(Boolean);
  const pieces: string[] = [];
  for (const sentence of sentences) {
    const last = pieces.length - 1;
    if (last >= 0 && pieces[last]!.length + sentence.length + 1 <= MAX_PIECE) pieces[last] += ` ${sentence}`;
    else pieces.push(sentence);
  }
  return pieces;
}

/** The voice language for a GIO language: Pidgin is read by a Nigerian English voice when there is one. */
export function voiceLangs(lang: string): string[] {
  const base = lang.toLowerCase();
  if (base === 'pcm') return ['en-ng', 'en'];
  return [base];
}