import type { NextFunction, Request, Response } from 'express';

/**
 * The Python frame (/py/runner.html) has an opaque origin because it is sandboxed without allow-same-origin.
 * Everything it loads is therefore a cross-origin request, so /py/ answers with CORS and CORP headers.
 * The runner page itself gets a strict Content-Security-Policy: scripts only from this server or a blob (its
 * worker), WebAssembly allowed, no other network, nothing else.
 */
export const RUNNER_CSP = "default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src blob:; connect-src 'self'; frame-ancestors 'self'";

const IMMUTABLE = /^\/pyodide-[^/]+\//;

export function pyHeaders(req: Request, res: Response, next: NextFunction): void {
  // Mounted at /py, so req.path starts after it.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (IMMUTABLE.test(req.path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  if (req.path === '/runner.html') res.setHeader('Content-Security-Policy', RUNNER_CSP);
  next();
}
