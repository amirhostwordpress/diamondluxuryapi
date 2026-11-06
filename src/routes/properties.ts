// Properties — filtered list (public) + create/get/update/delete (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate, qp, qpInt } from "../lib/http";

export const propertiesRouter = Router();

interface DbPropertyRow {
  id: number;
  slug: string;
  title: string;
  listing_type: string;
  status: string;
  price: number;
  price_sqft: number;
  sqft: number;
  beds: number;
  baths: number;
  parking: number;
  highlights: string;
  location: string;
  community: string;
  developer: string | null;
  completion_date: string | null;
  description: string | null;
  images: string | string[];
  brochure_url: string | null;
  video_url: string | null;
  agent_id: number | null;
  agent_name: string | null;
  agent_role: string | null;
  agent_image: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  created_at: string;
  updated_at: string;
}

/** Parse the JSON `images` column (stored as a JSON string). */
function parseImages(images: DbPropertyRow["images"]): string[] {
  return typeof images === "string" ? JSON.parse(images) : (images ?? []);
}

// ── GET /api/properties — filtered + paginated list (public) ──────────────────
propertiesRouter.get("/", async (req, res) => {
  try {
    const listingType = qp(req.query.type);        // sale | rent | off-plan
    const status      = qp(req.query.status);       // active | sold | rented | draft
    const community   = qp(req.query.community);
    const developer   = qp(req.query.developer);
    const beds        = qpInt(req.query.beds);
    const minPrice    = qp(req.query.minPrice);
    const maxPrice    = qp(req.query.maxPrice);
    const page        = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const pageSize    = Math.min(50, Math.max(1, qpInt(req.query.pageSize, 12) ?? 12));
    const offset      = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (listingType) { conditions.push("p.listing_type = ?"); params.push(listingType); }
    // Default to active only for public listing
    if (status)      { conditions.push("p.status = ?");       params.push(status); }
    else             { conditions.push("p.status = 'active'"); }
    if (community)   { conditions.push("p.community LIKE ?"); params.push(`%${community}%`); }
    if (developer)   { conditions.push("p.developer LIKE ?"); params.push(`%${developer}%`); }
    if (beds !== null) { conditions.push("p.beds = ?");       params.push(beds); }
    if (minPrice)    { conditions.push("p.price >= ?");       params.push(parseFloat(minPrice)); }
    if (maxPrice)    { conditions.push("p.price <= ?");       params.push(parseFloat(maxPrice)); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const totalRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM properties p
       ${where}`,
      params
    );
    const total = totalRows[0]?.total ?? 0;

    // Fetch page
    const rows = await query<DbPropertyRow>(
      `SELECT p.*,
              a.name  AS agent_name,
              a.role  AS agent_role,
              a.image_url AS agent_image,
              a.phone AS agent_phone,
              a.email AS agent_email
       FROM properties p
       LEFT JOIN agents a ON a.id = p.agent_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const items = rows.map((r) => ({
      ...r,
      images: parseImages(r.images),
    }));

    return ok(res, {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return serverError(res, "GET /api/properties", error);
  }
});

// ── POST /api/properties — create (admin) ─────────────────────────────────────
propertiesRouter.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      slug, title, listing_type, status = "active",
      price, price_sqft, sqft, beds, baths, parking,
      highlights, location, community, developer, completion_date,
      description, images = [], brochure_url, video_url, agent_id,
    } = body;

    if (!slug || !title || !listing_type || !price) {
      return fail(res, "slug, title, listing_type and price are required.");
    }

    const result = await execute(
      `INSERT INTO properties
         (slug, title, listing_type, status, price, price_sqft, sqft, beds, baths,
          parking, highlights, location, community, developer, completion_date,
          description, images, brochure_url, video_url, agent_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        slug, title, listing_type, status,
        price, price_sqft ?? 0, sqft ?? 0, beds ?? 0, baths ?? 0,
        parking ?? 0, highlights ?? "", location ?? "", community ?? "",
        developer ?? null, completion_date ?? null,
        description ?? null, JSON.stringify(images),
        brochure_url ?? null, video_url ?? null,
        agent_id ?? null,
      ]
    );

    return created(res, { id: result.insertId }, "Property created.");
  } catch (error) {
    if (isDuplicate(error)) return fail(res, "Slug already exists.", 409);
    return serverError(res, "POST /api/properties", error);
  }
});

// ── GET /api/properties/:id — by numeric id OR slug (public) ──────────────────
propertiesRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;
    const isNumeric = /^\d+$/.test(id);

    const row = await queryOne<DbPropertyRow>(
      `SELECT p.*,
              a.name      AS agent_name,
              a.role      AS agent_role,
              a.image_url AS agent_image,
              a.phone     AS agent_phone,
              a.email     AS agent_email
       FROM properties p
       LEFT JOIN agents a ON a.id = p.agent_id
       WHERE ${isNumeric ? "p.id = ?" : "p.slug = ?"}
       LIMIT 1`,
      [isNumeric ? parseInt(id, 10) : id]
    );

    if (!row) return fail(res, "Property not found.", 404);

    const property = {
      ...row,
      images: parseImages(row.images),
    };
    return ok(res, property);
  } catch (error) {
    return serverError(res, "GET /api/properties/:id", error);
  }
});

// ── PUT /api/properties/:id — update (admin) ──────────────────────────────────
propertiesRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};
    const {
      slug, title, listing_type, status, price, price_sqft, sqft,
      beds, baths, parking, highlights, location, community, developer,
      completion_date, description, images, brochure_url, video_url, agent_id,
    } = body;

    await execute(
      `UPDATE properties SET
         slug            = COALESCE(?, slug),
         title           = COALESCE(?, title),
         listing_type    = COALESCE(?, listing_type),
         status          = COALESCE(?, status),
         price           = COALESCE(?, price),
         price_sqft      = COALESCE(?, price_sqft),
         sqft            = COALESCE(?, sqft),
         beds            = COALESCE(?, beds),
         baths           = COALESCE(?, baths),
         parking         = COALESCE(?, parking),
         highlights      = COALESCE(?, highlights),
         location        = COALESCE(?, location),
         community       = COALESCE(?, community),
         developer       = COALESCE(?, developer),
         completion_date = COALESCE(?, completion_date),
         description     = COALESCE(?, description),
         images          = COALESCE(?, images),
         brochure_url    = COALESCE(?, brochure_url),
         video_url       = COALESCE(?, video_url),
         agent_id        = COALESCE(?, agent_id)
       WHERE id = ?`,
      [
        slug ?? null, title ?? null, listing_type ?? null, status ?? null,
        price ?? null, price_sqft ?? null, sqft ?? null,
        beds ?? null, baths ?? null, parking ?? null,
        highlights ?? null, location ?? null, community ?? null, developer ?? null,
        completion_date ?? null, description ?? null,
        images ? JSON.stringify(images) : null,
        brochure_url ?? null, video_url ?? null, agent_id ?? null,
        id,
      ]
    );

    return ok(res, undefined, 200, "Property updated.");
  } catch (error) {
    return serverError(res, "PUT /api/properties/:id", error);
  }
});

// ── DELETE /api/properties/:id — hard delete (admin) ───────────────────────────
propertiesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await execute("DELETE FROM properties WHERE id = ?", [id]);
    if (result.affectedRows === 0) return fail(res, "Property not found.", 404);
    return ok(res, undefined, 200, "Property deleted.");
  } catch (error) {
    return serverError(res, "DELETE /api/properties/:id", error);
  }
});
