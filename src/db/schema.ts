import type BetterSqlite3 from 'better-sqlite3';

export function initSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,      -- secret edit key, only ever returned to the creator
      slug        TEXT UNIQUE NOT NULL,  -- public share id used in links
      title       TEXT NOT NULL,
      code        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- Site-wide AI requests per UTC day, so the daily cap survives restarts and deploys.
    CREATE TABLE IF NOT EXISTS ai_daily_usage (
      day    TEXT PRIMARY KEY,           -- UTC date, YYYY-MM-DD
      count  INTEGER NOT NULL
    );
  `);
}
