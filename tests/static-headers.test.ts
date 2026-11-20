import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let server: Server;
let base = '';
let tmpDir = '';
let uiDir = '';

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-static-'));
  process.env['DB_PATH'] = path.join(tmpDir, 'db', 'test.db');
  // The AI route reads this when the app is built; set it here so the test does not depend on the shell (as api.test.ts does).
  process.env['AI_DAILY_LIMIT'] = '2';
  uiDir = path.join(tmpDir, 'ui');
  fs.mkdirSync(path.join(uiDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(uiDir, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(uiDir, 'py'), { recursive: true });
  fs.writeFileSync(path.join(uiDir, 'index.html'), '<!doctype html><title>GIO</title>');
  fs.writeFileSync(path.join(uiDir, 'assets', 'main-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(uiDir, 'manifest.webmanifest'), '{}');
  fs.writeFileSync(path.join(uiDir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  fs.writeFileSync(path.join(uiDir, 'icons', 'icon-192.png'), 'png');
  fs.writeFileSync(path.join(uiDir, 'py', 'runner.html'), '<!doctype html>');
  const { createApp } = await import('../src/api/app.js');
  await new Promise<void>((resolve) => {
    server = createApp({ uiDistDir: uiDir }).listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const { db } = await import('../src/db/client.js');
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('static headers and the SPA fallback', () => {
  it('makes hashed assets immutable', async () => {
    const res = await fetch(`${base}/assets/main-abc123.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('makes the files that name the assets revalidate on every load', async () => {
    for (const url of ['/', '/index.html', '/manifest.webmanifest']) {
      const res = await fetch(`${base}${url}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control'), url).toBe('no-cache');
    }
  });

  it('gives the logo and icons a one day cache', async () => {
    for (const url of ['/logo.svg', '/icons/icon-192.png']) {
      const res = await fetch(`${base}${url}`);
      expect(res.headers.get('cache-control'), url).toBe('public, max-age=86400');
    }
  });

  it('serves the manifest with the manifest content type', async () => {
    const res = await fetch(`${base}/manifest.webmanifest`);
    expect(res.headers.get('content-type')).toContain('application/manifest+json');
  });

  it('keeps the helmet policy: default-src self, no unsafe-inline scripts', async () => {
    const csp = (await fetch(`${base}/`)).headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    const scriptSrc = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src')) ?? '';
    expect(scriptSrc).toBe("script-src 'self'");
    expect(csp).not.toContain('worker-src');
    expect(csp).not.toContain('manifest-src');
  });

  it('answers 404, never HTML, for a missing asset, a missing sw.js and a missing py file', async () => {
    for (const url of ['/assets/missing.js', '/sw.js', '/py/missing.js', '/something.css']) {
      const res = await fetch(`${base}${url}`);
      expect(res.status, url).toBe(404);
      expect(res.headers.get('content-type'), url).not.toContain('text/html');
    }
  });

  it('serves index.html for app routes', async () => {
    for (const url of ['/p/abc', '/privacy', '/certificate']) {
      const res = await fetch(`${base}${url}`);
      expect(res.status, url).toBe(200);
      expect(res.headers.get('content-type'), url).toContain('text/html');
      expect(await res.text()).toContain('<title>GIO</title>');
      expect(res.headers.get('cache-control'), url).toBe('no-cache');
    }
  });

  it('does not change the /py headers', async () => {
    const res = await fetch(`${base}/py/runner.html`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).not.toContain('immutable');
  });
});
