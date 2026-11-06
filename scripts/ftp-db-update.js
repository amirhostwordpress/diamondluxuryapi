/**
 * Step 4 only: Read FTP file list and update DB image paths.
 * Run this after ftp-push-assets.js has uploaded the files.
 */
const ftp   = require("basic-ftp");
const mysql = require("mysql2/promise");

const FTP = {
  host: "ftp.amirhost.in", port: 21,
  user: "u184056080.diamonduser", password: "Onion@123321",
};
const DB = {
  host: "srv629.hstgr.io", port: 3306,
  user: "u184056080_diamonduser", password: "Onion@123321",
  database: "u184056080_diamondluxury", connectionLimit: 3,
};
const FTP_BASE = "uploads";

// Same photo ID → filename logic used in the upload script
function filenameFromUrl(url) {
  const m  = url.match(/unsplash\.com\/(photo-[^?]+)/);
  const id = m ? m[1] : "img";
  const wm = url.match(/w=(\d+)/);
  const w  = wm ? wm[1] : "900";
  return `${id}_w${w}.jpg`;
}

function ftpPathForUrl(url) {
  // Determine subDir by looking at what the upload script used
  // Agents and news use dedicated dirs; everything else goes to images
  // (This is determined at call-site based on entity type)
  return null; // handled below per entity
}

async function main() {
  const pool = mysql.createPool(DB);
  const conn = await pool.getConnection();

  // Build a map: filename → full ftp path, for each subdir
  const c = new ftp.Client();
  c.ftp.verbose = false;
  await c.access({ ...FTP, secure: false });

  console.log("✅ FTP connected\n");

  const ftpFiles = {};
  for (const subDir of ["images", "agents", "news"]) {
    try {
      const items = await c.list(`/${FTP_BASE}/${subDir}`);
      items.forEach(f => {
        ftpFiles[f.name] = `${FTP_BASE}/${subDir}/${f.name}`;
      });
      console.log(`  ${subDir}: ${items.length} files`);
    } catch (e) {
      console.log(`  ${subDir}: (empty or error) ${e.message}`);
    }
  }
  c.close();

  console.log(`\n  Total FTP files mapped: ${Object.keys(ftpFiles).length}\n`);

  // ── Update properties ──────────────────────────────────────────────────────
  console.log("Updating properties...");
  const [props] = await conn.query(
    "SELECT id, slug, images FROM properties WHERE images IS NOT NULL"
  );
  for (const p of props) {
    let imgs = [];
    try { imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch {}
    let changed = false;
    const updated = imgs.map(url => {
      if (!url.includes("unsplash.com")) return url; // already updated
      const fname = filenameFromUrl(url);
      if (ftpFiles[fname]) { changed = true; return ftpFiles[fname]; }
      return url;
    });
    if (changed) {
      await conn.query("UPDATE properties SET images=? WHERE id=?", [JSON.stringify(updated), p.id]);
      console.log(`  ✓ property "${p.slug}" images updated`);
    }
  }

  // ── Update off_plan_projects ───────────────────────────────────────────────
  console.log("\nUpdating off-plan projects...");
  const [ops] = await conn.query("SELECT id, slug, image_url FROM off_plan_projects");
  for (const p of ops) {
    if (!p.image_url?.includes("unsplash.com")) continue;
    const fname = filenameFromUrl(p.image_url);
    if (ftpFiles[fname]) {
      await conn.query("UPDATE off_plan_projects SET image_url=? WHERE id=?", [ftpFiles[fname], p.id]);
      console.log(`  ✓ off-plan "${p.slug}" image_url updated`);
    }
  }

  // ── Update news_articles ───────────────────────────────────────────────────
  console.log("\nUpdating news articles...");
  const [arts] = await conn.query("SELECT id, slug, image_url FROM news_articles");
  for (const a of arts) {
    if (!a.image_url?.includes("unsplash.com")) continue;
    const fname = filenameFromUrl(a.image_url);
    if (ftpFiles[fname]) {
      await conn.query("UPDATE news_articles SET image_url=? WHERE id=?", [ftpFiles[fname], a.id]);
      console.log(`  ✓ article "${a.slug}" image_url updated`);
    }
  }

  // ── Update agents ──────────────────────────────────────────────────────────
  console.log("\nUpdating agents...");
  const [agents] = await conn.query("SELECT id, name, image_url FROM agents");
  for (const a of agents) {
    if (!a.image_url?.includes("unsplash.com")) continue;
    const fname = filenameFromUrl(a.image_url);
    if (ftpFiles[fname]) {
      await conn.query("UPDATE agents SET image_url=? WHERE id=?", [ftpFiles[fname], a.id]);
      console.log(`  ✓ agent "${a.name}" image_url updated`);
    }
  }

  // ── Final verification ─────────────────────────────────────────────────────
  console.log("\n── Final DB check ──────────────────────────────────────");
  const [[{ props_ftp }]] = await conn.query(
    "SELECT COUNT(*) props_ftp FROM properties WHERE images NOT LIKE '%unsplash%' AND images != '[]'"
  );
  const [[{ agents_ftp }]] = await conn.query(
    "SELECT COUNT(*) agents_ftp FROM agents WHERE image_url NOT LIKE '%unsplash%' AND image_url IS NOT NULL"
  );
  const [[{ news_ftp }]] = await conn.query(
    "SELECT COUNT(*) news_ftp FROM news_articles WHERE image_url NOT LIKE '%unsplash%' AND image_url IS NOT NULL"
  );
  const [[{ op_ftp }]] = await conn.query(
    "SELECT COUNT(*) op_ftp FROM off_plan_projects WHERE image_url NOT LIKE '%unsplash%' AND image_url IS NOT NULL"
  );
  console.log(`  Properties with FTP images:  ${props_ftp}/14`);
  console.log(`  Agents with FTP images:      ${agents_ftp}/8`);
  console.log(`  News articles with FTP img:  ${news_ftp}/12`);
  console.log(`  Off-plan with FTP images:    ${op_ftp}/6`);

  conn.release();
  await pool.end();
  console.log("\n✅ DB update complete!\n");
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
