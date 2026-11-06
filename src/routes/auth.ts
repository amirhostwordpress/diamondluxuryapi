// Auth routes — login (sets admin_token cookie) + logout
import { Router } from "express";
import bcrypt from "bcryptjs";
import { queryOne } from "../lib/db";
import { signToken, setAuthCookie, clearAuthCookie } from "../lib/auth";
import { ok, fail, serverError } from "../lib/http";
import type { AdminUser } from "../types";

export const authRouter = Router();

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = (req.body ?? {}) as {
      username?: string;
      password?: string;
    };

    if (!username?.trim() || !password?.trim()) {
      return fail(res, "Username and password are required.");
    }

    // Look up by username or email
    const user = await queryOne<AdminUser>(
      `SELECT * FROM admin_users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [username.trim(), username.trim()]
    );

    if (!user) return fail(res, "Invalid credentials.", 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return fail(res, "Invalid credentials.", 401);

    const token = signToken({
      sub:      user.id,
      username: user.username,
      email:    user.email,
    });

    setAuthCookie(res, token);

    return ok(res, {
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    return serverError(res, "/api/auth/login", error);
  }
});

// POST /api/auth/logout
authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return ok(res, undefined, 200, "Logged out.");
});
