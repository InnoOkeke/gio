export interface SourcePos {
  line: number;
  column: number;
}

/**
 * Every problem GIO reports about a Logo program is a LogoError.
 * Messages are written for kids: say what went wrong and what to try.
 */
export class LogoError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, pos: SourcePos) {
    super(message);
    this.name = 'LogoError';
    this.line = pos.line;
    this.column = pos.column;
  }
}

export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = new Array(rows * cols).fill(0);
  for (let i = 0; i < rows; i++) dist[i * cols] = i;
  for (let j = 0; j < cols; j++) dist[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(
        dist[(i - 1) * cols + j]! + 1,
        dist[i * cols + (j - 1)]! + 1,
        dist[(i - 1) * cols + (j - 1)]! + cost,
      );
      // Swapped neighbours ("RDE" for "RED") count as one typo.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, dist[(i - 2) * cols + (j - 2)]! + 1);
      }
      dist[i * cols + j] = d;
    }
  }
  return dist[rows * cols - 1]!;
}

/** Closest known name within a small edit distance, for "Did you mean …?" hints. */
export function suggest(word: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  const limit = word.length <= 3 ? 1 : 2;
  for (const candidate of candidates) {
    const d = levenshtein(word, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return bestDist <= limit ? best : undefined;
}
