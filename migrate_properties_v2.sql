-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: properties table — v2
-- Adds all fields required by the property detail page that were missing from
-- the original schema.
--
-- Safe to run on an existing database:  every statement uses IF NOT EXISTS /
-- column-existence guards so re-running this file is idempotent.
--
-- Run:
--   mysql -u <user> -p <database> < migrate_properties_v2.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Core identity ─────────────────────────────────────────────────────────

-- sub_title: project / building name shown below the main title on the detail page
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sub_title VARCHAR(255) NOT NULL DEFAULT ''
  AFTER title;

-- ref: internal reference number shown in the status badge row (e.g. DLR-2024-1001)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS ref VARCHAR(80) NOT NULL DEFAULT ''
  AFTER sub_title;

-- ── 2. Pricing extras ────────────────────────────────────────────────────────

-- price_note: short marketing note shown under the price (e.g. "No Commission · Motivated Seller")
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS price_note VARCHAR(255) NOT NULL DEFAULT ''
  AFTER price_sqft;

-- ── 3. Property spec fields ──────────────────────────────────────────────────

-- property_type: Apartment | Villa | Penthouse | Townhouse | Duplex | etc.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(80) NOT NULL DEFAULT ''
  AFTER parking;

-- furnishing: Fully Furnished | Semi Furnished | Unfurnished
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS furnishing VARCHAR(80) NOT NULL DEFAULT ''
  AFTER property_type;

-- floor: e.g. "Floor 12" or "Ground + 2"
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS floor VARCHAR(80) NOT NULL DEFAULT ''
  AFTER furnishing;

-- view: e.g. "Beachfront / Sea View"
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS view VARCHAR(120) NOT NULL DEFAULT ''
  AFTER floor;

-- ── 4. Location extras ───────────────────────────────────────────────────────

-- unit_detail: granular unit info shown below the title (e.g. "Floor 12, Unit 4B")
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS unit_detail VARCHAR(255) NOT NULL DEFAULT ''
  AFTER location;

-- ── 5. Rich content — JSON arrays ────────────────────────────────────────────

-- highlights_list: bullet points rendered in the "Key Property Highlights" <ul>
-- Format: JSON array of strings, e.g. ["Private beach access", "Infinity pool"]
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS highlights_list JSON
  AFTER description;

-- project_description: paragraphs rendered in the "About the Project" block
-- Format: JSON array of strings (one element = one paragraph)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS project_description JSON
  AFTER highlights_list;

-- amenities: rendered in the "What It Has" amenities grids
-- Format: JSON array of objects, e.g. [{"icon":"pool","label":"Swimming Pool"}]
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS amenities JSON
  AFTER project_description;

-- ── 6. Map ───────────────────────────────────────────────────────────────────

-- map_src: Google Maps embed src URL used in the <iframe> on the detail page
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS map_src VARCHAR(1000)
  AFTER amenities;

-- map_label: text shown as the pin overlay label on the map
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS map_label VARCHAR(255)
  AFTER map_src;

-- ── 7. New index ─────────────────────────────────────────────────────────────

-- Index property_type for future filtering (buy page / search panel)
ALTER TABLE properties
  ADD INDEX IF NOT EXISTS idx_property_type (property_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification: list all columns in the updated table so you can confirm the
-- migration ran correctly.  Comment out if running non-interactively.
-- ─────────────────────────────────────────────────────────────────────────────
SHOW COLUMNS FROM properties;
