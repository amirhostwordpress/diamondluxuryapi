// ─────────────────────────────────────────────────────────────────────────────
// Diamond Luxury Real Estate — Express API server
// Run dev:  npm run dev   (tsx watch)
// Prod:     npm run build && npm start
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config"; // must be first so env vars load before config imports them
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { serverConfig } from "./config";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { agentsRouter } from "./routes/agents";
import { contactRouter } from "./routes/contact";
import { enquiriesRouter } from "./routes/enquiries";
import { newsRouter } from "./routes/news";
import { newsletterRouter } from "./routes/newsletter";
import { offPlanRouter } from "./routes/offPlan";
import { propertiesRouter } from "./routes/properties";
import { uploadRouter } from "./routes/upload";
import { settingsRouter } from "./routes/settings";
import { developersRouter } from "./routes/developers";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
// CORS: "*" reflects any origin; otherwise a comma-separated allow-list.
const allowedOrigin = serverConfig.corsOrigin.trim();
const corsOrigin: string | true =
  allowedOrigin === "*" ? true : allowedOrigin;
app.use(cors({ origin: corsOrigin, credentials: true }));

// JSON bodies (uploads use multipart via multer, not this).
app.use(express.json({ limit: "2mb" }));

// Cookies (admin_token httpOnly cookie for auth).
app.use(cookieParser());

// Trust the first proxy so req.protocol / secure cookies behave behind a proxy
// (e.g. when the Next.js rewrite forwards requests here).
app.set("trust proxy", 1);

// ── Static file serving for uploaded images ────────────────────────────────────
// Files are saved to backend/public/uploads/<category>/ by the upload route.
// They are served at /uploads/<category>/<filename> so the Next.js rewrite
// for /uploads/* can forward requests here.
const publicDir = path.resolve(__dirname, "../public");
app.use("/uploads", express.static(path.join(publicDir, "uploads"), {
  // Serve files with permissive CORS so next/image can load them cross-origin
  setHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: "ok", service: "diamond-luxury-backend" },
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter); // -> /api/admin/stats
app.use("/api/agents", agentsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/enquiries", enquiriesRouter);
app.use("/api/news", newsRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/off-plan", offPlanRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/developers", developersRouter);

// ── 404 (JSON) ─────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Not found." });
});

// ── Error handler ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // multer throws this when a file exceeds the limit
  if (err instanceof Error && err.message.includes("File too large")) {
    return res.status(413).json({ success: false, error: "File exceeds the 100 MB limit." });
  }
  console.error("[unhandled error]", err);
  res.status(500).json({ success: false, error: "Server error." });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = serverConfig.port;
app.listen(PORT, () => {
  console.log(`◆ Diamond Luxury backend listening on http://localhost:${PORT}`);
});
