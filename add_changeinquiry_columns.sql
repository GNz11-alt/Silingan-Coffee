-- Add requesttype and preferreddate columns to changeinquiry table
ALTER TABLE changeinquiry
  ADD COLUMN IF NOT EXISTS requesttype TEXT DEFAULT 'Shift Change',
  ADD COLUMN IF NOT EXISTS preferreddate DATE;
