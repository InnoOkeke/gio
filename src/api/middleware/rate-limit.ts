import type { Request, Response, NextFunction } from 'express';

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
