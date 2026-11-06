/**
 * Fix the 2 records that still have Unsplash URLs because photo-1600607687644
 * returned 404. Replace with a working Unsplash photo and re-upload to FTP.
 */
const ftp    = require("basic-ftp");
const mysql  = require("mysql2/promise");
const https  = require("https");
const { Readable } = require("stream");

const FTP = { host:"ftp.amirhost.in", port:21, user:"u184056080.diamonduser", password:"Onion@123321" };
const DB  = { host:"srv629.hstgr.io", port:3306, user:"u184056080_diamonduser", password:"Onion@123321", database:"u184056080_diamondluxury", connectionLimit:2 };

// Replacement: photo-1600607687644 → use a similar luxury living room photo
// (photo-1600210491892 is already uploaded; use photo-1600566753086 for variety)
const REPLACEMENT_URL_900 = "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=85";
const REPLACEMENT_URL_700 = "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=700&q=85";

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function upload(c, subDir, filename, buffer) {
  await c.cd("/");
  const remote = `uploads/${subDir}/${filename}`;
  const stream = Readable.from(buffer);
  await c.uploadFrom(stream, remote);
  return remote;
}

async function main() {
  const pool = mysql.createPool(DB);
  const conn = await pool.getConnection();

  // Find affected records
  const [props] = await conn.query(
    "SELECT id, slug, images FROM properties WHERE images LIKE '%unsplash%'"
  );
  const [ops]   = await conn.query(
    "SELECT id, slug, image_url FROM off_plan_projects WHERE image_url LIKE '%unsplash%'"
  );

  console.log(`Found ${props.length} properties + ${ops.length} off-plan projects still with Unsplash URLs\n`);

  const c = new ftp.Client();
  c.ftp.verbose = false;
  await c.access({ ...FTP, secure: false });

  // Download replacement images (two sizes)
  console.log("Downloading replacement images...");
  const buf900 = await download(REPLACEMENT_URL_900);
  const buf700 = await download(REPLACEMENT_URL_700);
  console.log(`  900px: ${(buf900.length/1024).toFixed(0)} KB`);
  console.log(`  700px: ${(buf700.length/1024).toFixed(0)} KB\n`);

  // Upload to FTP (deduplicated — both go to uploads/images)
  const fname900 = "photo-1600047509807-ba8f99d2cdde_w900.jpg"; // already exists, just reuse the path
  const fname700 = "photo-1600047509807-ba8f99d2cdde_w700.jpg"; // may not exist yet
  const ftpPath900 = `uploads/images/${fname900}`;
  let   ftpPath700 = `uploads/images/${fname700}`;

  // Check if 700 exists already
  const imgList = await c.list("/uploads/images");
  const has700  = imgList.some(f => f.name === fname700);
  if (!has700) {
    ftpPath700 = await upload(c, "images", fname700, buf700);
    console.log(`  Uploaded: ${ftpPath700}`);
  } else {
    console.log(`  Skipped (exists): ${ftpPath700}`);
  }

  // Fix properties
  for (const p of props) {
    let imgs = [];
    try { imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch {}
    const fixed = imgs.map(url =>
      url.includes("unsplash.com") ? ftpPath900 : url
    );
    await conn.query("UPDATE properties SET images=? WHERE id=?", [JSON.stringify(fixed), p.id]);
    console.log(`  ✓ property "${p.slug}" fixed`);
  }

  // Fix off-plan
  for (const op of ops) {
    await conn.query("UPDATE off_plan_projects SET image_url=? WHERE id=?", [ftpPath700, op.id]);
    console.log(`  ✓ off-plan "${op.slug}" fixed`);
  }

  c.close();

  // Final check
  const [[{ remaining }]] = await conn.query(
    "SELECT COUNT(*) remaining FROM properties WHERE images LIKE '%unsplash%'"
  );
  const [[{ rem_op }]] = await conn.query(
    "SELECT COUNT(*) rem_op FROM off_plan_projects WHERE image_url LIKE '%unsplash%'"
  );
  console.log(`\n  Remaining Unsplash refs — properties: ${remaining}, off-plan: ${rem_op}`);

  conn.release();
  await pool.end();
  console.log("\n✅ Done!\n");
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
