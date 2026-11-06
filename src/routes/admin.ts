// Admin dashboard stats
import { Router } from "express";
import { query } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, serverError } from "../lib/http";

export const adminRouter = Router();

// GET /api/admin/stats — dashboard counters (admin only)
adminRouter.get("/stats", requireAuth, async (_req, res) => {
  try {
    const rows = await query<{
      properties_sale:   number;
      properties_rent:   number;
      off_plan:          number;
      agents:            number;
      enquiries_new:     number;
      enquiries_total:   number;
      news_total:        number;
      newsletter_active: number;
    }>(`
        SELECT
          (SELECT COUNT(*) FROM properties WHERE listing_type='sale' AND status='active')   AS properties_sale,
          (SELECT COUNT(*) FROM properties WHERE listing_type='rent' AND status='active')   AS properties_rent,
          (SELECT COUNT(*) FROM off_plan_projects WHERE is_active=1)                        AS off_plan,
          (SELECT COUNT(*) FROM agents WHERE is_active=1)                                   AS agents,
          (SELECT COUNT(*) FROM enquiries WHERE status='new')                               AS enquiries_new,
          (SELECT COUNT(*) FROM enquiries)                                                  AS enquiries_total,
          (SELECT COUNT(*) FROM news_articles WHERE published_at IS NOT NULL)               AS news_total,
          (SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active=1)                  AS newsletter_active
      `);

    const s = rows[0];

    // Recent enquiries (last 5)
    const recent = await query<{
      id: number; first_name: string; last_name: string;
      email: string; interest: string; status: string; created_at: string;
    }>(
      `SELECT id, first_name, last_name, email, interest, status, created_at
       FROM enquiries ORDER BY created_at DESC LIMIT 5`
    );

    return ok(res, { stats: s, recent });
  } catch (error) {
    return serverError(res, "GET /api/admin/stats", error);
  }
});
