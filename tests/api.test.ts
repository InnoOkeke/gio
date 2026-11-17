import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let server: Server;
let base = '';
let tmpDir = '';

async function call(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as { success: boolean; data: Record<string, string>; error?: unknown } };
}

beforeAll(async () => {
  // The DB client reads DB_PATH when first imported, so set it before importing the app.
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-test-'));
  process.env['DB_PATH'] = path.join(tmpDir, 'nested', 'test.db');
  const { createApp } = await import('../src/api/app.js');
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const { db } = await import('../src/db/client.js');
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('health', () => {
  it('reports ok in the standard envelope', async () => {
    const { status, json } = await call('GET', '/api/health');
    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true, data: { status: 'ok' } });
  });
});

describe('projects', () => {
  it('creates the database file at DB_PATH', () => {
    expect(fs.existsSync(path.join(tmpDir, 'nested', 'test.db'))).toBe(true);
  });

  it('saves a project and returns a share slug plus a private edit key', async () => {
    const { status, json } = await call('POST', '/api/projects', { title: 'My Square', code: 'REPEAT 4 [FD 100 RT 90]' });
    expect(status).toBe(201);
    expect(json.data.slug).toMatch(/^[a-z0-9]{10}$/);
    expect(json.data.editKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.data).not.toHaveProperty('id');
  });

  it('opens a shared project without exposing the edit key', async () => {
    const created = (await call('POST', '/api/projects', { title: 'Star', code: 'REPEAT 5 [FD 100 RT 144]' })).json.data;
    const { status, json } = await call('GET', `/api/projects/${created.slug}`);
    expect(status).toBe(200);
    expect(json.data).toMatchObject({ slug: created.slug, title: 'Star', code: 'REPEAT 5 [FD 100 RT 144]' });
    expect(json.data).not.toHaveProperty('id');
    expect(json.data).not.toHaveProperty('editKey');
  });

  it('updates only with the right edit key', async () => {
    const created = (await call('POST', '/api/projects', { title: 'Draft', code: 'FD 10' })).json.data;

    const wrong = await call('PUT', `/api/projects/${created.slug}`, { code: 'FD 99' }, { 'X-Edit-Key': '00000000-0000-0000-0000-000000000000' });
    expect(wrong.status).toBe(404);

    const right = await call('PUT', `/api/projects/${created.slug}`, { title: 'Final', code: 'FD 20' }, { 'X-Edit-Key': created.editKey });
    expect(right.status).toBe(200);
    expect(right.json.data).toMatchObject({ title: 'Final', code: 'FD 20' });

    expect((await call('GET', `/api/projects/${created.slug}`)).json.data.code).toBe('FD 20');
  });

  it('returns 404 for unknown or malformed slugs', async () => {
    expect((await call('GET', '/api/projects/abcdefghjk')).status).toBe(404);
    expect((await call('GET', '/api/projects/not-a-slug!')).status).toBe(404);
  });

  it('rejects invalid input with a 400', async () => {
    expect((await call('POST', '/api/projects', { title: '', code: 'FD 10' })).status).toBe(400);
    expect((await call('POST', '/api/projects', { title: 'Big', code: 'FD 1 '.repeat(5000) })).status).toBe(400);
    const created = (await call('POST', '/api/projects', { title: 'X', code: 'FD 1' })).json.data;
    expect((await call('PUT', `/api/projects/${created.slug}`, {}, { 'X-Edit-Key': created.editKey })).status).toBe(400);
  });

  it('answers malformed JSON with a clear 400, not a crash', async () => {
    const { status, json } = await call('POST', '/api/projects', '{"title":');
    expect(status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe('AI endpoint input checks (no model call)', () => {
  it('rejects an empty or overly long request before calling Bedrock', async () => {
    expect((await call('POST', '/api/ai/logo', { prompt: '' })).status).toBe(400);
    expect((await call('POST', '/api/ai/logo', { prompt: 'x'.repeat(501) })).status).toBe(400);
  });

  it('unknown API routes return a JSON 404', async () => {
    const { status, json } = await call('GET', '/api/nope');
    expect(status).toBe(404);
    expect(json).toMatchObject({ success: false });
  });
});
