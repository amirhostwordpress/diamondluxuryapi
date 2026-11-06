// Upload — multipart file -> local storage (primary) + FTP mirror (secondary)
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../lib/auth";
import { execute } from "../lib/db";
import {
  uploadToFtp,
  categoryFromMime,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../lib/ftp";
import { created, fail, serverError } from "../lib/http";

export const uploadRouter = Router();

// Buffer the whole file in memory, capped at MAX_FILE_SIZE.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// POST /api/upload
uploadRouter.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return fail(res, "No file provided. Send a multipart field named 'file'.");
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return fail(res, `File type '${file.mimetype}' is not allowed.`, 415);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail(res, "File exceeds the 100 MB limit.", 413);
    }

    // Optional metadata fields
    const entityType = (req.body.entity_type as string) || null;
    const entityId = req.body.entity_id
      ? parseInt(String(req.body.entity_id), 10)
      : null;

    // ── Upload (local first, FTP mirror in background) ─────────────────────────
    const category = categoryFromMime(file.mimetype);
    const { publicUrl, ftpPath, storedName } = await uploadToFtp(
      file.buffer,
      file.originalname,
      category
    );

    // ── Audit log ─────────────────────────────────────────────────────────────
    const result = await execute(
      `INSERT INTO uploaded_files
         (original_name, stored_name, mime_type, size_bytes, ftp_path, public_url, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [file.originalname, storedName, file.mimetype, file.size, ftpPath, publicUrl, entityType, entityId]
    );

    return created(res, {
      id:           result.insertId,
      publicUrl,
      ftpPath,
      storedName,
      originalName:  file.originalname,
      mimeType:      file.mimetype,
      sizeBytes:     file.size,
    });
  } catch (error) {
    return serverError(res, "POST /api/upload", error);
  }
});
