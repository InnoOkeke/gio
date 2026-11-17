import type BetterSqlite3 from 'better-sqlite3';

const KEEP_DAYS = 30;

/**
 * Counts one AI request against the site-wide cap for `day` (UTC, YYYY-MM-DD), but only if the cap
 * has not been reached. Returns false when the day is already at `max`.
 *
 * One SQL statement does the check and the increment, so two requests can never both take the
 * last slot. The count lives in SQLite, so it survives a restart of the server.
 */
export function takeDailySlot(db: BetterSqlite3.Database, day: string, max: number): boolean {
  const row = db
    .prepare<[string, number], { count: number }>(
      `INSERT INTO ai_daily_usage (day, count) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE count < ?
       RETURNING count`,
    )
    .get(day, max);
  if (!row) return false;
  if (row.count === 1) {
    // First request of a new day: forget old days so the table stays tiny.
    const cutoff = new Date(Date.parse(`${day}T00:00:00Z`) - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
    db.prepare('DELETE FROM ai_daily_usage WHERE day < ?').run(cutoff);
  }
  return true;
}
