-- Migration: Add encrypted_secret_note column to users table
-- Date: 2025-10-26

ALTER TABLE users ADD COLUMN encrypted_secret_note TEXT;
