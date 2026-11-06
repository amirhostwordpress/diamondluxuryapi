// Contact — submit enquiry + fire emails (public)
import { Router } from "express";
import { execute } from "../lib/db";
import {
  sendContactNotification,
  sendContactConfirmation,
  type ContactFormData,
} from "../lib/email";
import { ok, fail, serverError } from "../lib/http";

export const contactRouter = Router();

// POST /api/contact
contactRouter.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};
    const { firstName, lastName, email, phone, interest, budget, message } =
      body as Record<string, string>;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!firstName?.trim()) return fail(res, "First name is required.");
    if (!lastName?.trim())  return fail(res, "Last name is required.");
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail(res, "A valid email address is required.");
    if (!interest?.trim())  return fail(res, "Please select an interest.");

    const validInterests = ["buy", "rent", "sell", "offplan", "other"];
    if (!validInterests.includes(interest))
      return fail(res, "Invalid interest value.");

    // ── Persist to DB ─────────────────────────────────────────────────────────
    await execute(
      `INSERT INTO enquiries
         (first_name, last_name, email, phone, interest, budget, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        interest,
        budget?.trim() || null,
        message?.trim() || null,
      ]
    );

    // ── Send emails (non-blocking — don't fail the response if SMTP is down) ──
    const data: ContactFormData = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone?.trim() || undefined,
      interest,
      budget:    budget?.trim() || undefined,
      message:   message?.trim() || undefined,
    };

    await Promise.allSettled([
      sendContactNotification(data),
      sendContactConfirmation(data),
    ]);

    return ok(res, undefined, 201, "Your enquiry has been received. We'll be in touch within 24 hours.");
  } catch (error) {
    return serverError(res, "/api/contact", error);
  }
});
