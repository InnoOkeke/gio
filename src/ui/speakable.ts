import type { Lang } from '../i18n/types.js';
import { ENGLISH_WORDS, LOCAL_WORDS } from '../logo/word-table.js';

/**
 * Turns on-screen text into sentences a speech voice reads well. Kept apart from speech.ts so it can be tested in Node.
 *
 * Voices pause on punctuation, so punctuation is kept: a list or a line without a full stop gets one, Logo
 * brackets become a short pause, and each sentence is spoken on its own (Chrome on Android stops reading
 * a long text after about 15 seconds).
 */

/**
 * Logo words joined into one (LEVELECRAYON, SUBELAPIZ, PENUP) read as the words they are made of.
 * Any other Logo word is read in lower case, because some voices spell out a word in capitals letter by letter.
 */
const SPOKEN: Record<Lang, Record<string, string>> = {
  en: {
    PENUP: 'pen up', PENDOWN: 'pen down', CLEARSCREEN: 'clear screen', SETPENCOLOR: 'set pen colour', SETPENSIZE: 'set pen size',
    SETBACKGROUND: 'set background', SETHEADING: 'set heading', HIDETURTLE: 'hide turtle', SHOWTURTLE: 'show turtle',
    GAMEOVER: 'game over', REPCOUNT: 'repeat count', IFELSE: 'if else', SETTEMPO: 'set tempo', SETXY: 'set x y',
  },
  fr: {
    LEVELECRAYON: 'lève le crayon', BAISSELECRAYON: 'baisse le crayon', EFFACEECRAN: 'efface l’écran', FIXECOULEUR: 'fixe la couleur',
    FIXEEPAISSEUR: 'fixe l’épaisseur', FIXEFOND: 'fixe le fond', FIXECAP: 'fixe le cap', FIXEXY: 'fixe x y', CACHETORTUE: 'cache la tortue',
    MONTRETORTUE: 'montre la tortue', FINDUJEU: 'fin du jeu', REPETE: 'répète', ECRIS: 'écris', ARRETE: 'arrête', ORDONNEE: 'ordonnée',
    SISINON: 'si sinon', RACINE: 'racine',
  },
  es: {
    SUBELAPIZ: 'sube el lápiz', BAJALAPIZ: 'baja el lápiz', BORRAPANTALLA: 'borra la pantalla', PONCOLOR: 'pon color', PONGROSOR: 'pon grosor',
    PONFONDO: 'pon fondo', PONRUMBO: 'pon rumbo', PONPOS: 'pon posición', OCULTATORTUGA: 'oculta la tortuga', MUESTRATORTUGA: 'muestra la tortuga',
    FINJUEGO: 'fin del juego', CIRCULO: 'círculo', RAIZ: 'raíz', SISINO: 'si sino', RETROCEDE: 'retrocede',
  },
  pcm: {
    COMEBACK: 'come back', LIFTPEN: 'lift pen', DROPPEN: 'drop pen', PENCOLOUR: 'pen colour', PENFAT: 'pen fat', BACKCOLOUR: 'back colour',
    JUMPXY: 'jump x y', HIDEMAN: 'hide man', SHOWMAN: 'show man', GAMEDONE: 'game done', WHICHROUND: 'which round',
    WHERETOFACE: 'where to face', DOAGAIN: 'do again',
  },
};

/** Every Logo word a text in this language may hold (its own, and the English ones), mapped to how it is said. */
const wordCache = new Map<Lang, Map<string, string>>();
function logoWords(lang: Lang): Map<string, string> {
  const hit = wordCache.get(lang);
  if (hit) return hit;
  const say = (word: string) => SPOKEN[lang][word] ?? SPOKEN.en[word] ?? word.toLowerCase();
  const out = new Map<string, string>();
  for (const [canon, english] of Object.entries(ENGLISH_WORDS)) {
    const local = LOCAL_WORDS[lang][canon];
    const spoken = local ? say(local[0]!) : say(canon);
    for (const w of english) out.set(w, spoken);
    for (const w of local ?? []) out.set(w, spoken);
  }
  wordCache.set(lang, out);
  return out;
}

/** The longest piece sent to the voice at once. Short sentences are joined up to this length. */
const MAX_PIECE = 220;

export function speakable(text: string, lang: Lang = 'en'): string[] {
  const lines = text
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, ' ')
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*[•·\-*]\s*/u, '').trim())
    .filter(Boolean)
    // A line that ends without punctuation (a list item, a heading) gets a full stop, so the voice pauses.
    .map((line) => (/[.!?…:;,]$/u.test(line) ? line : `${line}.`));

  let words = lines.join(' ');
  const known = logoWords(lang);
  // Only words in capitals: a Logo word written in a sentence is always in capitals (FD 100, REPEAT 4).
  words = words.replace(/\b[A-Z][A-Z0-9]*\b/g, (w) => known.get(w) ?? w);
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