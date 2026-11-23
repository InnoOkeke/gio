import { describe, it, expect } from 'vitest';
import { route, planUpdate, isCacheableResponse, type ManifestEntry } from '../src/ui/offline/cache-rules';

const ORIGIN = 'https://gio.test';
const PRECACHE = new Set(['/', '/logo.svg', '/manifest.webmanifest', '/assets/main-aaa.js', '/assets/nunito-latin-wght-normal-ccc.woff2', '/py/runner.html']);

describe('route', () => {
  const cases: [string, { url: string; mode: string; method: string }, string][] = [
    ['POST is never touched', { url: `${ORIGIN}/assets/main-aaa.js`, mode: 'cors', method: 'POST' }, 'pass-through'],
    ['api is network only', { url: `${ORIGIN}/api/projects`, mode: 'cors', method: 'GET' }, 'pass-through'],
    ['api health is network only', { url: `${ORIGIN}/api/health`, mode: 'cors', method: 'GET' }, 'pass-through'],
    ['pyodide is not touched', { url: `${ORIGIN}/py/pyodide-314.0.8/pyodide.asm.wasm`, mode: 'cors', method: 'GET' }, 'pass-through'],
    ['the python runner navigation is not touched', { url: `${ORIGIN}/py/runner.html`, mode: 'navigate', method: 'GET' }, 'pass-through'],
    ['other origins are not touched', { url: 'https://example.com/assets/x.js', mode: 'cors', method: 'GET' }, 'pass-through'],
    ['a bad url is not touched', { url: 'not a url', mode: 'cors', method: 'GET' }, 'pass-through'],
    ['home navigation is the shell', { url: `${ORIGIN}/`, mode: 'navigate', method: 'GET' }, 'shell'],
    ['a shared drawing navigation is the shell', { url: `${ORIGIN}/p/abc?x=1`, mode: 'navigate', method: 'GET' }, 'shell'],
    ['privacy navigation is the shell', { url: `${ORIGIN}/privacy`, mode: 'navigate', method: 'GET' }, 'shell'],
    ['the adventure map navigation is the shell', { url: `${ORIGIN}/adventure`, mode: 'navigate', method: 'GET' }, 'shell'],
    ['an adventure level navigation is the shell', { url: `${ORIGIN}/adventure/maze-01`, mode: 'navigate', method: 'GET' }, 'shell'],
    ['sw.js is not touched', { url: `${ORIGIN}/sw.js`, mode: 'same-origin', method: 'GET' }, 'pass-through'],
    ['a file navigation is not the shell', { url: `${ORIGIN}/something.txt`, mode: 'navigate', method: 'GET' }, 'pass-through'],
    ['a listed asset is precached', { url: `${ORIGIN}/assets/main-aaa.js`, mode: 'cors', method: 'GET' }, 'precached'],
    ['an unlisted asset still tries the cache first', { url: `${ORIGIN}/assets/other-bbb.js`, mode: 'cors', method: 'GET' }, 'precached'],
    ['the logo is precached', { url: `${ORIGIN}/logo.svg`, mode: 'no-cors', method: 'GET' }, 'precached'],
    ['the manifest is precached', { url: `${ORIGIN}/manifest.webmanifest`, mode: 'cors', method: 'GET' }, 'precached'],
    ['a listed font is precached', { url: `${ORIGIN}/assets/nunito-latin-wght-normal-ccc.woff2`, mode: 'cors', method: 'GET' }, 'precached'],
    ['an unlisted font is cached on first use', { url: `${ORIGIN}/assets/nunito-cyrillic-wght-normal-ddd.woff2`, mode: 'cors', method: 'GET' }, 'runtime-font'],
    ['an unknown file is not touched', { url: `${ORIGIN}/unknown.png`, mode: 'no-cors', method: 'GET' }, 'pass-through'],
  ];
  it.each(cases)('%s', (_name, request, expected) => {
    expect(route(request, ORIGIN, PRECACHE)).toBe(expected);
  });
});

describe('planUpdate', () => {
  const hashed = (u: string): ManifestEntry => ({ url: u, rev: null });
  const revved = (u: string, rev: string): ManifestEntry => ({ url: u, rev });
  it('copies unchanged hashed and unchanged revved files', () => {
    const plan = planUpdate([hashed('/assets/a-1.js'), revved('/logo.svg', 'x')], [hashed('/assets/a-1.js'), revved('/logo.svg', 'x')]);
    expect(plan.copy.map((e) => e.url)).toEqual(['/assets/a-1.js', '/logo.svg']);
    expect(plan.fetch).toEqual([]);
    expect(plan.drop).toEqual([]);
  });
  it('fetches new files and files whose rev changed', () => {
    const plan = planUpdate([hashed('/assets/a-2.js'), revved('/', 'new')], [hashed('/assets/a-1.js'), revved('/', 'old')]);
    expect(plan.copy).toEqual([]);
    expect(plan.fetch.map((e) => e.url)).toEqual(['/assets/a-2.js', '/']);
  });
  it('drops files the new version no longer lists', () => {
    const plan = planUpdate([hashed('/assets/a-2.js')], [hashed('/assets/a-1.js'), hashed('/assets/a-2.js')]);
    expect(plan.drop).toEqual(['/assets/a-1.js']);
    expect(plan.copy.map((e) => e.url)).toEqual(['/assets/a-2.js']);
  });
  it('fetches everything when there is no previous cache', () => {
    const next = [hashed('/assets/a-1.js'), revved('/', 'r')];
    const plan = planUpdate(next, []);
    expect(plan.fetch).toEqual(next);
    expect(plan.copy).toEqual([]);
  });
});

describe('isCacheableResponse', () => {
  const res = (ok: boolean, type: string, contentType: string | null) => ({ ok, type, headers: { get: () => contentType } });
  it('accepts a normal asset and a normal document', () => {
    expect(isCacheableResponse(res(true, 'basic', 'text/javascript'), 'asset')).toBe(true);
    expect(isCacheableResponse(res(true, 'basic', 'text/html; charset=utf-8'), 'document')).toBe(true);
  });
  it('rejects a failed response', () => {
    expect(isCacheableResponse(res(false, 'basic', 'text/javascript'), 'asset')).toBe(false);
  });
  it('rejects opaque responses', () => {
    expect(isCacheableResponse(res(true, 'opaque', null), 'asset')).toBe(false);
    expect(isCacheableResponse(res(true, 'opaqueredirect', null), 'document')).toBe(false);
  });
  it('rejects HTML where a script, style, font or image was expected', () => {
    expect(isCacheableResponse(res(true, 'basic', 'text/html'), 'asset')).toBe(false);
  });
  it('rejects a document that is not HTML', () => {
    expect(isCacheableResponse(res(true, 'basic', 'text/plain'), 'document')).toBe(false);
  });
});
