-- ─────────────────────────────────────────────────────────────────────────────
-- Diamond Luxury Real Estate — MySQL Schema
-- Run once against your database:
--   mysql -u <user> -p <database> < schema.sql
-- The database name itself is taken from your backend .env (DB_NAME).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Admin users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(80)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default admin — password: Admin@1234
-- Generate a real bcrypt hash and replace the placeholder before first login:
--   node -e "const b=require('bcryptjs');console.log(b.hashSync('Admin@1234',12))"
INSERT IGNORE INTO admin_users (username, email, password_hash)
VALUES (
  'admin',
  'admin@diamondluxury.ae',
  '$2a$12$placeholderHashReplaceWithRealBcryptHashOfYourPassword'
);

-- ── Agents / Team ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  role       VARCHAR(120) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  phone      VARCHAR(50)  NOT NULL DEFAULT '',
  bio        TEXT,
  image_url  VARCHAR(500),
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO agents (name, role, email, phone, bio, image_url) VALUES
  ('Sarah Jones',  'Senior Consultant',      'sarah@diamondluxury.ae',  '+971501234567', '10+ years placing discerning clients in Dubai''s most sought-after addresses.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'),
  ('Ahmed Hassan', 'Luxury Specialist',      'ahmed@diamondluxury.ae',  '+971502345678', 'Expert in ultra-prime villas across Palm Jumeirah and Emirates Hills.',          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'),
  ('Nadia Petrov', 'Ultra-Prime Specialist', 'nadia@diamondluxury.ae',  '+971503456789', 'Fluent in six languages, serving a global HNWI client base since 2015.',         'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80'),
  ('Omar Khalil',  'Senior Advisor',         'omar@diamondluxury.ae',   '+971504567890', 'Specialises in off-plan investments and developer negotiations.',                 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'),
  ('Layla Al Mansoori', 'Property Consultant', 'layla@diamondluxury.ae','+971505678901', 'Expert in waterfront properties and Palm Jebel Ali developments.',               'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80'),
  ('Fatima Raza',  'Property Advisor',       'fatima@diamondluxury.ae', '+971506789012', 'Specialist in family villas across Al Barari and Dubai Hills Estate.',            'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=400&q=80'),
  ('Rami Yousef',  'Villa Specialist',       'rami@diamondluxury.ae',   '+971507890123', 'Expert in lagoon communities and Tilal Al Ghaf developments.',                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'),
  ('Hana Svensson','Villa Expert',           'hana@diamondluxury.ae',   '+971508901234', 'Luxury villa specialist with expertise in Dubai Hills Estate and golf communities.','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80');

-- ── Properties ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  title           VARCHAR(255) NOT NULL,
  sub_title       VARCHAR(255) NOT NULL DEFAULT '',  -- project/building name shown below main title
  ref             VARCHAR(80)  NOT NULL DEFAULT '',  -- internal reference, e.g. DLR-2024-1001
  listing_type    ENUM('sale','rent','off-plan') NOT NULL DEFAULT 'sale',
  status          ENUM('active','sold','rented','draft') NOT NULL DEFAULT 'active',
  -- Pricing
  price           DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_sqft      DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_note      VARCHAR(255) NOT NULL DEFAULT '',  -- e.g. "No Commission · Motivated Seller"
  -- Specs
  sqft            INT UNSIGNED  NOT NULL DEFAULT 0,
  beds            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  baths           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  parking         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  property_type   VARCHAR(80)  NOT NULL DEFAULT '',  -- Apartment | Villa | Penthouse | etc.
  furnishing      VARCHAR(80)  NOT NULL DEFAULT '',  -- Fully Furnished | Semi Furnished | Unfurnished
  floor           VARCHAR(80)  NOT NULL DEFAULT '',  -- e.g. "Floor 12" or "Ground + 2"
  view            VARCHAR(255) NOT NULL DEFAULT '',  -- e.g. "Beachfront / Sea View"
  -- Location
  highlights      VARCHAR(500) NOT NULL DEFAULT '',  -- one-liner used in listing cards
  location        VARCHAR(255) NOT NULL DEFAULT '',
  unit_detail     VARCHAR(255) NOT NULL DEFAULT '',  -- e.g. "Floor 12, Unit 4B"
  community       VARCHAR(255) NOT NULL DEFAULT '',
  developer       VARCHAR(255),
  completion_date VARCHAR(50),
  -- Rich content (JSON arrays)
  description     LONGTEXT,
  highlights_list JSON,         -- ["bullet 1", "bullet 2", ...]
  project_description JSON,     -- ["paragraph 1", "paragraph 2", ...]
  amenities       JSON,         -- [{icon, label}, ...]
  -- Map
  map_src         VARCHAR(1000) NOT NULL DEFAULT '', -- Google Maps embed src URL
  map_label       VARCHAR(255)  NOT NULL DEFAULT '', -- pin overlay label text
  -- Media
  images          JSON,         -- ["https://cdn.../img1.jpg", ...]
  brochure_url    VARCHAR(500),
  video_url       VARCHAR(500),
  agent_id        INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_listing_type (listing_type),
  INDEX idx_status       (status),
  INDEX idx_community    (community),
  INDEX idx_beds         (beds),
  INDEX idx_price        (price)
) ENGINE=InnoDB;

-- ── Migration: add extended property columns if they don't exist yet ──────────
-- Safe to run on an existing DB; ADD COLUMN IF NOT EXISTS skips if already present.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sub_title          VARCHAR(255)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ref                VARCHAR(80)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_sqft         DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_note         VARCHAR(255)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS property_type      VARCHAR(80)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS furnishing         VARCHAR(80)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor              VARCHAR(80)   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS view               VARCHAR(255)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_detail        VARCHAR(255)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS highlights_list    JSON          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_description JSON         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amenities          JSON          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS map_src            VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS map_label          VARCHAR(255)  NOT NULL DEFAULT '';

-- ── Enquiries ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(50),
  interest    ENUM('buy','rent','sell','offplan','other') NOT NULL DEFAULT 'other',
  budget      VARCHAR(50),
  message     TEXT,
  property_id INT UNSIGNED,
  status      ENUM('new','contacted','closed') NOT NULL DEFAULT 'new',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  INDEX idx_status     (status),
  INDEX idx_interest   (interest),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ── Newsletter subscribers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ── News / Blog articles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_articles (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  title        VARCHAR(500) NOT NULL,
  excerpt      TEXT         NOT NULL,
  body         LONGTEXT,
  category     ENUM(
    'Market Report','Market Insights','New Developments',
    'Investment','Buyer''s Guide','Lifestyle','Legal & Visa','Area Focus'
  ) NOT NULL DEFAULT 'Market Insights',
  image_url    VARCHAR(500),
  read_time    VARCHAR(30),
  is_featured  TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category    (category),
  INDEX idx_is_featured (is_featured),
  INDEX idx_published   (published_at)
) ENGINE=InnoDB;

-- ── Off-plan projects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS off_plan_projects (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(255) NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  developer     VARCHAR(255) NOT NULL,
  location      VARCHAR(255) NOT NULL,
  community     VARCHAR(255),
  completion    VARCHAR(50)  NOT NULL,
  price_from    DECIMAL(15,2) NOT NULL DEFAULT 0,
  beds          VARCHAR(50)  NOT NULL DEFAULT '',
  image_url     VARCHAR(500),
  brochure_url  VARCHAR(500),
  tag           ENUM('NEW LAUNCH','SELLING FAST','EXCLUSIVE','LIMITED UNITS','COMING SOON') NOT NULL DEFAULT 'NEW LAUNCH',
  description   LONGTEXT,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Extended detail-page fields (added v2)
  property_type        VARCHAR(255),          -- e.g. "Apartments & Townhouses"
  payment_booking      TINYINT UNSIGNED NOT NULL DEFAULT 10,   -- % on booking
  payment_construction TINYINT UNSIGNED NOT NULL DEFAULT 70,   -- % during construction
  payment_handover     TINYINT UNSIGNED NOT NULL DEFAULT 20,   -- % on handover
  amenities            JSON,    -- [{icon, label}, ...]
  floor_plans          JSON,    -- [{type, sqft, image_url}, ...]
  gallery_images       JSON,    -- [url, url, ...]   (additional images beyond image_url)
  nearby_places        JSON,    -- [{icon, label, time}, ...]
  INDEX idx_developer (developer),
  INDEX idx_active    (is_active)
) ENGINE=InnoDB;

-- ── Migration: add extended off-plan columns if they don't exist yet ──────────
-- Safe to run on an existing DB; ALTER IGNORE skips if column already present.
ALTER TABLE off_plan_projects
  ADD COLUMN IF NOT EXISTS property_type        VARCHAR(255)      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_booking      TINYINT UNSIGNED  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS payment_construction TINYINT UNSIGNED  NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS payment_handover     TINYINT UNSIGNED  NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS amenities            JSON              DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS floor_plans          JSON              DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gallery_images       JSON              DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nearby_places        JSON              DEFAULT NULL;

-- ── Developer Partners ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS developers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  logo_url      VARCHAR(500) NOT NULL DEFAULT '',
  website_url   VARCHAR(500) NOT NULL DEFAULT '',
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB;

INSERT IGNORE INTO developers (name, logo_url, website_url, display_order) VALUES
  ('EMAAR Properties',     '/emaar.png',              'https://www.emaar.com',          1),
  ('DAMAC Properties',     '/damac.webp',             'https://www.damacproperties.com', 2),
  ('Nakheel',              '/nakheel.webp',           'https://www.nakheel.com',         3),
  ('Meraas',               '/meraas.png',             'https://www.meraas.com',          4),
  ('Sobha Realty',         '/sobha.png',              'https://www.sobharealty.com',     5),
  ('Meydan Group',         '/meydan.png',             'https://www.meydan.ae',           6),
  ('Ellington Properties', '/ellington.png',          'https://www.ellingtonproperties.com', 7),
  ('Danube Properties',    '/danube properties.png',  'https://www.danubeproperties.com', 8),
  ('Dubai Holdings',       '/dubai holdings.png',     'https://www.dubaiholdings.com',   9),
  ('Dubai South',          '/dubai south.png',        'https://www.dubaisouth.ae',       10),
  ('NSHAMA',               '/nshma.png',              'https://www.nshama.ae',           11),
  ('Select Group',         '/select group.png',       'https://www.selectgroup.ae',      12),
  ('Shapoorji Pallonji',   '/shapoorji.png',          'https://www.shapoorjipallonji.ae', 13);

-- ── File uploads (audit log for FTP uploads) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_files (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(500) NOT NULL,
  stored_name   VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(120) NOT NULL,
  size_bytes    INT UNSIGNED NOT NULL DEFAULT 0,
  ftp_path      VARCHAR(1000) NOT NULL,
  public_url    VARCHAR(1000) NOT NULL,
  entity_type   VARCHAR(80),   -- e.g. 'property', 'agent', 'news', 'off-plan'
  entity_id     INT UNSIGNED,
  uploaded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ── Site settings (CMS) ───────────────────────────────────────────────────────
-- Key/value store so the admin dashboard can manage site-wide content
-- (hero copy, contact details, social links, stats, etc.).
CREATE TABLE IF NOT EXISTS site_settings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key  VARCHAR(100) NOT NULL UNIQUE,
  value        LONGTEXT,
  section      VARCHAR(80)  NOT NULL DEFAULT 'general',
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section (section)
) ENGINE=InnoDB;

-- Default site content (managed from Admin → Site Settings).
-- Seeded to match the site's current copy so nothing changes until an admin edits.
INSERT IGNORE INTO site_settings (setting_key, value, section) VALUES
  ('hero_eyebrow',          'FIND YOUR VILLA', 'home'),
  ('hero_title',            'Search Among 300+ Exclusive Villas', 'home'),
  ('hero_subtitle',         'Filter by type, location, developer or budget — and discover your perfect villa in Dubai.', 'home'),
  ('stats_villas',          '300+', 'home'),
  ('stats_villas_label',    'Luxury Villas', 'home'),
  ('stats_clients',         '1000+', 'home'),
  ('stats_clients_label',   'Happy Clients', 'home'),
  ('stats_years',           '10+', 'home'),
  ('stats_years_label',     'Years Experience', 'home'),
  ('stats_support',         '50+', 'home'),
  ('stats_support_label',   'Exclusive Developers', 'home'),
  ('contact_phone',         '+971 56 396 4810', 'contact'),
  ('contact_phone_2',       '+971 55 896 2985', 'contact'),
  ('contact_email',         'info@diamondluxuryrealestate.ae', 'contact'),
  ('contact_address',       '27th Floor, Office: 2705 / 10 Marina Plaza, Dubai Marina.', 'contact'),
  ('social_facebook',       'https://www.facebook.com/share/p/1EqxQytivk/', 'social'),
  ('social_instagram',      'https://www.instagram.com/p/DfUebNpu_T8/', 'social'),
  ('social_x',              'https://x.com', 'social'),
  ('social_linkedin',       'https://lnkd.in/p/ddXRTszT', 'social');

-- Page heroes + about intro + contact hours (added so every page is admin-managed)
INSERT IGNORE INTO site_settings (setting_key, value, section) VALUES
  ('contact_hours',         'Mon – Sat: 9:00 am – 7:00 pm', 'contact'),
  ('contact_hero_eyebrow',  'WE''D LOVE TO HEAR FROM YOU', 'contact'),
  ('contact_hero_title',    'Contact Us', 'contact'),
  ('contact_hero_subtitle', 'Whether you''re buying, selling, renting or investing — our team is ready to help.', 'contact'),
  ('about_hero_eyebrow',    'DIAMOND LUXURY REAL ESTATE', 'about'),
  ('about_hero_title',      'About Us', 'about'),
  ('about_hero_subtitle',   'Your gateway to exceptional living — Dubai''s trusted luxury property specialists in apartments, villas, penthouses and premium investments.', 'about'),
  ('about_intro_eyebrow',   'WHO WE ARE', 'about'),
  ('about_intro_title',     'Real Estate Experts You Can Trust', 'about'),
  ('about_intro_p1',        'At Diamond Luxury Real Estate, we believe that finding the perfect property is more than just buying a home — it''s about embracing a lifestyle of elegance, comfort, and excellence.', 'about'),
  ('about_intro_p2',        'Specialising in Dubai''s prestigious real estate market, we offer an exclusive portfolio of luxury apartments, villas, penthouses, and premium investment properties. Our dedicated team understands your aspirations and carefully selects properties that match your lifestyle, preferences, and investment goals.', 'about'),
  ('buy_hero_eyebrow',      'OWNERSHIP IN DUBAI', 'buy'),
  ('buy_hero_title',        'Buy a Villa', 'buy'),
  ('buy_hero_subtitle',     'Explore 300+ handpicked luxury villas across Dubai''s most exclusive communities.', 'buy'),
  ('rent_hero_eyebrow',     'ELEVATED LIVING IN DUBAI', 'rent'),
  ('rent_hero_title',       'Rent a Villa', 'rent'),
  ('rent_hero_subtitle',    'Exclusive villa rentals across Dubai''s most sought-after communities — short or long term.', 'rent'),
  ('offplan_hero_eyebrow',  'INVEST BEFORE IT''S BUILT', 'offplan'),
  ('offplan_hero_title',    'Off-Plan Villas', 'offplan'),
  ('offplan_hero_subtitle', 'Exclusive early access to Dubai''s most anticipated developments — launch prices, flexible plans.', 'offplan'),
  ('sell_hero_eyebrow',     'SELL WITH CONFIDENCE', 'sell'),
  ('sell_hero_title',       'Sell Your Villa', 'sell'),
  ('sell_hero_subtitle',    'Achieve the best price for your Dubai villa with Diamond''s white-glove selling service.', 'sell');
