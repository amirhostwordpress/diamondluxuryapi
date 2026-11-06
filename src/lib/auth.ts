// ─────────────────────────────────────────────────────────────────────────────
// JWT auth for admin routes (Express)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config";

export interface JwtPayload {
  sub:      number;   // admin_users.id
  username: string;
  email:    string;
  iat?:     number;
  exp?:     number;
}

// Augment Express Request so handlers can read req.user.
declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

// ── Sign / Verify ──────────────────────────────────────────────────────────────
export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.secret) as unknown as JwtPayload;
}

// ── Extract bearer token from request ────────────────────────────────────────
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  // Also accept httpOnly cookie named "admin_token"
  const cookie = req.cookies?.admin_token;
  if (cookie) return cookie;

  return null;
}

// ── Middleware: require a valid admin token ───────────────────────────────────
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    _res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    _res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

// ── Middleware: attach user if a valid token is present, but don't fail ──────
// Used by public endpoints that optionally show more to admins (e.g. /api/news).
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // ignore — leave req.user unset
    }
  }
  next();
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path:     "/",
  maxAge:   8 * 60 * 60, // 8 hours
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie("admin_token", token, COOKIE_OPTS);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
  });
}
