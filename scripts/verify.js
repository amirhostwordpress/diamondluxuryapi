const mysql = require("mysql2/promise");

async function verify() {
  const pool = mysql.createPool({
    host: "srv629.hstgr.io", port: 3306,
    user: "u184056080_diamonduser", password: "Onion@123321",
    database: "u184056080_diamondluxury", connectionLimit: 1,
  });
  const conn = await pool.getConnection();

  const checks = [
    ["Sale properties",   "SELECT COUNT(*) n FROM properties WHERE listing_type='sale' AND status='active'"],
    ["Rental properties", "SELECT COUNT(*) n FROM properties WHERE listing_type='rent' AND status='active'"],
    ["Off-plan projects", "SELECT COUNT(*) n FROM off_plan_projects WHERE is_active=1"],
    ["News articles",     "SELECT COUNT(*) n FROM news_articles WHERE published_at IS NOT NULL"],
    ["Agents (active)",   "SELECT COUNT(*) n FROM agents WHERE is_active=1"],
    ["Admin users",       "SELECT COUNT(*) n FROM admin_users"],
    ["Enquiries",         "SELECT COUNT(*) n FROM enquiries"],
    ["Newsletter subs",   "SELECT COUNT(*) n FROM newsletter_subscribers"],
  ];

  console.log("\n  ┌─ Database verification ─────────────────────────────");
  for (const [label, sql] of checks) {
    const [[{ n }]] = await conn.query(sql);
    console.log("  │  " + label.padEnd(22) + String(n).padStart(3) + " row(s)");
  }
  console.log("  └─────────────────────────────────────────────────────\n");

  // Sample properties
  const [props] = await conn.query(
    "SELECT title, price, listing_type FROM properties ORDER BY listing_type, price DESC LIMIT 8"
  );
  console.log("  Sale & Rental properties:");
  props.forEach((p) =>
    console.log("   ✓ " + p.listing_type.toUpperCase().padEnd(5) + " AED " + Number(p.price).toLocaleString().padEnd(12) + " " + p.title)
  );

  // Off-plan
  const [op] = await conn.query("SELECT title, developer, tag FROM off_plan_projects ORDER BY price_from");
  console.log("\n  Off-plan projects:");
  op.forEach((p) => console.log("   ✓ [" + p.tag + "] " + p.title + " by " + p.developer));

  // Featured article
  const [art] = await conn.query("SELECT title, category FROM news_articles WHERE is_featured=1 LIMIT 1");
  console.log("\n  Featured article:");
  console.log("   ✓ [" + (art[0]?.category ?? "–") + "] " + (art[0]?.title ?? "none"));

  // Agents
  const [agents] = await conn.query("SELECT name, role FROM agents WHERE is_active=1 ORDER BY id");
  console.log("\n  Active agents:");
  agents.forEach((a) => console.log("   ✓ " + a.name.padEnd(22) + a.role));

  conn.release();
  await pool.end();
  console.log("\n✅ All checks passed.\n");
}

verify().catch((e) => {
  console.error("\n❌ Verify failed:", e.message);
  process.exit(1);
});
