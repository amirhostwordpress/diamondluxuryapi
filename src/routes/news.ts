// News — list (public, optional admin) + create/get/update/delete
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth, optionalAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate, qp, qpInt } from "../lib/http";
import type { NewsArticle } from "../types";

export const newsRouter = Router();

// ── GET /api/news — list articles (public; admins see unpublished) ───────────
newsRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const category = qp(req.query.category);
    const featured = qp(req.query.featured);   // "true" to get featured only
    const page     = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const pageSize = Math.min(50, Math.max(1, qpInt(req.query.pageSize, 12) ?? 12));
    const offset   = (page - 1) * pageSize;

    // Allow admins to see all articles (including unpublished). Unlike the
    // original, this now requires a valid admin token — the bare `_admin=1`
    // flag alone no longer bypasses the published-only filter.
    const isAdmin = qp(req.query._admin) === "1" && !!req.user;

    const conditions: string[] = isAdmin
      ? []
      : ["published_at IS NOT NULL", "published_at <= NOW()"];
    const params: unknown[] = [];

    if (category && category !== "All") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (featured === "true") {
      conditions.push("is_featured = 1");
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const totalRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM news_articles ${where}`, params
    );
    const total = totalRows[0]?.total ?? 0;

    const items = await query<NewsArticle>(
      `SELECT * FROM news_articles ${where}
       ORDER BY is_featured DESC, published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return ok(res, { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return serverError(res, "GET /api/news", error);
  }
});

// ── POST /api/news — create (admin) ────────────────────────────────────────────
newsRouter.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      slug, title, excerpt, body: articleBody, category,
      image_url, read_time, is_featured = false, published_at,
    } = body;

    if (!slug || !title || !excerpt || !category) {
      return fail(res, "slug, title, excerpt and category are required.");
    }

    const result = await execute(
      `INSERT INTO news_articles
         (slug, title, excerpt, body, category, image_url, read_time, is_featured, published_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        slug, title, excerpt, articleBody ?? null, category,
        image_url ?? null, read_time ?? null,
        is_featured ? 1 : 0,
        published_at ?? new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );

    return created(res, { id: result.insertId }, "Article created.");
  } catch (error) {
    if (isDuplicate(error)) return fail(res, "Slug already exists.", 409);
    return serverError(res, "POST /api/news", error);
  }
});

// ── GET /api/news/:id — by id or slug (public) ─────────────────────────────────
newsRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;
    const isNumeric = /^\d+$/.test(id);

    const row = await queryOne<NewsArticle>(
      `SELECT * FROM news_articles WHERE ${isNumeric ? "id = ?" : "slug = ?"} LIMIT 1`,
      [isNumeric ? parseInt(id, 10) : id]
    );

    if (!row) return fail(res, "Not found.", 404);
    return ok(res, row);
  } catch (error) {
    return serverError(res, "GET /api/news/:id", error);
  }
});

// ── PUT /api/news/:id — update (admin) ─────────────────────────────────────────
newsRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};
    const {
      slug, title, excerpt, body: articleBody, category,
      image_url, read_time, is_featured, published_at,
    } = body;

    await execute(
      `UPDATE news_articles SET
         slug         = COALESCE(?, slug),
         title        = COALESCE(?, title),
         excerpt      = COALESCE(?, excerpt),
         body         = COALESCE(?, body),
         category     = COALESCE(?, category),
         image_url    = COALESCE(?, image_url),
         read_time    = COALESCE(?, read_time),
         is_featured  = COALESCE(?, is_featured),
         published_at = COALESCE(?, published_at)
       WHERE id = ?`,
      [
        slug ?? null, title ?? null, excerpt ?? null, articleBody ?? null,
        category ?? null, image_url ?? null, read_time ?? null,
        is_featured !== undefined ? (is_featured ? 1 : 0) : null,
        published_at ?? null,
        id,
      ]
    );

    return ok(res, undefined, 200, "Updated.");
  } catch (error) {
    return serverError(res, "PUT /api/news/:id", error);
  }
});

// ── DELETE /api/news/:id — hard delete (admin) ─────────────────────────────────
newsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await execute("DELETE FROM news_articles WHERE id = ?", [id]);
    if (result.affectedRows === 0) return fail(res, "Not found.", 404);
    return ok(res, undefined, 200, "Deleted.");
  } catch (error) {
    return serverError(res, "DELETE /api/news/:id", error);
  }
});
