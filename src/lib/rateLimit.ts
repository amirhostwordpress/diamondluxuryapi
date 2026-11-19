// ─────────────────────────────────────────────────────────────────────────────
// Lightweight in-memory rate limiter (no external dependencies).
// Intended for public write endpoints (contact / enquiries / newsletter) to
// cut down on spam. State lives in this process only — good enough for a
// single-instance deployment.
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from "express";

interface Options {
  windowMs: number;      // length of the window in milliseconds
  max: number;           // allowed requests per window per client
  methods?: string[];    // HTTP methods to limit (default: POST only)
  message?: string;      // error message returned on 429
}

interface Hit {
  count: number;
  resetAt: number;
}

export function createRateLimiter({
  windowMs,
  max,
  methods = ["POST"],
  message,
}: Options) {
  const hits = new Map<string, Hit>();

  // Periodically drop expired entries so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, hit] of hits) {
      if (hit.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!methods.includes(req.method)) return next();

    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    let hit = hits.get(key);
    if (!hit || hit.resetAt <= now) {
      hit = { count: 0, resetAt: now + windowMs };
      hits.set(key, hit);
    }

    hit.count += 1;
    if (hit.count > max) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res
        .status(429)
        .json({ success: false, error: message ?? "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}
