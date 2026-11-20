import { describe, it, expect } from 'vitest';
import { buildManifest } from '../scripts/lib/sw-build';

const FILES: Record<string, string> = {
  'index.html': '<html>v1</html>',
  'assets/main-aaa.js': 'js',
  'assets/editor-bbb.js': 'ed',
  'assets/main-ccc.css': '@font-face{src:url(/assets/nunito-latin-wght-normal-111.woff2)}@font-face{src:url(/assets/nunito-latin-ext-wght-normal-222.woff2)}@font-face{src:url(/assets/nunito-cyrillic-wght-normal-333.woff2)}',
  'assets/nunito-latin-wght-normal-111.woff2': 'f1',
  'assets/nunito-latin-ext-wght-normal-222.woff2': 'f2',
  'assets/nunito-cyrillic-wght-normal-333.woff2': 'f3',
  'assets/unreferenced-latin-wght-normal-444.woff2': 'f4',
  'py/runner.html': '<html>runner</html>',
  'py/runner-ddd.js': 'runner',
  'py/pyodide-314.0.8/pyodide.asm.wasm': 'wasm',
  'py/pyodide-314.0.8/python_stdlib.zip': 'zip',
  'sw.js': 'old worker',
  'logo.svg': '<svg/>',
  'manifest.webmanifest': '{}',
  'icons/icon-192.png': 'png',
};
const PUBLIC = ['logo.svg', 'manifest.webmanifest', 'icons/icon-192.png'];
const run = (files: Record<string, string> = FILES) => buildManifest(Object.keys(files), PUBLIC, (f) => files[f] ?? '');
const urls = (files?: Record<string, string>) => run(files).entries.map((e) => e.url);

describe('buildManifest', () => {
  it('includes html, js, css, latin fonts, logo, manifest and icons', () => {
    const list = urls();
    expect(list).toEqual(
      expect.arrayContaining([
        '/',
        '/assets/main-aaa.js',
        '/assets/editor-bbb.js',
        '/assets/main-ccc.css',
        '/assets/nunito-latin-wght-normal-111.woff2',
        '/logo.svg',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
      ]),
    );
  });

  it('never includes the Python frame, Pyodide, the old sw.js, other writing systems or unreferenced fonts', () => {
    const list = urls();
    expect(list.some((u) => u.startsWith('/py/'))).toBe(false);
    expect(list).not.toContain('/sw.js');
    expect(list).not.toContain('/assets/nunito-latin-ext-wght-normal-222.woff2');
    expect(list).not.toContain('/assets/nunito-cyrillic-wght-normal-333.woff2');
    expect(list).not.toContain('/assets/unreferenced-latin-wght-normal-444.woff2');
  });

  it('gives hashed files rev null and other files a content hash', () => {
    const byUrl = new Map(run().entries.map((e) => [e.url, e.rev]));
    expect(byUrl.get('/assets/main-aaa.js')).toBeNull();
    expect(byUrl.get('/')).toMatch(/^[0-9a-f]{64}$/);
    expect(byUrl.get('/logo.svg')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and independent of input order', () => {
    const reversed = Object.fromEntries(Object.entries(FILES).reverse());
    expect(run().buildId).toBe(run().buildId);
    expect(run(reversed).buildId).toBe(run().buildId);
    expect(run().buildId).toMatch(/^[0-9a-f]{12}$/);
  });

  it('changes the id when any listed file changes', () => {
    const base = run().buildId;
    expect(run({ ...FILES, 'index.html': '<html>v2</html>' }).buildId).not.toBe(base);
    expect(run({ ...FILES, 'logo.svg': '<svg>changed</svg>' }).buildId).not.toBe(base);
    const renamed = { ...FILES };
    delete renamed['assets/main-aaa.js'];
    renamed['assets/main-zzz.js'] = 'js';
    expect(run(renamed).buildId).not.toBe(base);
  });

  it('keeps the id when only a file outside the list changes', () => {
    expect(run({ ...FILES, 'py/pyodide-314.0.8/pyodide.asm.wasm': 'other', 'sw.js': 'newer' }).buildId).toBe(run().buildId);
  });

  it('has no entry that starts with /py/pyodide-', () => {
    for (const entry of run().entries) expect(entry.url.startsWith('/py/pyodide-')).toBe(false);
    const withPublicPyodide = buildManifest([], ['py/pyodide-314.0.8/pyodide.js', 'logo.svg'], () => 'x');
    expect(withPublicPyodide.entries.map((e) => e.url)).toEqual(['/logo.svg']);
  });
});
