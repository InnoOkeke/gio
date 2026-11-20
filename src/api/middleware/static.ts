import path from 'path';
import type { NextFunction, Request, Response } from 'express';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'no-cache';
const ONE_DAY = 'public, max-age=86400';
const NO_CACHE_FILES = new Set(['index.html', 'sw.js', 'manifest.webmanifest']);

/**
 * Cache headers for the built UI. Hashed files under /assets/ never change, so they are immutable. The files that
 * name them (index.html, sw.js, the manifest) must be checked on every load or a phone could keep an old app.
 * Passed to express.static as setHeaders. The /py/ headers are set by pyHeaders and are not changed here.
 */
export function setStaticHeaders(res: Response, filePath: string): void {
  const parts = filePath.split(path.sep);
  const name = parts[parts.length - 1] ?? '';
  const folder = parts[parts.length - 2] ?? '';
  if (folder === 'assets') res.setHeader('Cache-Control', IMMUTABLE);
  else if (folder === 'icons' || name === 'logo.svg') res.setHeader('Cache-Control', ONE_DAY);
  else if (NO_CACHE_FILES.has(name) && folder !== 'py') res.setHeader('Cache-Control', REVALIDATE);
}

/**
 * Sends index.html for app routes such as /p/abc. A request for a file (anything with an extension) or for
 * /assets, /py or /api that static serving did not find gets a plain 404, so a missing chunk or /sw.js can never be
 * answered with HTML that a browser or the service worker would treat as JavaScript.
 */
export function spaFallback(uiDistDir: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathname = req.path;
    const isReserved = /^\/(assets|py|api)(\/|$)/.test(pathname);
    const hasExtension = path.posix.extname(pathname) !== '';
    if (isReserved || hasExtension) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.setHeader('Cache-Control', REVALIDATE);
    res.sendFile(path.join(uiDistDir, 'index.html'));
  };
}
