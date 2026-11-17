/**
 * A fast, local list of words GIO never sends to the AI. It only catches the obvious cases and
 * costs nothing; the Qwen moderation check (moderation.ts) judges everything else.
 *
 * Matching works on whole words, so innocent words that merely contain a bad one ("class",
 * "assassin", "Scunthorpe", "shiitake", "Essex") are never blocked. Simple tricks are undone first:
 * capital letters, accents, number or symbol look-alikes (sh1t, $ex), separators (f.u.c.k, f u c k),
 * stretched letters (fuuuuck) and a star for a hidden letter (f*ck).
 *
 * Words that are rude but also ordinary (hell, damn, kill, gun, weed, cock) are left to the AI check,
 * because "kill the dragon" in a game or "a rooster, the cock of the walk" can be fine for children.
 */

/** Blocked as whole words, together with the endings in SUFFIXES (shit, shits, shitty ...). */
const STEMS = ['shit', 'piss', 'wank', 'bollock', 'cunt', 'twat', 'jizz', 'porn', 'dildo', 'blowjob', 'handjob'];
const SUFFIXES = ['', 's', 'es', 'ed', 'ing', 'er', 'ers', 'y', 'ty'];

/** Blocked as whole words, exactly as written. */
const EXACT = [
  // Swearing and insults
  'ass', 'asses', 'asshole', 'assholes', 'dumbass', 'arse', 'arsehole', 'bastard', 'bastards', 'slut', 'sluts', 'slutty', 'retard', 'retarded', 'fag', 'fags', 'nigga', 'niggas', 'wtf', 'stfu',
  // Sex and nudity
  'sex', 'sexy', 'sexual', 'sexting', 'nude', 'nudes', 'nudity', 'boob', 'boobs', 'boobies', 'tits', 'titty', 'titties', 'penis', 'vagina', 'vulva', 'pussy', 'pussies', 'anus', 'cum', 'cums', 'orgasm', 'orgasms', 'horny', 'hentai', 'xxx',
  // Abuse
  'rape', 'raped', 'rapes', 'rapist', 'rapists', 'molest', 'molester', 'pedophile', 'paedophile', 'pedo', 'incest', 'masturbate', 'masturbates', 'masturbating', 'masturbation', 'porno', 'pornography', 'pornographic', 'shite',
  // Drugs, hate and self-harm
  'cocaine', 'heroin', 'meth', 'marijuana', 'cannabis', 'swastika', 'hitler', 'suicide', 'suicidal', 'kys',
  // French, Spanish and Nigerian Pidgin
  'putain', 'merde', 'connard', 'connasse', 'salope', 'encule', 'enculer', 'niquer', 'puta', 'puto', 'mierda', 'joder', 'pendejo', 'pendeja', 'cabron', 'verga', 'culo', 'ashawo', 'oloshi',
];

/** Blocked anywhere inside a word: these never appear in an innocent word. */
const INSIDE = ['fuck', 'bitch', 'nigger', 'faggot', 'whore'];

/** Blocked as a run of words. */
const PHRASES = ['kill myself', 'kill my self', 'kill yourself', 'hang myself', 'cut myself', 'sex toy', 'blow job', 'hand job'];

const LOOK_ALIKES: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** Collapses every run of the same letter to one letter ("fuuuck" and "fuck" both become "fuck"). */
const squeeze = (word: string): string => word.replace(/(.)\1+/g, '$1');

const WORDS = new Set<string>([...EXACT, ...STEMS.flatMap((stem) => SUFFIXES.map((end) => stem + end))]);
// Stretched words are compared in squeezed form, so a word must be stretched (3+ of one letter) to use these.
const SQUEEZED_WORDS = new Set([...WORDS, ...INSIDE].map(squeeze));
const WILDCARD_CANDIDATES = [...WORDS, ...INSIDE];

function isBadWord(word: string): boolean {
  if (!word) return false;
  if (WORDS.has(word) || INSIDE.some((bad) => word.includes(bad))) return true;
  if (/(.)\1\1/.test(word) && SQUEEZED_WORDS.has(squeeze(word))) return true;
  // f*ck: a star stands for one hidden letter. Needs two real letters so maths like "4*5" is left alone.
  if (word.includes('*') && word.replace(/[^a-z]/g, '').length >= 2) {
    const pattern = new RegExp(`^${word.replace(/\*/g, '[a-z]')}$`);
    return WILDCARD_CANDIDATES.some((bad) => bad.length === word.length && pattern.test(bad));
  }
  return false;
}

/** The ways one written word could be read once tricks are undone. */
function readings(raw: string): string[] {
  const word = raw.replace(/^[^\p{L}\p{N}@$*]+|[^\p{L}\p{N}@$*]+$/gu, '');
  if (!/\p{L}/u.test(word)) return [];
  const swapped = word.replace(/[0-9@$!]/g, (c) => LOOK_ALIKES[c] ?? c);
  const out: string[] = [];
  for (const form of new Set([word, swapped])) {
    out.push(form.replace(/[^\p{L}*]/gu, '')); // f.u.c.k, f-u-c-k, f_u_c_k
    out.push(...form.split(/[^\p{L}*]+/u)); // fuck-you, draw_ass
  }
  // In Logo, :a*:b multiplies two variables, so outside plain text a star is not a hidden letter.
  return out.filter((w) => w && !(raw.includes(':') && w.includes('*')));
}

/** True when the text contains a word GIO never sends to the AI. */
export function isBlocked(text: string): boolean {
  const folded = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  const rawWords = folded.split(/\s+/).filter(Boolean);

  if (rawWords.some((raw) => readings(raw).some(isBadWord))) return true;

  // s e x: three or more single letters in a row, read as one word.
  const letters = rawWords.map((raw) => raw.replace(/[^\p{L}]/gu, ''));
  for (let i = 0; i < letters.length; i++) {
    let j = i;
    while (j < letters.length && letters[j]!.length === 1) j++;
    if (j - i >= 3 && isBadWord(letters.slice(i, j).join(''))) return true;
    if (j > i) i = j - 1;
  }

  const plain = ` ${folded.replace(/[^\p{L}\s]+/gu, ' ').replace(/\s+/g, ' ').trim()} `;
  return PHRASES.some((phrase) => plain.includes(` ${phrase} `));
}
