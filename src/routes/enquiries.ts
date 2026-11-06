// Enquiries — submit (public) + list/get/patch-status/delete (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, qp, qpInt } from "../lib/http";
import { sendPropertyEnquiryNotification, sendContactConfirmation } from "../lib/email";
import { appConfig } from "../config";
import type { Enquiry } from "../types";

export const enquiriesRouter = Router();

// ── POST /api/enquiries — property enquiry (public) ──────────────────────────
enquiriesRouter.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      firstName, lastName, email, phone, interest = "other",
      budget, message, property_id, propertyTitle,
    } = body as Record<string, string | undefined>;

    if (!firstName?.trim()) return fail(res, "First name required.");
    if (!lastName?.trim())  return fail(res, "Last name required.");
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail(res, "Valid email required.");

    const propId = property_id ? parseInt(String(property_id), 10) : null;

    const result = await execute(
      `INSERT INTO enquiries
         (first_name, last_name, email, phone, interest, budget, message, property_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        firstName.trim(), lastName.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null, interest,
        budget?.trim() || null, message?.trim() || null,
        propId,
      ]
    );

    // Send emails non-blocking
    const data = {
      firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      interest, budget: budget?.trim() || undefined,
      message: message?.trim() || undefined,
    };

    if (propId && propertyTitle) {
      await Promise.allSettled([
        sendPropertyEnquiryNotification({
          ...data,
          propertyTitle,
          propertyUrl: `${appConfig.siteUrl}/properties/${propId}`,
        }),
        sendContactConfirmation(data),
      ]);
    } else {
      await Promise.allSettled([sendContactConfirmation(data)]);
    }

    return created(res, { id: result.insertId });
  } catch (error) {
    return serverError(res, "POST /api/enquiries", error);
  }
});

// ── GET /api/enquiries — paginated list (admin) ──────────────────────────────
enquiriesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const status   = qp(req.query.status);
    const interest = qp(req.query.interest);
    const page     = Math.max(1, qpInt(req.query.page, 1) ?? 1);
    const pageSize = Math.min(100, Math.max(1, qpInt(req.query.pageSize, 20) ?? 20));
    const offset   = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (status)   { conditions.push("e.status = ?");   params.push(status); }
    if (interest) { conditions.push("e.interest = ?"); params.push(interest); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM enquiries e ${where}`, params
    );
    const total = totalRows[0]?.total ?? 0;

    const items = await query<Enquiry>(
      `SELECT e.*, p.title AS property_title, p.slug AS property_slug
       FROM enquiries e
       LEFT JOIN properties p ON p.id = e.property_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return ok(res, { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return serverError(res, "GET /api/enquiries", error);
  }
});

// ── GET /api/enquiries/:id — single (admin) ───────────────────────────────────
enquiriesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await queryOne(
      `SELECT e.*, p.title AS property_title FROM enquiries e
       LEFT JOIN properties p ON p.id = e.property_id
       WHERE e.id = ? LIMIT 1`,
      [id]
    );
    if (!row) return fail(res, "Not found.", 404);
    return ok(res, row);
  } catch (error) {
    return serverError(res, "GET /api/enquiries/:id", error);
  }
});

// ── PATCH /api/enquiries/:id — update status (admin) ──────────────────────────
enquiriesRouter.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = (req.body ?? {}) as { status?: string };
    const validStatuses = ["new", "contacted", "closed"];
    if (!status || !validStatuses.includes(status)) {
      return fail(res, "Valid status required: new | contacted | closed");
    }
    const result = await execute(
      "UPDATE enquiries SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) return fail(res, "Not found.", 404);
    return ok(res, undefined, 200, "Status updated.");
  } catch (error) {
    return serverError(res, "PATCH /api/enquiries/:id", error);
  }
});

// ── DELETE /api/enquiries/:id — hard delete (admin) ────────────────────────────
enquiriesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await execute("DELETE FROM enquiries WHERE id = ?", [id]);
    if (result.affectedRows === 0) return fail(res, "Not found.", 404);
    return ok(res, undefined, 200, "Deleted.");
  } catch (error) {
    return serverError(res, "DELETE /api/enquiries/:id", error);
  }
});
