// Seed all default site settings (idempotent). Run anytime:
//   npx tsx scripts/seed-settings.ts
import "dotenv/config";
import mysql from "mysql2/promise";
import { dbConfig } from "../src/config";

// [key, value, section]
const DEFAULTS: [string, string, string][] = [
  // ── home ──
  ["hero_eyebrow", "FIND YOUR VILLA", "home"],
  ["hero_title", "Search Among 300+ Exclusive Villas", "home"],
  ["hero_subtitle", "Filter by type, location, developer or budget — and discover your perfect villa in Dubai.", "home"],
  ["stats_villas", "300+", "home"],
  ["stats_villas_label", "Luxury Villas", "home"],
  ["stats_clients", "1000+", "home"],
  ["stats_clients_label", "Happy Clients", "home"],
  ["stats_years", "10+", "home"],
  ["stats_years_label", "Years Experience", "home"],
  ["stats_support", "50+", "home"],
  ["stats_support_label", "Exclusive Developers", "home"],
  // ── contact ──
  ["contact_phone", "+971 56 396 4810", "contact"],
  ["contact_phone_2", "+971 55 896 2985", "contact"],
  ["contact_email", "info@diamondluxuryrealestate.ae", "contact"],
  ["contact_address", "27th Floor, Office: 2705 / 10 Marina Plaza, Dubai Marina.", "contact"],
  ["contact_hours", "Mon – Sat: 9:00 am – 7:00 pm", "contact"],
  ["contact_hero_eyebrow", "WE'D LOVE TO HEAR FROM YOU", "contact"],
  ["contact_hero_title", "Contact Us", "contact"],
  ["contact_hero_subtitle", "Whether you're buying, selling, renting or investing — our team is ready to help.", "contact"],
  // ── social ──
  ["social_facebook", "https://www.facebook.com/share/p/1EqxQytivk/", "social"],
  ["social_instagram", "https://www.instagram.com/p/DfUebNpu_T8/", "social"],
  ["social_linkedin", "https://lnkd.in/p/ddXRTszT", "social"],
  // ── about ──
  ["about_hero_eyebrow", "DIAMOND LUXURY REAL ESTATE", "about"],
  ["about_hero_title", "About Us", "about"],
  ["about_hero_subtitle", "Your gateway to exceptional living — Dubai's trusted luxury property specialists in apartments, villas, penthouses and premium investments.", "about"],
  ["about_intro_eyebrow", "WHO WE ARE", "about"],
  ["about_intro_title", "Real Estate Experts You Can Trust", "about"],
  ["about_intro_p1", "At Diamond Luxury Real Estate, we believe that finding the perfect property is more than just buying a home — it's about embracing a lifestyle of elegance, comfort, and excellence.", "about"],
  ["about_intro_p2", "Specialising in Dubai's prestigious real estate market, we offer an exclusive portfolio of luxury apartments, villas, penthouses, and premium investment properties. Our dedicated team understands your aspirations and carefully selects properties that match your lifestyle, preferences, and investment goals.", "about"],
  // ── buy ──
  ["buy_hero_eyebrow", "OWNERSHIP IN DUBAI", "buy"],
  ["buy_hero_title", "Buy a Villa", "buy"],
  ["buy_hero_subtitle", "Explore 300+ handpicked luxury villas across Dubai's most exclusive communities.", "buy"],
  // ── rent ──
  ["rent_hero_eyebrow", "ELEVATED LIVING IN DUBAI", "rent"],
  ["rent_hero_title", "Rent a Villa", "rent"],
  ["rent_hero_subtitle", "Exclusive villa rentals across Dubai's most sought-after communities — short or long term.", "rent"],
  // ── off-plan ──
  ["offplan_hero_eyebrow", "INVEST BEFORE IT'S BUILT", "offplan"],
  ["offplan_hero_title", "Off-Plan Villas", "offplan"],
  ["offplan_hero_subtitle", "Exclusive early access to Dubai's most anticipated developments — launch prices, flexible plans.", "offplan"],
  // ── sell ──
  ["sell_hero_eyebrow", "SELL WITH CONFIDENCE", "sell"],
  ["sell_hero_title", "Sell Your Villa", "sell"],
  ["sell_hero_subtitle", "Achieve the best price for your Dubai villa with Diamond's white-glove selling service.", "sell"],
];

async function run() {
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      setting_key  VARCHAR(100) NOT NULL UNIQUE,
      value        LONGTEXT,
      section      VARCHAR(80)  NOT NULL DEFAULT 'general',
      updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_section (section)
    ) ENGINE=InnoDB;
  `);

  let n = 0;
  for (const [key, value, section] of DEFAULTS) {
    // INSERT IGNORE: never overwrites an existing value (incl. admin edits).
    await conn.query(
      `INSERT IGNORE INTO site_settings (setting_key, value, section)
       VALUES (?, ?, ?)`,
      [key, value, section]
    );
    n++;
  }

  console.log(`✓ Seeded/verified ${n} site settings.`);
  await conn.end();
}

run().catch((e) => {
  console.error("seed-settings failed:", e);
  process.exit(1);
});
