// Off-plan projects — list (public) + create/get/update/delete (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate, qp, qpInt } from "../lib/http";
import type { OffPlanProject } from "../types";

export const offPlanRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialise a value to a JSON string for storage, or null if empty/undefined. */
function toJson(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s === "null" || s === "[]") return null;
    return s; // already a JSON string from the client
  }
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  return JSON.stringify(v);
}

/** Parse a JSON column that MySQL may return as a string or already-parsed value. */
function fromJson<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "string") {
    try { return JSON.parse(v) as T; } catch { return null; }
  }
  return v as T;
}

/** Hydrate JSON columns on a row returned from MySQL. */
function hydrate(row: Record<string, unknown>): OffPlanProject {
  return {
    ...row,
    amenities:     fromJson(row.amenities),
    floor_plans:   fromJson(row.floor_plans),
    gallery_images: fromJson(row.gallery_images),
    nearby_places: fromJson(row.nearby_places),
  } as OffPlanProject;
}

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

    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM off_plan_projects ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return ok(res, { items: rows.map(hydrate), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
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
      property_type,
      payment_booking      = 10,
      payment_construction = 70,
      payment_handover     = 20,
      amenities, floor_plans, gallery_images, nearby_places,
    } = body;

    if (!slug || !title || !developer || !location || !completion || !price_from) {
      return fail(res, "slug, title, developer, location, completion and price_from are required.");
    }

    const result = await execute(
      `INSERT INTO off_plan_projects
         (slug, title, developer, location, community, completion, price_from,
          beds, image_url, brochure_url, tag, description, is_active,
          property_type, payment_booking, payment_construction, payment_handover,
          amenities, floor_plans, gallery_images, nearby_places)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        slug, title, developer, location, community ?? null,
        completion, price_from, beds ?? "", image_url ?? null,
        brochure_url ?? null, tag, description ?? null,
        is_active ? 1 : 0,
        property_type ?? null,
        Number(payment_booking),
        Number(payment_construction),
        Number(payment_handover),
        toJson(amenities),
        toJson(floor_plans),
        toJson(gallery_images),
        toJson(nearby_places),
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

    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM off_plan_projects WHERE ${isNumeric ? "id = ?" : "slug = ?"} LIMIT 1`,
      [isNumeric ? parseInt(id, 10) : id]
    );

    if (!row) return fail(res, "Not found.", 404);
    return ok(res, hydrate(row));
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
      property_type,
      payment_booking, payment_construction, payment_handover,
      amenities, floor_plans, gallery_images, nearby_places,
    } = body;

    await execute(
      `UPDATE off_plan_projects SET
         slug                 = COALESCE(?, slug),
         title                = COALESCE(?, title),
         developer            = COALESCE(?, developer),
         location             = COALESCE(?, location),
         community            = COALESCE(?, community),
         completion           = COALESCE(?, completion),
         price_from           = COALESCE(?, price_from),
         beds                 = COALESCE(?, beds),
         image_url            = COALESCE(?, image_url),
         brochure_url         = COALESCE(?, brochure_url),
         tag                  = COALESCE(?, tag),
         description          = COALESCE(?, description),
         is_active            = COALESCE(?, is_active),
         property_type        = COALESCE(?, property_type),
         payment_booking      = COALESCE(?, payment_booking),
         payment_construction = COALESCE(?, payment_construction),
         payment_handover     = COALESCE(?, payment_handover),
         amenities            = COALESCE(?, amenities),
         floor_plans          = COALESCE(?, floor_plans),
         gallery_images       = COALESCE(?, gallery_images),
         nearby_places        = COALESCE(?, nearby_places)
       WHERE id = ?`,
      [
        slug ?? null, title ?? null, developer ?? null, location ?? null,
        community ?? null, completion ?? null, price_from ?? null,
        beds ?? null, image_url ?? null, brochure_url ?? null,
        tag ?? null, description ?? null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        property_type !== undefined ? (property_type ?? null) : null,
        payment_booking      != null ? Number(payment_booking)      : null,
        payment_construction != null ? Number(payment_construction) : null,
        payment_handover     != null ? Number(payment_handover)     : null,
        amenities      !== undefined ? toJson(amenities)      : null,
        floor_plans    !== undefined ? toJson(floor_plans)    : null,
        gallery_images !== undefined ? toJson(gallery_images) : null,
        nearby_places  !== undefined ? toJson(nearby_places)  : null,
        id,
      ]
    );

    return ok(res, undefined, 200, "Updated.");
  } catch (error) {
    return serverError(res, "PUT /api/off-plan/:id", error);
  }
});

// ── DELETE /api/off-plan/:id — hard delete (admin) ────────────────────────────
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
