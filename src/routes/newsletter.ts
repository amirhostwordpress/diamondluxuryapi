// Newsletter — subscribe (public) + list subscribers (admin)
import { Router } from "express";
import { execute, query, queryOne } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, qp, qpInt } from "../lib/http";
import { sendNewsletterWelcome } from "../lib/email";
import type { NewsletterSubscriber } from "../types";

export const newsletterRouter = Router();

// ── POST /api/newsletter — subscribe (public) ─────────────────────────────────
newsletterRouter.post("/", async (req, res) => {
  try {
    const { email } = (req.body ?? {}) as { email?: string };

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return fail(res, "A valid email address is required.");
    }

    const normalised = email.trim().toLowerCase();

    // Check if already subscribed
    const existing = await queryOne<NewsletterSubscriber>(
      "SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1",
      [normalised]
    );

    if (existing) {
      if (existing.is_active) {
        return ok(res, undefined, 200, "You're already subscribed!");
      }
      // Re-activate
      await execute(
        "UPDATE newsletter_subscribers SET is_active = 1 WHERE email = ?",
        [normalised]
      );
    } else {
      await execute(
        "INSERT INTO newsletter_subscribers (email) VALUES (?)",
        [normalised]
      );
    }

    // Send welcome email non-blocking
    sendNewsletterWelcome(normalised).catch((err: unknown) =>
      console.error("[newsletter welcome email]", err)
    );

    return created(res, undefined, "You've been subscribed. Welcome to Diamond Insights!");
  } catch (error) {
    return serverError(res, "POST /api/newsletter", error);
  }
});

// ── GET /api/newsletter — paginated subscribers (admin only) ──────────────────
newsletterRouter.get("/", requireAuth, async (req, res) => {
  try {
    const activeParam = req.query.active;
    const page     = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const pageSize = Math.min(200, Math.max(1, qpInt(req.query.pageSize, 50) ?? 50));
    const offset   = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[]    = [];
    if (activeParam !== undefined) {
      conditions.push("is_active = ?");
      params.push(qp(activeParam) === "true" ? 1 : 0);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM newsletter_subscribers ${where}`, params
    );
    const total = totalRows[0]?.total ?? 0;

    const items = await query<NewsletterSubscriber>(
      `SELECT * FROM newsletter_subscribers ${where}
       ORDER BY subscribed_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return ok(res, { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return serverError(res, "GET /api/newsletter", error);
  }
});
