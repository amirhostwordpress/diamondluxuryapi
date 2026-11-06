// Off-plan projects — list (public) + create/get/update/delete (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate, qp, qpInt } from "../lib/http";
import type { OffPlanProject } from "../types";

export const offPlanRouter = Router();

// ── GET /api/off-plan — paginated list (public) ───────────────────────────────
offPlanRouter.get("/", async (req, res) => {
  try {
    const developer = qp(req.query.developer);
    const tag       = qp(req.query.tag);
    const page      = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const pageSize  = Math.min(50, Math.max(1, qpInt(req.query.pageSize, 12) ?? 12));
    const offset    = (page - 1) * pageSize;

    const conditions = ["is_active = 1"];
    const params: unknown[] = [];

    if (developer) { conditions.push("developer LIKE ?"); params.push(`%${developer}%`); }
    if (tag)       { conditions.push("tag = ?");          params.push(tag); }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const totalRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM off_plan_projects ${where}`, params
    );
    const total = totalRows[0]?.total ?? 0;

    const items = await query<OffPlanProject>(
      `SELECT * FROM off_plan_projects ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return ok(res, { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return serverError(res, "GET /api/off-plan", error);
  }
});

// ── POST /api/off-plan — create (admin) ───────────────────────────────────────
offPlanRouter.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      slug, title, developer, location, community, completion,
      price_from, beds, image_url, brochure_url, tag = "NEW LAUNCH",
      description, is_active = true,
    } = body;

    if (!slug || !title || !developer || !location || !completion || !price_from) {
      return fail(res, "slug, title, developer, location, completion and price_from are required.");
    }

    const result = await execute(
      `INSERT INTO off_plan_projects
         (slug, title, developer, location, community, completion, price_from,
          beds, image_url, brochure_url, tag, description, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        slug, title, developer, location, community ?? null,
        completion, price_from, beds ?? "", image_url ?? null,
        brochure_url ?? null, tag, description ?? null,
        is_active ? 1 : 0,
      ]
    );

    return created(res, { id: result.insertId }, "Off-plan project created.");
  } catch (error) {
    if (isDuplicate(error)) return fail(res, "Slug already exists.", 409);
    return serverError(res, "POST /api/off-plan", error);
  }
});

// ── GET /api/off-plan/:id — by id or slug (public) ────────────────────────────
offPlanRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;
    const isNumeric = /^\d+$/.test(id);

    const row = await queryOne<OffPlanProject>(
      `SELECT * FROM off_plan_projects WHERE ${isNumeric ? "id = ?" : "slug = ?"} LIMIT 1`,
      [isNumeric ? parseInt(id, 10) : id]
    );

    if (!row) return fail(res, "Not found.", 404);
    return ok(res, row);
  } catch (error) {
    return serverError(res, "GET /api/off-plan/:id", error);
  }
});

// ── PUT /api/off-plan/:id — update (admin) ────────────────────────────────────
offPlanRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};
    const {
      slug, title, developer, location, community, completion,
      price_from, beds, image_url, brochure_url, tag, description, is_active,
    } = body;

    await execute(
      `UPDATE off_plan_projects SET
         slug         = COALESCE(?, slug),
         title        = COALESCE(?, title),
         developer    = COALESCE(?, developer),
         location     = COALESCE(?, location),
         community    = COALESCE(?, community),
         completion   = COALESCE(?, completion),
         price_from   = COALESCE(?, price_from),
         beds         = COALESCE(?, beds),
         image_url    = COALESCE(?, image_url),
         brochure_url = COALESCE(?, brochure_url),
         tag          = COALESCE(?, tag),
         description  = COALESCE(?, description),
         is_active    = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        slug ?? null, title ?? null, developer ?? null, location ?? null,
        community ?? null, completion ?? null, price_from ?? null,
        beds ?? null, image_url ?? null, brochure_url ?? null,
        tag ?? null, description ?? null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    return ok(res, undefined, 200, "Updated.");
  } catch (error) {
    return serverError(res, "PUT /api/off-plan/:id", error);
  }
});

// ── DELETE /api/off-plan/:id — hard delete (admin) ─────────────────────────────
offPlanRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await execute("DELETE FROM off_plan_projects WHERE id = ?", [id]);
    if (result.affectedRows === 0) return fail(res, "Not found.", 404);
    return ok(res, undefined, 200, "Deleted.");
  } catch (error) {
    return serverError(res, "DELETE /api/off-plan/:id", error);
  }
});
