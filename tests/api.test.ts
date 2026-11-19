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
  // A tiny site-wide AI cap, and no Bedrock settings, so these tests can never call the real model.
  process.env['AI_DAILY_LIMIT'] = '2';
  for (const k of ['AWS_REGION', 'BEDROCK_MODEL_ID', 'AWS_BEARER_TOKEN_BEDROCK']) delete process.env[k];
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

  it('turns away blocklisted words with a friendly redirect, without using the daily cap', async () => {
    const logo = await call('POST', '/api/ai/logo', { prompt: 'draw a f.u.c.k' });
    expect(logo.status).toBe(422);
    expect(logo.json).toMatchObject({ success: false, code: 'redirect' });
    expect(logo.json.error).toContain('draw something else');
    const explain = await call('POST', '/api/ai/explain', { code: 'FD 10 ; shit' });
    expect(explain.status).toBe(422);
  });

  // The 422 path for an UNSAFE verdict needs a live Bedrock answer. Per the no-mocks rule it is covered by the live
  // check recorded in the commit message and by the parseVerdict tests in safety.test.ts. The fail-closed 503 is asserted below.
  it('rejects a hint request with a bad level, missing code or an unknown quest before anything is counted', async () => {
    expect((await call('POST', '/api/ai/hint', { level: 4, code: 'FD 10', style: 'code' })).status).toBe(400);
    expect((await call('POST', '/api/ai/hint', { level: 1, style: 'code' })).status).toBe(400);
    const unknown = await call('POST', '/api/ai/hint', { level: 1, code: 'FD 10', style: 'code', questId: 'no-such-quest' });
    expect(unknown.status).toBe(400);
    expect(unknown.json.success).toBe(false);
    // A coder quest asked for with the Little Turtles style is also a 400.
    expect((await call('POST', '/api/ai/hint', { level: 1, code: 'FD 10', style: 'blocks', questId: 'c-square' })).status).toBe(400);
  });

  it('answers an empty free-mode hint or a solved quest with a 400 and leaves the daily count unchanged', async () => {
    const { db } = await import('../src/db/client.js');
    const used = () => (db.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM ai_daily_usage').get() as { n: number }).n;
    const before = used();
    const empty = await call('POST', '/api/ai/hint', { level: 1, code: '', style: 'code' });
    expect(empty.status).toBe(400);
    expect(empty.json.error).toContain('Add something first');
    const solved = await call('POST', '/api/ai/hint', { level: 1, code: 'REPEAT 4 [FD 100 RT 90]', style: 'code', questId: 'c-square' });
    expect(solved.status).toBe(400);
    expect(solved.json.error).toContain('You already did it');
    expect(used()).toBe(before);
  });

  it('turns away a blocklisted word inside hint code, without using the daily cap', async () => {
    const hint = await call('POST', '/api/ai/hint', { level: 1, code: 'FD 10 ; shit', style: 'code' });
    expect(hint.status).toBe(422);
    expect(hint.json).toMatchObject({ success: false, code: 'redirect' });
  });

  it('stops all AI requests for the day once the site-wide cap is reached', async () => {
    const first = await call('POST', '/api/ai/logo', { prompt: 'a star' });
    const second = await call('POST', '/api/ai/explain', { code: 'FD 10' });
    // The moderation check runs after the cap is counted. With no Bedrock settings it cannot answer, so it fails closed (503).
    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    const third = await call('POST', '/api/ai/logo', { prompt: 'a star' });
    expect(third.status).toBe(429);
    expect(third.json.error).toContain('lots of drawing today');
  });

  it('unknown API routes return a JSON 404', async () => {
    const { status, json } = await call('GET', '/api/nope');
    expect(status).toBe(404);
    expect(json).toMatchObject({ success: false });
  });
});

describe('/py headers for the sandboxed Python frame', () => {
  it('sends CORS, CORP, an immutable cache for the engine and a strict CSP for the runner page', async () => {
    const [{ default: express }, { default: helmet }, { pyHeaders, RUNNER_CSP }] = await Promise.all([import('express'), import('helmet'), import('../src/api/middleware/py.js')]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-py-'));
    fs.mkdirSync(path.join(dir, 'py', 'pyodide-314.0.8'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'py', 'runner.html'), '<!doctype html>');
    fs.writeFileSync(path.join(dir, 'py', 'pyodide-314.0.8', 'pyodide.asm.wasm'), 'wasm');
    const app = express();
    app.use(helmet());
    app.use('/py', pyHeaders);
    app.use(express.static(dir));
    const py = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const origin = `http://127.0.0.1:${(py.address() as AddressInfo).port}`;
      const runner = await fetch(`${origin}/py/runner.html`);
      expect(runner.headers.get('access-control-allow-origin')).toBe('*');
      expect(runner.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(runner.headers.get('content-security-policy')).toBe(RUNNER_CSP);
      expect(RUNNER_CSP).toContain("script-src 'self' blob: 'wasm-unsafe-eval'");
      const wasm = await fetch(`${origin}/py/pyodide-314.0.8/pyodide.asm.wasm`);
      expect(wasm.headers.get('access-control-allow-origin')).toBe('*');
      expect(wasm.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(wasm.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(wasm.headers.get('content-security-policy')).not.toBe(RUNNER_CSP);
      expect(runner.headers.get('cache-control')).not.toContain('immutable');
    } finally {
      await new Promise<void>((resolve) => py.close(() => resolve()));
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
