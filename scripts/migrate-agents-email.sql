-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: drop the UNIQUE constraint on agents.email
--
-- Run once against the live database:
--   mysql -h srv629.hstgr.io -u u184056080_diamonduser -p u184056080_diamondluxury \
--     < scripts/migrate-agents-email.sql
--
-- MySQL named the auto-generated unique key "email" by convention.
-- The ALTER TABLE below drops it; the column itself is kept as NOT NULL.
-- If the key was given a different name on your server, run this first to find it:
--   SHOW INDEX FROM agents WHERE Column_name = 'email';
-- Then replace 'email' in the DROP INDEX line with the actual Key_name.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE agents DROP INDEX email;
