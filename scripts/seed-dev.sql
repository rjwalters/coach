-- Seed data for development (test users)
-- Note: These are test passphrases - the actual user IDs are derived from the passphrase

-- Test user 1: passphrase "testuser1"
-- User ID: deterministically generated from passphrase
INSERT OR IGNORE INTO users (id, created_at, last_login)
VALUES ('test-user-1-id-placeholder', 1700000000000, 1700000000000);

-- Note: Actual todos would be encrypted on the client side
-- This is just to show the structure
