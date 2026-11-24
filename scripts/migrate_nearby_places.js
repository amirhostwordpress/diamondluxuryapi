/**
 * Migration: add nearby_places JSON column to properties table.
 * Run once:  node scripts/migrate_nearby_places.js
 */
"use strict";

require("dotenv").config();
const mysql = require("mysql2/promise");

const SQL = `
  ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS nearby_places JSON DEFAULT NULL
      COMMENT '[{cat, icon, name, dist}] — nearby facilities for the property detail page';
`;

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("▶  Connecting to", process.env.DB_HOST, "/", process.env.DB_NAME);
    await conn.execute(SQL);
    console.log("✅  nearby_places column added (or already existed).");

    // Verify
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'nearby_places'`,
      [process.env.DB_NAME]
    );
    if (rows.length) {
      const col = rows[0];
      console.log(`\n   Column verified:`);
      console.log(`   • Name     : ${col.COLUMN_NAME}`);
      console.log(`   • Type     : ${col.COLUMN_TYPE}`);
      console.log(`   • Nullable : ${col.IS_NULLABLE}`);
      console.log(`   • Comment  : ${col.COLUMN_COMMENT}`);
    }
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error("❌  Migration failed:", err.message);
  process.exit(1);
});
