-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Adds missing archival tracking columns

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS "ArchivedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "ArchivedBy" text;

ALTER TABLE schedule
  ADD COLUMN IF NOT EXISTS "ArchivedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "ArchivedBy" text;
