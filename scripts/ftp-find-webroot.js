/**
 * Find the web root by uploading a test file to candidate paths
 * and checking which one is HTTP-accessible.
 */
const ftp = require("basic-ftp");
const { Readable } = require("stream");
const https = require("https");

const DOMAIN = "luxurydiamond.amirhost.in";

function httpGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode < 400 });
      res.resume();
    });
    req.on("error", () => resolve({ status: 0, ok: false }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, ok: false }); });
  });
}

async function run() {
  const c = new ftp.Client();
  c.ftp.verbose = false;

  await c.access({
    host: "ftp.amirhost.in", port: 21,
    user: "u184056080.diamonduser", password: "Onion@123321", secure: false,
  });
  console.log("✅ FTP connected\n");

  // Show full tree from root
  async function listRecursive(path, depth = 0) {
    try {
      const items = await c.list(path);
      for (const f of items) {
        const pad = "  ".repeat(depth + 1);
        console.log(`${pad}${f.type === 2 ? "[DIR]" : "[FIL]"} ${path}/${f.name}`);
        if (f.type === 2 && depth < 3 && !f.name.startsWith(".")) {
          await listRecursive(`${path}/${f.name}`, depth + 1);
        }
      }
    } catch { /* skip */ }
  }

  console.log("Directory tree:");
  await listRecursive("/");

  // Upload a probe file to candidate paths
  const candidates = [
    "/uploads",
    "/public_html",
    "/htdocs",
    "/www",
    "/web",
  ];

  console.log("\nTesting HTTP accessibility:");
  for (const dir of candidates) {
    try {
      await c.ensureDir(dir);
      const stream = Readable.from(Buffer.from("diamond-probe"));
      await c.uploadFrom(stream, `${dir}/probe.txt`);
      const result = await httpGet(`https://${DOMAIN}/probe.txt`);
      const status = result.ok ? "✅ ACCESSIBLE" : `❌ HTTP ${result.status}`;
      console.log(`  ${dir}/probe.txt → ${status}`);
      if (result.ok) {
        console.log(`\n  ✅ WEB ROOT FOUND: ${dir}`);
        console.log(`     Set FTP_BASE_DIR=${dir}/uploads in .env.local`);
      }
      // cleanup
      try { await c.remove(`${dir}/probe.txt`); } catch { /* ignore */ }
    } catch (e) {
      console.log(`  ${dir} → ❌ ${e.message}`);
    }
  }

  c.close();
}

run().catch(e => { console.error("Error:", e.message); process.exit(1); });
