/**
 * GIO's service worker. Built by the gioServiceWorker() Vite plugin, which injects the precache list and a build id.
 * It keeps only GIO's own files so the app opens with no connection. It never touches /api/* or /py/*.
 * A new version installs and waits; it takes over only after the page sends SKIP_WAITING.
 */
import { route, planUpdate, isCacheableResponse, type ManifestEntry } from './cache-rules';

declare const self: ServiceWorkerGlobalScope;
declare const __GIO_MANIFEST__: ManifestEntry[];
declare const __GIO_BUILD_ID__: string;

const PREFIX = 'gio-app-';
const CACHE = `${PREFIX}${__GIO_BUILD_ID__}`;
const META_URL = '/__gio-precache.json';
const PRECACHED = new Set(__GIO_MANIFEST__.map((e) => e.url));
const BATCH = 4;

async function broadcast(message: { type: 'precache-done' } | { type: 'precache-failed'; reason: 'quota' | 'network' }): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}

async function previousCache(): Promise<{ cache: Cache; entries: ManifestEntry[] } | null> {
  const names = (await caches.keys()).filter((n) => n.startsWith(PREFIX) && n !== CACHE);
  for (const name of names.reverse()) {
    const cache = await caches.open(name);
    const meta = await cache.match(META_URL);
    if (!meta) continue;
    try {
      return { cache, entries: (await meta.json()) as ManifestEntry[] };
    } catch {
      /* unreadable list: try the next older cache */
    }
  }
  return null;
}

async function download(cache: Cache, entry: ManifestEntry): Promise<void> {
  const response = await fetch(entry.url, { cache: 'reload' });
  if (!isCacheableResponse(response, entry.url === '/' || entry.url.endsWith('.html') ? 'document' : 'asset')) {
    throw new Error(`Unexpected response for ${entry.url}`);
  }
  await cache.put(entry.url, response);
}

async function install(): Promise<void> {
  const cache = await caches.open(CACHE);
  try {
    const previous = await previousCache();
    const plan = planUpdate(__GIO_MANIFEST__, previous?.entries ?? []);
    const toFetch = [...plan.fetch];
    if (previous) {
      for (const entry of plan.copy) {
        const stored = await previous.cache.match(entry.url);
        if (stored) await cache.put(entry.url, stored);
        else toFetch.push(entry);
      }
    }
    for (let i = 0; i < toFetch.length; i += BATCH) {
      await Promise.all(toFetch.slice(i, i + BATCH).map((entry) => download(cache, entry)));
    }
    // Written last: a cache without this list is treated as incomplete by the next update.
    await cache.put(META_URL, new Response(JSON.stringify(__GIO_MANIFEST__), { headers: { 'Content-Type': 'application/json' } }));
  } catch (error) {
    await caches.delete(CACHE);
    const quota = error instanceof DOMException && error.name === 'QuotaExceededError';
    await broadcast({ type: 'precache-failed', reason: quota ? 'quota' : 'network' });
    throw error;
  }
  await broadcast({ type: 'precache-done' });
}

async function activate(): Promise<void> {
  for (const name of await caches.keys()) {
    if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
}

async function respond(kind: 'shell' | 'precached' | 'runtime-font', request: Request): Promise<Response> {
  if (kind === 'shell') {
    return (await caches.match('/', { cacheName: CACHE })) ?? fetch(request);
  }
  const hit = await caches.match(request, { cacheName: CACHE, ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (kind === 'runtime-font' && isCacheableResponse(response, 'asset')) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(install());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(activate());
});

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const kind = route({ url: request.url, mode: request.mode, method: request.method }, self.location.origin, PRECACHED);
  if (kind === 'pass-through') return;
  event.respondWith(respond(kind, request));
});
