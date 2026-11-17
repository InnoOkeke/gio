import type { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error('[error]', err.message, err.stack);
  // Client errors (e.g. malformed JSON) are safe to explain; server errors are not echoed to the browser.
  const message = status < 500 && err.expose !== false ? err.message : 'Something went wrong on our side. Please try again.';
  res.status(status).json({ success: false, error: message });
}
