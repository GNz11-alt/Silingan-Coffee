-- Add coverage period columns to the report table
-- Run this in Supabase SQL Editor

ALTER TABLE report
  ADD COLUMN IF NOT EXISTS date_from date,
  ADD COLUMN IF NOT EXISTS date_to date;
