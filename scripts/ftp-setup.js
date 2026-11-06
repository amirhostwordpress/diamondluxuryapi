/**
 * FTP setup script — creates the uploads directory structure and
 * uploads a test file to confirm public serving works.
 */
const ftp = require("basic-ftp");
const { Readable } = require("stream");

async function run() {
  const c = new ftp.Client();
  c.ftp.verbose = false;

  await c.access({
    host: "ftp.amirhost.in", port: 21,
    user: "u184056080.diamonduser", password: "Onion@123321", secure: false,
  });
  console.log("✅ Connected\n");

  // Create directory structure
  const dirs = ["uploads", "uploads/images", "uploads/brochures", "uploads/videos", "uploads/misc"];
  for (const dir of dirs) {
    try {
      await c.ensureDir(dir);
      console.log(`  ✓ Created: ${dir}`);
    } catch (e) {
      console.log(`  ✗ Failed: ${dir} — ${e.message}`);
    }
  }

  // Upload a tiny test file
  const testContent = Buffer.from(`<!-- Diamond Luxury Real Estate CDN root | Created: ${new Date().toISOString()} -->\n`);
  const stream = Readable.from(testContent);
  try {
    await c.cd("/");
    await c.uploadFrom(stream, "uploads/test.txt");
    console.log("\n  ✓ Test file uploaded: uploads/test.txt");
  } catch (e) {
    console.log("\n  ✗ Test upload failed:", e.message);
  }

  // Verify structure
  console.log("\n  Final directory listing:");
  try {
    const items = await c.list("/uploads");
    items.forEach(f => console.log("    " + (f.type === 2 ? "[DIR] " : "[FILE]") + f.name));
  } catch (e) {
    console.log("  Could not list /uploads:", e.message);
  }

  c.close();
  console.log("\n✅ FTP setup complete.");
  console.log("\n⚠  IMPORTANT: Update FTP_BASE_DIR and FTP_PUBLIC_URL in .env.local");
  console.log("   FTP_BASE_DIR = /uploads  (or the absolute path on the server)");
  console.log("   FTP_PUBLIC_URL = https://<your-domain>/uploads");
}

run().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
