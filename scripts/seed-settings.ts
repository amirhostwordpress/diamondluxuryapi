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
  // ── home — featured properties section ──
  ["featured_eyebrow", "FEATURED VILLAS", "home"],
  ["featured_title", "Discover Our Handpicked Luxury Villas", "home"],
  ["featured_subtitle", "Explore our exclusive collection of high-value villas and private estates across Dubai's most prestigious communities.", "home"],
  ["featured_btn", "View All Villas", "home"],
  // ── home — expert / about section ──
  ["expert_eyebrow", "YOUR GATEWAY TO EXCEPTIONAL LIVING", "home"],
  ["expert_title", "Real Estate Experts You Can Trust", "home"],
  ["expert_body1", "At Diamond Luxury Real Estate, we believe that finding the perfect property is more than just buying a home — it's about embracing a lifestyle of elegance, comfort, and excellence.", "home"],
  ["expert_body2", "Specialising in Dubai's prestigious real estate market, we offer an exclusive portfolio of luxury apartments, villas, penthouses, and premium investment properties. We guide you through every step with professionalism, transparency, and personalised service.", "home"],
  ["expert_stat1_val", "300+", "home"],
  ["expert_stat1_label", "Luxury Villas in Portfolio", "home"],
  ["expert_stat2_val", "30+", "home"],
  ["expert_stat2_label", "Languages Supported", "home"],
  ["expert_stat3_val", "50+", "home"],
  ["expert_stat3_label", "Specialist Professionals", "home"],
  ["expert_btn", "Enquire Now", "home"],
  // ── home — lifestyle section ──
  ["lifestyle_eyebrow", "FIND YOUR WAY OF LIVING", "home"],
  ["lifestyle_title", "Choose A Lifestyle That Suits Your Style", "home"],
  ["lifestyle_subtitle", "Explore a variety of living experiences that Dubai offers.", "home"],
  // ── home — areas section ──
  ["areas_eyebrow", "EXPLORE THE CITY", "home"],
  ["areas_title", "Discover Dubai's Diverse Real Estate Across Various Areas", "home"],
  ["areas_subtitle", "From skyscrapers to waterfront communities, find your perfect neighbourhood.", "home"],
  // ── home — buy/rent split ──
  ["buy_card_title", "BUY", "home"],
  ["buy_card_body", "Own your dream villa in Dubai's most iconic locations.", "home"],
  ["rent_card_title", "RENT", "home"],
  ["rent_card_body", "Discover exclusive villa rentals for elevated living.", "home"],
  // ── home — blog section ──
  ["blog_eyebrow", "INSIGHTS & INSPIRATION", "home"],
  ["blog_title", "Latest From Our Blog", "home"],
  ["blog_subtitle", "Stay updated with the latest news, insights and trends in Dubai real estate.", "home"],
  ["blog_btn", "View All Blog Posts", "home"],
  // ── footer ──
  ["footer_tagline", "Your gateway to exceptional living. Specialising in Dubai's prestigious real estate market — luxury apartments, villas, penthouses and premium investment properties.", "footer"],
  ["footer_copyright", "© 2026 Diamond Luxury Real Estate. All rights reserved.", "footer"],
  ["footer_explore_title", "Explore", "footer"],
  ["footer_links_title", "Quick Links", "footer"],
  ["footer_contact_title", "Contact Us", "footer"],
  ["footer_cta_btn", "Speak to an advisor", "footer"],
  // ── contact — form & offices ──
  ["contact_form_eyebrow", "SEND US A MESSAGE", "contact"],
  ["contact_form_title", "Get in Touch", "contact"],
  ["contact_offices_eyebrow", "OUR OFFICES", "contact"],
  ["contact_offices_title", "Find Us", "contact"],
  ["contact_office1_name", "Dubai Marina HQ", "contact"],
  ["contact_office1_address", "27th Floor, Office: 2705 / 10 Marina Plaza,\nDubai Marina.", "contact"],
  ["contact_office2_name", "Downtown Dubai", "contact"],
  ["contact_office2_address", "Level 14, Boulevard Plaza Tower 1,\nDowntown Dubai, Dubai", "contact"],
  // ── about — CTA ──
  ["about_cta_eyebrow", "READY TO BEGIN?", "about"],
  ["about_cta_title", "Start Your Property Journey", "about"],
  ["about_cta_body", "Whether you are looking for your dream home, a profitable investment, or an exceptional property in Dubai — we guide you through every step with professionalism, transparency, and personalised service.", "about"],
  // ── company profile ──
  ["company_hero_eyebrow", "WHO WE ARE", "company"],
  ["company_hero_title", "Company Profile", "company"],
  ["company_hero_subtitle", "The story, the numbers, and the values behind Diamond Luxury Real Estate.", "company"],
  ["company_stat1_val", "300+", "company"],
  ["company_stat1_label", "Luxury Villas in Portfolio", "company"],
  ["company_stat2_val", "30+", "company"],
  ["company_stat2_label", "Languages Supported", "company"],
  ["company_stat3_val", "50+", "company"],
  ["company_stat3_label", "Specialist Professionals", "company"],
  ["company_values_eyebrow", "WHAT DRIVES US", "company"],
  ["company_values_title", "Our Core Values", "company"],
  ["company_values_subtitle", "The principles that guide every client relationship and every transaction.", "company"],
  ["company_cta_eyebrow", "WANT TO KNOW MORE?", "company"],
  ["company_cta_title", "Meet Our Team", "company"],
  ["company_cta_body", "Get to know the experienced professionals behind Diamond Luxury Real Estate, each bringing deep expertise and a passion for exceptional service.", "company"],
  // ── mission & vision ──
  ["mission_hero_eyebrow", "OUR PURPOSE", "mission"],
  ["mission_hero_title", "Mission & Vision", "mission"],
  ["mission_hero_subtitle", "The purpose and ambition that drive everything we do at Diamond Luxury Real Estate.", "mission"],
  ["mission_section_eyebrow", "WHAT WE STAND FOR", "mission"],
  ["mission_section_title", "Purpose That Drives Excellence", "mission"],
  ["mission_section_subtitle", "Every decision we make is guided by a clear mission and a bold vision for the future.", "mission"],
  ["mission_card_title", "Our Mission", "mission"],
  ["mission_card_body", "To establish ourselves as a trusted name in Dubai's luxury property market and become a recognised leader on the global real estate stage. We are committed to delivering exceptional service, offering exclusive property opportunities, and setting the highest standards of professionalism, integrity, and customer satisfaction.", "mission"],
  ["vision_card_title", "Our Vision", "mission"],
  ["vision_card_body", "To redefine luxury living in Dubai by turning our clients' dreams and aspirations into reality. We strive to connect people with exceptional properties that reflect elegance, sophistication, and timeless value. Through innovation, trust, and personalised service, we aim to create extraordinary real estate experiences.", "mission"],
  ["mission_values_eyebrow", "WHAT DRIVES US", "mission"],
  ["mission_values_title", "Our Core Values", "mission"],
  ["mission_values_subtitle", "The principles that guide every client relationship and every transaction.", "mission"],
  ["mission_cta_eyebrow", "READY TO BEGIN?", "mission"],
  ["mission_cta_title", "Start Your Property Journey", "mission"],
  ["mission_cta_body", "Whether you are looking for your dream home, a profitable investment, or an exceptional property in Dubai — we guide you through every step with professionalism and care.", "mission"],
  // ── our team ──
  ["team_hero_eyebrow", "MEET THE TEAM", "team"],
  ["team_hero_title", "Our Team", "team"],
  ["team_hero_subtitle", "Experienced real estate professionals with multilingual expertise and a passion for delivering exceptional results.", "team"],
  ["team_section_eyebrow", "MEET THE TEAM", "team"],
  ["team_section_title", "The People Behind Diamond", "team"],
  ["team_section_subtitle", "Experienced real estate professionals with in-depth knowledge of Dubai's dynamic property market — multilingual expertise covering over 30 languages.", "team"],
  ["team_cta_eyebrow", "READY TO BEGIN?", "team"],
  ["team_cta_title", "Start Your Property Journey", "team"],
  ["team_cta_body", "Whether you are looking for your dream home, a profitable investment, or an exceptional property in Dubai — we guide you through every step with professionalism, transparency, and personalised service.", "team"],
  // ── buy — inner sections ──
  ["buy_search_eyebrow", "FIND YOUR VILLA", "buy"],
  ["buy_search_title", "Search Among 300+ Exclusive Villas", "buy"],
  ["buy_search_subtitle", "Filter by type, location, developer or budget — and discover your perfect villa.", "buy"],
  ["buy_listings_eyebrow", "FOR SALE", "buy"],
  ["buy_listings_title", "Villas Available to Buy", "buy"],
  ["buy_listings_subtitle", "Curated selection of Dubai's finest villas — ready to move in or invest.", "buy"],
  ["buy_perks_eyebrow", "WHY CHOOSE US", "buy"],
  ["buy_perks_title", "The Diamond Buying Experience", "buy"],
  ["buy_perks_subtitle", "We take the complexity out of buying and put the focus on you.", "buy"],
  ["buy_cta_eyebrow", "START YOUR SEARCH", "buy"],
  ["buy_cta_title", "Ready to Own in Dubai?", "buy"],
  ["buy_cta_body", "Speak with one of our villa specialists today — no obligation, just expert advice.", "buy"],
  // ── rent — inner sections ──
  ["rent_search_eyebrow", "FIND YOUR RENTAL", "rent"],
  ["rent_search_title", "Search Premium Rental Villas", "rent"],
  ["rent_search_subtitle", "Filter by community, bedrooms or budget to find your perfect rental.", "rent"],
  ["rent_listings_eyebrow", "AVAILABLE TO RENT", "rent"],
  ["rent_listings_title", "Luxury Villas for Rent", "rent"],
  ["rent_listings_subtitle", "Handpicked rentals across Palm Jumeirah, Emirates Hills, District One and beyond.", "rent"],
  ["rent_perks_eyebrow", "THE DIAMOND DIFFERENCE", "rent"],
  ["rent_perks_title", "Why Rent Through Us", "rent"],
  ["rent_perks_subtitle", "We handle the details so you can focus on enjoying your new home.", "rent"],
  ["rent_cta_eyebrow", "MOVE IN TODAY", "rent"],
  ["rent_cta_title", "Find Your Dream Rental Villa", "rent"],
  ["rent_cta_body", "Our team is ready to match you with the perfect home at the right price.", "rent"],
  // ── sell — inner sections ──
  ["sell_intro_eyebrow", "YOUR PROPERTY PARTNER", "sell"],
  ["sell_intro_title", "Sell Smarter with Diamond", "sell"],
  ["sell_intro_body1", "Selling a luxury villa in Dubai demands more than a listing on a portal. It requires the right audience, the right presentation and the right timing.", "sell"],
  ["sell_intro_body2", "Our team has facilitated hundreds of ultra-prime transactions — and we know what moves the needle when it comes to Dubai's most discerning buyers.", "sell"],
  ["sell_intro_btn", "Request a Free Valuation", "sell"],
  ["sell_process_eyebrow", "HOW IT WORKS", "sell"],
  ["sell_process_title", "Our Selling Process", "sell"],
  ["sell_process_subtitle", "A clear, guided path from first call to final handover.", "sell"],
  ["sell_reasons_eyebrow", "THE DIAMOND ADVANTAGE", "sell"],
  ["sell_reasons_title", "Why Sellers Choose Diamond", "sell"],
  ["sell_reasons_subtitle", "Everything we do is designed to maximise your return.", "sell"],
  ["sell_cta_eyebrow", "LET'S GET STARTED", "sell"],
  ["sell_cta_title", "Ready to List Your Villa?", "sell"],
  ["sell_cta_body", "Get a free, no-obligation valuation from our luxury property specialists.", "sell"],
  // ── off-plan — inner sections ──
  ["offplan_benefits_eyebrow", "WHY OFF-PLAN?", "offplan"],
  ["offplan_benefits_title", "The Smart Way to Invest in Dubai", "offplan"],
  ["offplan_benefits_subtitle", "Off-plan properties offer investors a unique combination of value, flexibility and upside potential.", "offplan"],
  ["offplan_projects_eyebrow", "FEATURED DEVELOPMENTS", "offplan"],
  ["offplan_projects_title", "New Off-Plan Launches", "offplan"],
  ["offplan_projects_subtitle", "Handpicked projects from Dubai's most trusted developers — available for pre-registration now.", "offplan"],
  ["offplan_cta_eyebrow", "GET EARLY ACCESS", "offplan"],
  ["offplan_cta_title", "Register for Exclusive Off-Plan Launches", "offplan"],
  ["offplan_cta_body", "Be first in line for the best units and pre-launch pricing on Dubai's newest developments.", "offplan"],
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
