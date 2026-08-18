-- ============================================================
-- V3__fix_seed_password_hashes.sql
--
-- The hash shipped in V2 was labelled as BCrypt for "password123" but does not
-- verify against it (BCryptPasswordEncoder#matches returns false), so all three
-- seeded accounts were unusable and every login returned 401.
--
-- This is a forward fix rather than an edit to V2 on purpose: Flyway stores a
-- checksum of each applied migration, so changing V2 in place would fail
-- validation on any database that already ran it.
--
-- The hash below was generated with the same BCryptPasswordEncoder the
-- application uses, and verifies against "password123".
-- Dev credentials only — these accounts must not exist in a deployed database.
-- ============================================================

UPDATE users
SET password_hash = '$2a$10$du1PtHydCRCxioGHsYiZO.sN/2k3QQ6ymipvrptk0T4950Vz.lp.m'
WHERE email IN ('admin@dms.local', 'advisor@dms.local', 'tech@dms.local');
