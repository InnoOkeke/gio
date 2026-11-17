import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initSchema } from './schema.js';

const dbPath = path.resolve(process.env['DB_PATH'] ?? path.join(process.cwd(), 'data', 'gio.db'));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db: Database.Database = new Database(dbPath);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

initSchema(db);
