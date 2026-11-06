// ─────────────────────────────────────────────────────────────────────────────
// Small response helpers that preserve the original API response envelope:
//   { success: true,  data?, message? }
//   { success: false, error }
// ─────────────────────────────────────────────────────────────────────────────
import { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200, message?: string): Response {
  return res.status(status).json({ success: true, data, ...(message ? { message } : {}) });
}

export function created<T>(res: Response, data: T, message?: string): Response {
  return res.status(201).json({ success: true, data, ...(message ? { message } : {}) });
}

export function fail(res: Response, error: string, status = 400): Response {
  return res.status(status).json({ success: false, error });
}

export function serverError(res: Response, label: string, error: unknown): Response {
  console.error(`[${label}]`, error);
  return res.status(500).json({ success: false, error: "Server error." });
}

/** True for a mysql2 duplicate-key error. */
export function isDuplicate(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("Duplicate entry");
}

/**
 * Read a single string value from an Express query value
 * (which may be string | string[] | undefined).
 */
export function qp(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0] as string;
  return null;
}

/** Parse a query string to an int, or null if absent/invalid. */
export function qpInt(v: unknown, def: number | null = null): number | null {
  const s = qp(v);
  if (s === null) return def;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? def : n;
}
