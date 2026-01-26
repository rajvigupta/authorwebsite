-- ============================================================================
-- MEMORYCRAVER - Schema Updates
-- ============================================================================
-- Run AFTER initial schema is created
-- ============================================================================

-- Add is_free column to chapters
ALTER TABLE chapters 
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Set existing free chapters (price = 0) to is_free = true
UPDATE chapters SET is_free = true WHERE price = 0;

-- Make description nullable for chapters
ALTER TABLE chapters 
  ALTER COLUMN description DROP NOT NULL;