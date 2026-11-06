// Download all FTP-only images to local backend/public/uploads/
// so they're served via the /uploads/* static route.
// Safe to run multiple times — skips files that already exist locally.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const ftp  = require("basic-ftp");
const fs   = require("fs");
const path = require("path");

const FTP_BASE = "/uploads";
const LOCAL_BASE = path.join(__dirname, "../public/uploads");

async function downloadDir(client, ftpDir, localDir) {
  fs.mkdirSync(localDir, { recursive: true });
  const list = await client.list(ftpDir);
  let downloaded = 0, skipped = 0, errors = 0;
  for (const f of list) {
    if (f.isDirectory) continue;
    const localFile = path.join(localDir, f.name);
    if (fs.existsSync(localFile)) {
      const stat = fs.statSync(localFile);
      if (stat.size === f.size) { skipped++; continue; }
    }
    try {
      await client.downloadTo(localFile, ftpDir + "/" + f.name);
      console.log("  ✓", ftpDir + "/" + f.name, "(" + f.size + " bytes)");
      downloaded++;
    } catch (e) {
      console.error("  ✗ FAILED:", f.name, e.message);
      errors++;
    }
  }
  return { downloaded, skipped, errors };
}

async function main() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  await client.access({
    host: process.env.FTP_HOST || "ftp.amirhost.in",
    port: parseInt(process.env.FTP_PORT || "21"),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false,
  });

  console.log("Connected to FTP. Downloading images...\n");

  let total = { downloaded: 0, skipped: 0, errors: 0 };

  // Download each category
  for (const cat of ["images", "agents", "news", "brochures", "videos", "misc"]) {
    const ftpDir = FTP_BASE + "/" + cat;
    const localDir = path.join(LOCAL_BASE, cat);
    try {
      const list = await client.list(ftpDir);
      const files = list.filter(f => !f.isDirectory);
      if (files.length === 0) { console.log(cat + ": empty, skipping"); continue; }
      console.log(cat + ": " + files.length + " file(s)...");
      const result = await downloadDir(client, ftpDir, localDir);
      total.downloaded += result.downloaded;
      total.skipped    += result.skipped;
      total.errors     += result.errors;
    } catch (e) {
      console.log(cat + ": no FTP directory (" + e.message + ")");
    }
  }

  client.close();
  console.log("\n═══════════════════════════════");
  console.log("Downloaded:", total.downloaded);
  console.log("Skipped (already local):", total.skipped);
  console.log("Errors:", total.errors);
}

main().catch(console.error);
