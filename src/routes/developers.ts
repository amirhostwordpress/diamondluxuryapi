// Developers — list (public) + full CRUD (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, qp, qpInt } from "../lib/http";
import type { Developer } from "../types";

export const developersRouter = Router();

// ── GET /api/developers — list active developers ordered by display_order (public) ──
developersRouter.get("/", async (req, res) => {
  try {
    // Admin flag returns all (including inactive); public returns active only.
    const isAdmin   = qp(req.query._admin) === "1";
    const pageSize  = Math.min(100, Math.max(1, qpInt(req.query.pageSize, 50) ?? 50));
    const page      = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const offset    = (page - 1) * pageSize;
    const search    = qp(req.query.search);

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (!isAdmin) {
      conditions.push("is_active = 1");
    }
    if (search) {
      conditions.push("name LIKE ?");
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [items, countRow] = await Promise.all([
      query<Developer>(
        `SELECT id, name, logo_url, website_url, display_order, is_active, created_at, updated_at
         FROM developers ${where}
         ORDER BY display_order ASC, id ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      ),
      queryOne<{ total: number }>(
        `SELECT COUNT(*) AS total FROM developers ${where}`,
        params
      ),
    ]);

    return ok(res, { items, total: countRow?.total ?? 0, page, pageSize });
  } catch (error) {
    return serverError(res, "GET /api/developers", error);
  }
});

// ── GET /api/developers/:id ───────────────────────────────────────────────────
developersRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, "Developer not found.", 404);

    const row = await queryOne<Developer>(
      "SELECT id, name, logo_url, website_url, display_order, is_active, created_at, updated_at FROM developers WHERE id = ? LIMIT 1",
      [id]
    );
    if (!row) return fail(res, "Developer not found.", 404);
    return ok(res, row);
  } catch (error) {
    return serverError(res, "GET /api/developers/:id", error);
  }
});

// ── POST /api/developers — create (admin) ─────────────────────────────────────
developersRouter.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const { name, logo_url = "", website_url = "", display_order = 0, is_active = true } = body;

    if (!name?.trim()) return fail(res, "name is required.");

    const result = await execute(
      `INSERT INTO developers (name, logo_url, website_url, display_order, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        logo_url.trim(),
        website_url.trim(),
        Number(display_order) || 0,
        is_active ? 1 : 0,
      ]
    );

    return created(res, { id: result.insertId }, "Developer created.");
  } catch (error) {
    return serverError(res, "POST /api/developers", error);
  }
});

// ── PUT /api/developers/:id — update (admin) ──────────────────────────────────
developersRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const id   = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, "Developer not found.", 404);

    const body = req.body ?? {};
    const { name, logo_url, website_url, display_order, is_active } = body;

    const result = await execute(
      `UPDATE developers SET
         name          = COALESCE(?, name),
         logo_url      = COALESCE(?, logo_url),
         website_url   = COALESCE(?, website_url),
         display_order = COALESCE(?, display_order),
         is_active     = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name     !== undefined ? name.trim()              : null,
        logo_url !== undefined ? logo_url.trim()          : null,
        website_url !== undefined ? website_url.trim()    : null,
        display_order !== undefined ? Number(display_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0)    : null,
        id,
      ]
    );

    if (result.affectedRows === 0) return fail(res, "Developer not found.", 404);
    return ok(res, undefined, 200, "Developer updated.");
  } catch (error) {
    return serverError(res, "PUT /api/developers/:id", error);
  }
});

// ── DELETE /api/developers/:id — hard delete (admin) ─────────────────────────
developersRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, "Developer not found.", 404);

    const result = await execute("DELETE FROM developers WHERE id = ?", [id]);
    if (result.affectedRows === 0) return fail(res, "Developer not found.", 404);
    return ok(res, undefined, 200, "Developer deleted.");
  } catch (error) {
    return serverError(res, "DELETE /api/developers/:id", error);
  }
});
