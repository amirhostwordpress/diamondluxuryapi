// Properties — filtered list (public) + create/get/update/delete (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate, qp, qpInt } from "../lib/http";

export const propertiesRouter = Router();

interface DbPropertyRow {
  id: number;
  slug: string;
  // Core identity
  title: string;
  sub_title: string;
  ref: string;
  listing_type: string;
  status: string;
  // Pricing
  price: number;
  price_sqft: number;
  price_note: string;
  // Specs
  sqft: number;
  beds: number;
  baths: number;
  parking: number;
  property_type: string;
  furnishing: string;
  floor: string;
  view: string;
  // Location
  highlights: string;
  location: string;
  unit_detail: string;
  community: string;
  developer: string | null;
  completion_date: string | null;
  // Rich content
  description: string | null;
  highlights_list: string | string[];   // JSON array of bullet strings
  project_description: string | string[]; // JSON array of paragraph strings
  amenities: string | Record<string, string>[]; // JSON array of {icon, label}
  // Location extras
  map_src: string | null;
  map_label: string | null;
  // Media
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

/** Parse any JSON column that may arrive as a raw string or already-parsed value. */
function parseJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
}

/** Parse the JSON `images` column (stored as a JSON string). */
function parseImages(images: DbPropertyRow["images"]): string[] {
  return parseJson<string[]>(images) ?? [];
}

/** Serialise a value for a JSON column: stringify arrays/objects, pass null through. */
function toJsonCol(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    // Already a JSON string — validate round-trip then return as-is
    try { JSON.parse(v); return v; } catch { /* not valid JSON, fall through */ }
  }
  return JSON.stringify(v);
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
      images:              parseImages(r.images),
      highlights_list:     parseJson<string[]>(r.highlights_list)     ?? [],
      project_description: parseJson<string[]>(r.project_description) ?? [],
      amenities:           parseJson<Record<string, string>[]>(r.amenities) ?? [],
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
      slug, title, sub_title = "", ref = "", listing_type, status = "active",
      price, price_sqft, price_note = "",
      sqft, beds, baths, parking,
      property_type = "", furnishing = "", floor = "", view = "",
      highlights = "", location = "", unit_detail = "", community = "",
      developer, completion_date,
      description, highlights_list, project_description, amenities,
      map_src, map_label,
      images = [], brochure_url, video_url, agent_id,
    } = body;

    if (!slug || !title || !listing_type || !price) {
      return fail(res, "slug, title, listing_type and price are required.");
    }

    const result = await execute(
      `INSERT INTO properties
         (slug, title, sub_title, ref, listing_type, status,
          price, price_sqft, price_note,
          sqft, beds, baths, parking,
          property_type, furnishing, floor, view,
          highlights, location, unit_detail, community, developer, completion_date,
          description, highlights_list, project_description, amenities,
          map_src, map_label,
          images, brochure_url, video_url, agent_id)
       VALUES (?,?,?,?,?,?, ?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?,?,?,?, ?,?,?,?, ?,?, ?,?,?,?)`,
      [
        slug, title, sub_title, ref, listing_type, status,
        price, price_sqft ?? 0, price_note,
        sqft ?? 0, beds ?? 0, baths ?? 0, parking ?? 0,
        property_type, furnishing, floor, view,
        highlights, location, unit_detail, community, developer ?? null, completion_date ?? null,
        description ?? null,
        toJsonCol(highlights_list),
        toJsonCol(project_description),
        toJsonCol(amenities),
        map_src ?? null, map_label ?? null,
        JSON.stringify(images),
        brochure_url ?? null, video_url ?? null, agent_id ?? null,
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
      images:              parseImages(row.images),
      highlights_list:     parseJson<string[]>(row.highlights_list)     ?? [],
      project_description: parseJson<string[]>(row.project_description) ?? [],
      amenities:           parseJson<Record<string, string>[]>(row.amenities) ?? [],
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
      slug, title, sub_title, ref, listing_type, status,
      price, price_sqft, price_note,
      sqft, beds, baths, parking,
      property_type, furnishing, floor, view,
      highlights, location, unit_detail, community, developer,
      completion_date, description,
      highlights_list, project_description, amenities,
      map_src, map_label,
      images, brochure_url, video_url, agent_id,
    } = body;

    await execute(
      `UPDATE properties SET
         slug                = COALESCE(?, slug),
         title               = COALESCE(?, title),
         sub_title           = COALESCE(?, sub_title),
         ref                 = COALESCE(?, ref),
         listing_type        = COALESCE(?, listing_type),
         status              = COALESCE(?, status),
         price               = COALESCE(?, price),
         price_sqft          = COALESCE(?, price_sqft),
         price_note          = COALESCE(?, price_note),
         sqft                = COALESCE(?, sqft),
         beds                = COALESCE(?, beds),
         baths               = COALESCE(?, baths),
         parking             = COALESCE(?, parking),
         property_type       = COALESCE(?, property_type),
         furnishing          = COALESCE(?, furnishing),
         floor               = COALESCE(?, floor),
         view                = COALESCE(?, view),
         highlights          = COALESCE(?, highlights),
         location            = COALESCE(?, location),
         unit_detail         = COALESCE(?, unit_detail),
         community           = COALESCE(?, community),
         developer           = COALESCE(?, developer),
         completion_date     = COALESCE(?, completion_date),
         description         = COALESCE(?, description),
         highlights_list     = COALESCE(?, highlights_list),
         project_description = COALESCE(?, project_description),
         amenities           = COALESCE(?, amenities),
         map_src             = COALESCE(?, map_src),
         map_label           = COALESCE(?, map_label),
         images              = COALESCE(?, images),
         brochure_url        = COALESCE(?, brochure_url),
         video_url           = COALESCE(?, video_url),
         agent_id            = COALESCE(?, agent_id)
       WHERE id = ?`,
      [
        slug         ?? null,
        title        ?? null,
        sub_title    ?? null,
        ref          ?? null,
        listing_type ?? null,
        status       ?? null,
        price        ?? null,
        price_sqft   ?? null,
        price_note   ?? null,
        sqft         ?? null,
        beds         ?? null,
        baths        ?? null,
        parking      ?? null,
        property_type ?? null,
        furnishing   ?? null,
        floor        ?? null,
        view         ?? null,
        highlights   ?? null,
        location     ?? null,
        unit_detail  ?? null,
        community    ?? null,
        developer    ?? null,
        completion_date ?? null,
        description  ?? null,
        highlights_list     !== undefined ? toJsonCol(highlights_list)     : null,
        project_description !== undefined ? toJsonCol(project_description) : null,
        amenities           !== undefined ? toJsonCol(amenities)           : null,
        map_src    ?? null,
        map_label  ?? null,
        images !== undefined ? JSON.stringify(images) : null,
        brochure_url ?? null,
        video_url    ?? null,
        agent_id     ?? null,
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
