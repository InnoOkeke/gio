/**
 * Pure rules for GIO's service worker. No DOM and no worker globals, so unit tests can exercise every case.
 * The worker keeps only GIO's own files. It never touches /api/* (a child's code and AI answers are never stored)
 * and never touches /py/* (the Python engine is large and is kept by the browser, not by this worker).
 */

export type RouteKind = 'shell' | 'precached' | 'runtime-font' | 'pass-through';

export interface RequestLike {
  url: string;
  mode: string;
  method: string;
}

/** One file in the precache list. `rev` is null for hashed files (the URL already changes) and a content hash otherwise. */
export interface ManifestEntry {
  url: string;
  rev: string | null;
}

export interface UpdatePlan {
  /** Entries whose cached copy is still right: copy them from the previous cache. */
  copy: ManifestEntry[];
  /** Entries that are new or changed: download them. */
  fetch: ManifestEntry[];
  /** URLs in the previous cache that the new version no longer lists. */
  drop: string[];
}

export interface ResponseLike {
  ok: boolean;
  type: string;
  headers: { get(name: string): string | null };
}

function hasExtension(pathname: string): boolean {
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  return last.includes('.');
}

export function route(request: RequestLike, origin: string, precachedUrls: ReadonlySet<string>): RouteKind {
  if (request.method !== 'GET') return 'pass-through';
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return 'pass-through';
  }
  if (url.origin !== origin) return 'pass-through';
  const p = url.pathname;
  if (p === '/api' || p.startsWith('/api/') || p === '/py' || p.startsWith('/py/')) return 'pass-through';
  if (request.mode === 'navigate' && !hasExtension(p)) return 'shell';
  if (precachedUrls.has(p)) return 'precached';
  if (p.startsWith('/assets/')) return p.endsWith('.woff2') ? 'runtime-font' : 'precached';
  return 'pass-through';
}

export function planUpdate(next: readonly ManifestEntry[], previous: readonly ManifestEntry[]): UpdatePlan {
  const old = new Map(previous.map((e) => [e.url, e]));
  const copy: ManifestEntry[] = [];
  const fetch: ManifestEntry[] = [];
  for (const entry of next) {
    const was = old.get(entry.url);
    if (was && was.rev === entry.rev) copy.push(entry);
    else fetch.push(entry);
  }
  const keep = new Set(next.map((e) => e.url));
  const drop = previous.filter((e) => !keep.has(e.url)).map((e) => e.url);
  return { copy, fetch, drop };
}

/** True when a response is safe to store. A document may be HTML. Anything else must not be HTML (a stale-chunk 404 page, say). */
export function isCacheableResponse(response: ResponseLike, expectedKind: 'document' | 'asset'): boolean {
  if (!response.ok) return false;
  if (response.type === 'opaque' || response.type === 'opaqueredirect' || response.type === 'error') return false;
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  if (expectedKind === 'asset' && type.includes('text/html')) return false;
  if (expectedKind === 'document' && !type.includes('text/html')) return false;
  return true;
}
