import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { db } from './client.js';

export interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  code: string;
  created_at: string;
  updated_at: string;
}

/** What anyone with the share link may see. The edit key (id) is never included. */
export type PublicProject = Omit<ProjectRow, 'id'>;

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function newSlug(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join('');
}

function sameKey(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function toPublic(row: ProjectRow): PublicProject {
  return { slug: row.slug, title: row.title, code: row.code, created_at: row.created_at, updated_at: row.updated_at };
}

export function createProject(input: { title: string; code: string }): ProjectRow {
  const now = new Date().toISOString();
  const row: ProjectRow = { id: randomUUID(), slug: newSlug(), title: input.title, code: input.code, created_at: now, updated_at: now };
  db.prepare(
    `INSERT INTO projects (id, slug, title, code, created_at, updated_at)
     VALUES (@id, @slug, @title, @code, @created_at, @updated_at)`,
  ).run(row);
  return row;
}

export function getProjectBySlug(slug: string): ProjectRow | undefined {
  return db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as ProjectRow | undefined;
}

/** Updates only when the edit key matches. Returns undefined when it doesn't (or the project is gone). */
export function updateProject(slug: string, editKey: string, input: { title?: string; code?: string }): ProjectRow | undefined {
  const existing = getProjectBySlug(slug);
  if (!existing || !sameKey(existing.id, editKey)) return undefined;
  const updated: ProjectRow = {
    ...existing,
    title: input.title ?? existing.title,
    code: input.code ?? existing.code,
    updated_at: new Date().toISOString(),
  };
  db.prepare('UPDATE projects SET title = @title, code = @code, updated_at = @updated_at WHERE id = @id').run(updated);
  return updated;
}
