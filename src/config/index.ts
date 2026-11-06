// ─────────────────────────────────────────────────────────────────────────────
// Centralised environment-variable config
// All keys are read from process.env (loaded via dotenv in server.ts).
// ─────────────────────────────────────────────────────────────────────────────

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

// ── Server ────────────────────────────────────────────────────────────────────
export const serverConfig = {
  port:        parseInt(optional("PORT", "4000"), 10),
  // CORS origin — "*" allows any, otherwise a comma-separated allow-list.
  corsOrigin:  optional("CORS_ORIGIN", "*"),
};

// ── MySQL ─────────────────────────────────────────────────────────────────────
export const dbConfig = {
  host:            optional("DB_HOST", "localhost"),
  port:            parseInt(optional("DB_PORT", "3306"), 10),
  user:            optional("DB_USER", "root"),
  password:        optional("DB_PASSWORD", ""),
  database:        optional("DB_NAME", "diamond_luxury"),
  connectionLimit: parseInt(optional("DB_POOL_SIZE", "10"), 10),
};

// ── FTP ───────────────────────────────────────────────────────────────────────
export const ftpConfig = {
  host:     optional("FTP_HOST", "localhost"),
  port:     parseInt(optional("FTP_PORT", "21"), 10),
  user:     optional("FTP_USER", "ftpuser"),
  password: optional("FTP_PASSWORD", ""),
  // Remote base directory on the FTP server
  baseDir:  optional("FTP_BASE_DIR", "/public_html/uploads"),
  // Public base URL to serve uploaded files (e.g. https://luxurydiamond.amirhost.in/uploads)
  publicUrl: optional("FTP_PUBLIC_URL", "http://localhost/uploads"),
};

// ── Gmail SMTP ────────────────────────────────────────────────────────────────
export const emailConfig = {
  host:    optional("SMTP_HOST", "smtp.gmail.com"),
  port:    parseInt(optional("SMTP_PORT", "465"), 10),
  secure:  optional("SMTP_SECURE", "true") === "true",   // true = SSL/TLS on 465
  user:    optional("SMTP_USER", ""),
  pass:    optional("SMTP_PASS", ""),        // Gmail App Password
  from:    optional("SMTP_FROM", "Diamond Luxury Real Estate <noreply@diamondluxuryrealestate.ae>"),
  // Where admin notification emails are sent
  adminEmail: optional("ADMIN_EMAIL", "info@diamondluxuryrealestate.ae"),
};

// ── JWT ───────────────────────────────────────────────────────────────────────
// JWT_SECRET must be explicitly set in production — the insecure default is
// intentionally rejected so a misconfigured deployment fails loudly at startup
// rather than silently accepting forged tokens.
function requireSecret(key: string, devFallback: string): string {
  const val = process.env[key];
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Missing required environment variable in production: ${key}`
      );
    }
    return devFallback;
  }
  return val;
}

export const jwtConfig = {
  secret:    requireSecret("JWT_SECRET", "change-me-in-development-only"),
  expiresIn: optional("JWT_EXPIRES_IN", "8h"),
};

// ── App / Frontend ────────────────────────────────────────────────────────────
// siteUrl points at the public frontend (used to build links in emails).
// Reads SITE_URL, falling back to NEXT_PUBLIC_SITE_URL for convenience.
export const appConfig = {
  siteUrl:  optional("SITE_URL", optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")),
  siteName: optional("SITE_NAME", optional("NEXT_PUBLIC_SITE_NAME", "Diamond Luxury Real Estate")),
  nodeEnv:  optional("NODE_ENV", "development"),
};
