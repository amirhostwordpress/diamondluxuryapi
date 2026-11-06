// Agents — list (public) + create/update/deactivate (admin)
import { Router } from "express";
import { query, queryOne, execute } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { ok, created, fail, serverError, isDuplicate } from "../lib/http";
import type { Agent } from "../types";

export const agentsRouter = Router();

// ── GET /api/agents — list active agents (public) ────────────────────────────
agentsRouter.get("/", async (_req, res) => {
  try {
    const items = await query<Agent>(
      "SELECT id, name, role, email, phone, bio, image_url, is_active, created_at FROM agents WHERE is_active = 1 ORDER BY id ASC"
    );
    return ok(res, items);
  } catch (error) {
    return serverError(res, "GET /api/agents", error);
  }
});

// ── POST /api/agents — create agent (admin) ──────────────────────────────────
agentsRouter.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const { name, role, email, phone = "", bio, image_url, is_active = true } = body;

    if (!name?.trim() || !role?.trim() || !email?.trim()) {
      return fail(res, "name, role and email are required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, "Invalid email.");
    }

    const result = await execute(
      `INSERT INTO agents (name, role, email, phone, bio, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), role.trim(), email.trim().toLowerCase(),
        phone.trim(), bio ?? null, image_url ?? null,
        is_active ? 1 : 0,
      ]
    );

    return created(res, { id: result.insertId }, "Agent created.");
  } catch (error) {
    if (isDuplicate(error)) return fail(res, "Email already exists.", 409);
    return serverError(res, "POST /api/agents", error);
  }
});

// ── GET /api/agents/:id — single agent (public) ───────────────────────────────
agentsRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, "Agent not found.", 404);
    const row = await queryOne<Agent>(
      "SELECT id, name, role, email, phone, bio, image_url, is_active, created_at FROM agents WHERE id = ? LIMIT 1",
      [id]
    );
    if (!row) return fail(res, "Agent not found.", 404);
    return ok(res, row);
  } catch (error) {
    return serverError(res, "GET /api/agents/:id", error);
  }
});

// ── PUT /api/agents/:id — update (admin) ──────────────────────────────────────
agentsRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};
    const { name, role, email, phone, bio, image_url, is_active } = body;

    await execute(
      `UPDATE agents SET
         name      = COALESCE(?, name),
         role      = COALESCE(?, role),
         email     = COALESCE(?, email),
         phone     = COALESCE(?, phone),
         bio       = COALESCE(?, bio),
         image_url = COALESCE(?, image_url),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null, role ?? null,
        email ? email.trim().toLowerCase() : null,
        phone ?? null, bio ?? null, image_url ?? null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    return ok(res, undefined, 200, "Agent updated.");
  } catch (error) {
    return serverError(res, "PUT /api/agents/:id", error);
  }
});

// ── DELETE /api/agents/:id — soft-delete / deactivate (admin) ──────────────────
agentsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Soft-delete — set is_active = 0 to preserve FK references
    const result = await execute(
      "UPDATE agents SET is_active = 0 WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return fail(res, "Agent not found.", 404);
    return ok(res, undefined, 200, "Agent deactivated.");
  } catch (error) {
    return serverError(res, "DELETE /api/agents/:id", error);
  }
});
