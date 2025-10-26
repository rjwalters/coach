-- Migration: Add completed_at column to todos table
-- This allows tracking when todos are completed for productivity stats

-- Add completed_at column (NULL = not completed, INTEGER = completion timestamp)
ALTER TABLE todos ADD COLUMN completed_at INTEGER;

-- Add index for efficient stats queries
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);
