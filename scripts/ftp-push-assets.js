/**
 * Download all Unsplash images used by the site and upload them to FTP.
 * Then update the MySQL DB records with the FTP-stored filenames.
 *
 * FTP structure:
 *   /uploads/
 *     images/        ← property & off-plan images
 *     agents/        ← agent profile photos
 *     news/          ← article cover images
 */

const ftp   = require("basic-ftp");
const mysql = require("mysql2/promise");
const https = require("https");
const http  = require("http");
const { Readable } = require("stream");
const path  = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const FTP = {
  host: "ftp.amirhost.in", port: 21,
  user: "u184056080.diamonduser", password: "Onion@123321",
};

const DB = {
  host: "srv629.hstgr.io", port: 3306,
  user: "u184056080_diamonduser", password: "Onion@123321",
  database: "u184056080_diamondluxury", connectionLimit: 3,
};

// FTP_BASE = root directory for uploads (relative to FTP home)
const FTP_BASE = "uploads";

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout: " + url)); });
  });
}

// Extract the Unsplash photo ID from a URL
function photoIdFromUrl(url) {
  const m = url.match(/unsplash\.com\/(photo-[^?]+)/);
  return m ? m[1] : null;
}

// Build a stable filename from the Unsplash photo ID + dimensions
function filenameFromUrl(url, prefix = "") {
  const id  = photoIdFromUrl(url) ?? "img";
  const wm  = url.match(/w=(\d+)/);
  const w   = wm ? wm[1] : "900";
  return `${prefix}${id}_w${w}.jpg`;
}

async function getFtp() {
  const c = new ftp.Client();
  c.ftp.verbose = false;
  await c.access({ ...FTP, secure: false });
  return c;
}

