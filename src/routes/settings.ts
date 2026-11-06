// Site settings (CMS) — public GET (flat key/value object) + admin PUT (upsert)
//
// Lets the admin dashboard manage site-wide content (hero text, contact details,
// social links, stats, etc.) so the whole website is editable from the admin
// panel without touching code.
import { Router } from "express";
import { query, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, fail, serverError, qp } from "../lib/http";
import type { SiteSetting } from "../types";

export const settingsRouter = Router();

// ── GET /api/settings — all settings as { key: value } (public) ───────────────
settingsRouter.get("/", async (req, res) => {
  try {
    const section = qp(req.query.section);
    const where = section ? "WHERE `section` = ?" : "";
    const params: unknown[] = section ? [section] : [];

    const rows = await query<SiteSetting>(
      `SELECT setting_key, value, section, updated_at
       FROM site_settings
       ${where}
       ORDER BY section ASC, setting_key ASC`,
      params
    );

    // Flatten to { key: value } for easy frontend consumption.
    const data: Record<string, string> = {};
    for (const r of rows) data[r.setting_key] = r.value ?? "";

    return ok(res, data);
  } catch (error) {
    // Degrade gracefully — if the table is missing or the DB is unreachable,
    // return an empty object so the public site falls back to its defaults.
    console.error("[GET /api/settings] (returning empty):", error);
    return ok(res, {});
  }
});

// ── PUT /api/settings — upsert multiple settings (admin) ─────────────────────
// Body: { settings: { key: value, ... } }  (values are stringified server-side)
settingsRouter.put("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const settings = body.settings as Record<string, unknown> | undefined;

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return fail(res, "Body must include a 'settings' object of { key: value }.");
    }

    const entries = Object.entries(settings);
    if (entries.length === 0) return fail(res, "No settings provided.");

    for (const [key, value] of entries) {
      const strVal = value == null ? "" : String(value);
      // Upsert by key (setting_key is UNIQUE).
      await execute(
        `INSERT INTO site_settings (setting_key, value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, strVal]
      );
    }

    return ok(res, undefined, 200, "Settings saved.");
  } catch (error) {
    return serverError(res, "PUT /api/settings", error);
  }
});
