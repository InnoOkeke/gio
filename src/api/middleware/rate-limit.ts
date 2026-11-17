import type { Request, Response, NextFunction } from 'express';

/**
 * A cap on requests per UTC day for the whole site (all visitors together), so a busy public link
 * can't use up the AI budget. The count is kept by `take` (SQLite in production), not in memory,
 * so a restart or deploy does not hand out a fresh budget.
 * `take` counts one request for the given UTC day and returns false once `max` is reached.
 */
export function dailyCap(options: { max: number; message: string; take: (day: string, max: number) => boolean }) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const today = new Date().toISOString().slice(0, 10);
    if (!options.take(today, options.max)) {
      const midnight = new Date(`${today}T00:00:00Z`).getTime() + 86_400_000;
      res.setHeader('Retry-After', String(Math.ceil((midnight - Date.now()) / 1000)));
      res.status(429).json({ success: false, error: options.message });
      return;
    }
    next();
  };
}

/**
 * Small in-memory sliding-window limiter, per client IP. Enough for a single server;
 * a multi-instance deployment would need a shared store instead.
 */
export function rateLimit(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const recent = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);

    if (recent.length >= options.max) {
      const retryAfter = Math.ceil((options.windowMs - (now - recent[0]!)) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, error: options.message });
      hits.set(key, recent);
      return;
    }

    recent.push(now);
    hits.set(key, recent);

    // Drop idle clients now and then so the map doesn't grow forever.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) if (times.every((t) => now - t >= options.windowMs)) hits.delete(k);
    }
    next();
  };
}
