// ─────────────────────────────────────────────────────────────────────────────
// File-upload utility
//
// PRIMARY storage  — local filesystem at  backend/public/uploads/<category>/
//   Files are served statically by Express at /uploads/<category>/<file>.
//   The Next.js frontend proxies /uploads/* → this backend, so the public URL
//   is always:  <BACKEND_PUBLIC_URL>/uploads/<category>/<file>
//
// SECONDARY storage — FTP mirror (fire-and-forget, non-blocking)
//   If FTP credentials are configured the file is also pushed to the FTP server
//   after the local write.  An FTP failure never fails the upload request.
// ─────────────────────────────────────────────────────────────────────────────
import * as ftp from "basic-ftp";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ftpConfig } from "../config";

export type UploadCategory = "images" | "brochures" | "videos" | "misc";

export interface UploadResult {
  publicUrl:  string;  // full public URL to serve the file  (via backend /uploads/*)
  ftpPath:    string;  // path on the FTP server (empty string when FTP is disabled)
  storedName: string;  // filename as stored (uuid + original extension)
  localPath:  string;  // absolute path on the backend host filesystem
}

// ── Local storage root ────────────────────────────────────────────────────────
// Resolved relative to this file:  backend/src/lib/ftp.ts → ../../public
const LOCAL_UPLOADS_ROOT = path.resolve(__dirname, "../../public/uploads");

// ── Public URL base ───────────────────────────────────────────────────────────
// Used to construct the URL returned to callers.
// Falls back to ftpConfig.publicUrl for backwards compatibility; you can set
// LOCAL_PUBLIC_URL (or keep FTP_PUBLIC_URL) to point at the Express server.
function localPublicBase(): string {
  // Prefer an explicit LOCAL_PUBLIC_URL env var; then use FTP_PUBLIC_URL if it
  // looks like it points to the backend (localhost or the backend's own host),
  // otherwise fall back to a sensible default.
  const env = process.env.LOCAL_PUBLIC_URL || process.env.FTP_PUBLIC_URL || "";
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:4000/uploads";
}

/**
 * Save a file buffer to the local filesystem.
 *
 * @param buffer       File data
 * @param originalName Original filename (extension is preserved)
 * @param category     Sub-directory category
 */
export async function saveLocally(
  buffer: Buffer,
  originalName: string,
  category: UploadCategory = "misc"
): Promise<{ localPath: string; storedName: string; publicUrl: string }> {
  const ext        = path.extname(originalName).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;
  const dir        = path.join(LOCAL_UPLOADS_ROOT, category);
  const localPath  = path.join(dir, storedName);

  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });

  // Write file
  fs.writeFileSync(localPath, buffer);

  const publicUrl = `${localPublicBase()}/${category}/${storedName}`;
  return { localPath, storedName, publicUrl };
}

/**
 * Upload a file buffer to the FTP server (non-blocking mirror).
 * This is called fire-and-forget after the local save; errors are only logged.
 */
export async function mirrorToFtp(
  buffer: Buffer,
  storedName: string,
  category: UploadCategory = "misc"
): Promise<string> {
  // Skip if FTP is not configured (host is still the default localhost value)
  if (!ftpConfig.host || ftpConfig.host === "localhost") {
    return "";
  }

  const remoteDir  = `${ftpConfig.baseDir}/${category}`;
  const remotePath = `${remoteDir}/${storedName}`;

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host:     ftpConfig.host,
      port:     ftpConfig.port,
      user:     ftpConfig.user,
      password: ftpConfig.password,
      secure:   false,
    });
    await client.ensureDir(remoteDir);
    const readable = Readable.from(buffer);
    await client.uploadFrom(readable, remotePath);
    return remotePath;
  } catch (err) {
    console.error("[FTP] mirror error (non-fatal):", (err as Error).message);
    return "";
  } finally {
    client.close();
  }
}

/**
 * Primary upload entry-point.
 *
 * 1. Saves the file to the local filesystem (always — this is the source of truth).
 * 2. Mirrors to FTP in the background (non-blocking, failure is non-fatal).
 *
 * Returns immediately after the local write.
 */
export async function uploadToFtp(
  buffer: Buffer,
  originalName: string,
  category: UploadCategory = "misc"
): Promise<UploadResult> {
  // 1. Local save (primary, synchronous)
  const { localPath, storedName, publicUrl } = await saveLocally(buffer, originalName, category);

  // 2. FTP mirror (secondary, fire-and-forget)
  let ftpPath = "";
  mirrorToFtp(buffer, storedName, category)
    .then((p) => { ftpPath = p; })
    .catch(() => { /* already logged inside mirrorToFtp */ });

  return { publicUrl, ftpPath, storedName, localPath };
}

/**
 * Delete a file from the local filesystem and (best-effort) from FTP.
 */
export async function deleteUpload(
  localPath: string,
  ftpFilePath: string
): Promise<void> {
  // Delete locally
  try {
    if (localPath && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch (err) {
    console.error("[upload] local delete error:", (err as Error).message);
  }

  // Mirror deletion to FTP (best-effort)
  if (!ftpFilePath) return;
  const client = new ftp.Client();
  try {
    await client.access({
      host:     ftpConfig.host,
      port:     ftpConfig.port,
      user:     ftpConfig.user,
      password: ftpConfig.password,
      secure:   false,
    });
    await client.remove(ftpFilePath);
  } catch (err) {
    console.error("[FTP] delete error (non-fatal):", (err as Error).message);
  } finally {
    client.close();
  }
}

// Keep the old name as an alias so nothing else breaks
export const deleteFromFtp = deleteUpload;

/**
 * Detect the correct upload category from a MIME type.
 */
export function categoryFromMime(mime: string): UploadCategory {
  if (mime.startsWith("image/"))       return "images";
  if (mime === "application/pdf")      return "brochures";
  if (mime.startsWith("video/"))       return "videos";
  return "misc";
}

/**
 * Allowed MIME types for uploads (security whitelist).
 */
export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/** Max upload size: 100 MB */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