async function uploadFile(subDir, filename, buffer) {
  const c      = await getFtp();
  const dir    = `${FTP_BASE}/${subDir}`;
  const remote = `${dir}/${filename}`;
  try {
    await c.ensureDir(dir);
    await c.cd("/");
    const stream = Readable.from(buffer);
    await c.uploadFrom(stream, remote);
  } finally {
    c.close();
  }
  return remote;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECT all unique image URLs from the DB
// ─────────────────────────────────────────────────────────────────────────────
async function collectImages(conn) {
  const tasks = []; // { url, subDir, entityTable, entityId, fieldName, index }

  // Properties — images is a JSON array
  const [props] = await conn.query(
    "SELECT id, slug, images FROM properties WHERE images IS NOT NULL AND images != '[]'"
  );
  for (const p of props) {
    let imgs = [];
    try { imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch {}
    imgs.forEach((url, idx) => {
      if (url.includes("unsplash.com")) {
        tasks.push({ url, subDir: "images", entityTable: "properties", entityId: p.id, fieldName: "images", index: idx, slug: p.slug });
      }
    });
  }

  // Off-plan — single image_url
  const [ops] = await conn.query(
    "SELECT id, slug, image_url FROM off_plan_projects WHERE image_url IS NOT NULL"
  );
  for (const p of ops) {
    if (p.image_url?.includes("unsplash.com")) {
      tasks.push({ url: p.image_url, subDir: "images", entityTable: "off_plan_projects", entityId: p.id, fieldName: "image_url", index: 0, slug: p.slug });
    }
  }

  // News — single image_url
  const [arts] = await conn.query(
    "SELECT id, slug, image_url FROM news_articles WHERE image_url IS NOT NULL"
  );
  for (const a of arts) {
    if (a.image_url?.includes("unsplash.com")) {
      tasks.push({ url: a.image_url, subDir: "news", entityTable: "news_articles", entityId: a.id, fieldName: "image_url", index: 0, slug: a.slug });
    }
  }

  // Agents — single image_url
  const [agents] = await conn.query(
    "SELECT id, name, image_url FROM agents WHERE image_url IS NOT NULL"
  );
  for (const a of agents) {
    if (a.image_url?.includes("unsplash.com")) {
      tasks.push({ url: a.image_url, subDir: "agents", entityTable: "agents", entityId: a.id, fieldName: "image_url", index: 0, name: a.name });
    }
  }

  return tasks;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const pool = mysql.createPool(DB);
  const conn = await pool.getConnection();

  console.log("\n────────────────────────────────────────────────────");
  console.log("  Diamond Luxury — FTP Asset Push");
  console.log("────────────────────────────────────────────────────\n");

  // Step 1: Clean up previous nested mess
  console.log("Step 1: Cleaning up FTP structure...");
  const c = await getFtp();
  // Remove any bad nested dirs created earlier
  for (const bad of ["uploads/uploads", "uploads/images/uploads", "uploads/brochures/uploads", "uploads/videos/uploads", "uploads/misc/uploads"]) {
    try { await c.removeDir(bad); } catch { /* ignore */ }
  }
  // Ensure clean structure
  for (const d of ["uploads", "uploads/images", "uploads/agents", "uploads/news", "uploads/brochures", "uploads/videos"]) {
    try { await c.ensureDir(d); } catch {}
  }
  await c.cd("/");
  console.log("  ✓ Directory structure ready\n");

  // Step 2: Collect all image URLs
  console.log("Step 2: Scanning database for Unsplash images...");
  const tasks = await collectImages(conn);
  console.log(`  Found ${tasks.length} images to upload\n`);

  // Deduplicate by URL so same Unsplash photo isn't downloaded twice
  const urlToFtpPath = new Map();
  let uploaded = 0;
  let skipped  = 0;
  let failed   = 0;

  // Step 3: Download & upload
  console.log("Step 3: Downloading & uploading images...");

  // Build a set of files already on FTP so we can skip re-uploading
  const existingFiles = new Set();
  const checkFtp = await getFtp();
  try {
    for (const subDir of ["images", "agents", "news"]) {
      try {
        const items = await checkFtp.list(`${FTP_BASE}/${subDir}`);
        items.forEach(f => existingFiles.add(`${FTP_BASE}/${subDir}/${f.name}`));
      } catch {}
    }
  } finally {
    checkFtp.close();
  }
  console.log(`  ${existingFiles.size} files already on FTP (will skip re-uploading)\n`);

  for (const task of tasks) {
    const label = task.slug || task.name || task.entityId;

    if (urlToFtpPath.has(task.url)) {
      skipped++;
      continue;
    }

    const filename = filenameFromUrl(task.url, "");
    const remote   = `${FTP_BASE}/${task.subDir}/${filename}`;

    // Already uploaded in a previous run — reuse
    if (existingFiles.has(remote)) {
      urlToFtpPath.set(task.url, remote);
      skipped++;
      continue;
    }

    process.stdout.write(`  [${uploaded + skipped + failed + 1}/${tasks.length}] ${label} → `);

    try {
      const buffer = await downloadBuffer(task.url);
      await uploadFile(task.subDir, filename, buffer);
      urlToFtpPath.set(task.url, remote);
      console.log(`✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
      uploaded++;
    } catch (e) {
      console.log(`✗ FAILED (${e.message.slice(0, 60)})`);
      urlToFtpPath.set(task.url, null); // mark failed so we skip retry
      failed++;
    }
  }

  console.log(`\n  Uploaded: ${uploaded}  Skipped (dup): ${skipped}  Failed: ${failed}\n`);

  // Step 4: Update DB with FTP paths
  console.log("Step 4: Updating database records with FTP file paths...");

  // Group tasks by table + entity
  const propertyUpdates = new Map(); // id → [urls]
  const singleUpdates   = []; // { table, id, field, ftpPath }

  for (const task of tasks) {
    const ftpPath = urlToFtpPath.get(task.url);
    if (!ftpPath) continue;

    if (task.entityTable === "properties") {
      if (!propertyUpdates.has(task.entityId)) {
        // Load current images array for this property
        const [[row]] = await conn.query("SELECT images FROM properties WHERE id=?", [task.entityId]);
        let imgs = [];
        try { imgs = typeof row?.images === "string" ? JSON.parse(row.images) : (row?.images ?? []); } catch {}
        propertyUpdates.set(task.entityId, [...imgs]);
      }
      const arr = propertyUpdates.get(task.entityId);
      arr[task.index] = ftpPath;
    } else {
      singleUpdates.push({ table: task.entityTable, id: task.entityId, field: task.fieldName, ftpPath });
    }
  }

  // Apply property image array updates
  for (const [id, images] of propertyUpdates) {
    await conn.query("UPDATE properties SET images=? WHERE id=?", [JSON.stringify(images), id]);
    console.log(`  ✓ properties id=${id} images updated`);
  }

  // Apply single-field updates
  for (const u of singleUpdates) {
    await conn.query(`UPDATE ${u.table} SET ${u.field}=? WHERE id=?`, [u.ftpPath, u.id]);
    console.log(`  ✓ ${u.table} id=${u.id} ${u.field} updated`);
  }

  // Step 5: Verify FTP file counts
  console.log("\nStep 5: Verification...");
  const verifyClient = await getFtp();
  try {
    const ftpList    = await verifyClient.list("uploads/images");
    const newsFiles  = await verifyClient.list("uploads/news");
    const agentFiles = await verifyClient.list("uploads/agents");
    console.log(`  FTP uploads/images:  ${ftpList.length} files`);
    console.log(`  FTP uploads/news:    ${newsFiles.length} files`);
    console.log(`  FTP uploads/agents:  ${agentFiles.length} files`);
  } finally {
    verifyClient.close();
  }

  // Quick DB check
  const [[{ pcount }]] = await conn.query("SELECT COUNT(*) pcount FROM properties WHERE images != '[]'");
  console.log(`  DB properties with images: ${pcount}`);

  conn.release();
  await pool.end();

  console.log("\n✅ All assets pushed to FTP and DB updated!\n");
  console.log("NOTE: Once you deploy the site, set FTP_PUBLIC_URL to");
  console.log("      https://luxurydiamond.amirhost.in/uploads");
  console.log("      (or your final domain) so images serve correctly.\n");
}

main().catch((e) => {
  console.error("\n❌ Fatal error:", e.message);
  process.exit(1);
});
