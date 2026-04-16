-- Migration: 20260416202400_add_view_count_to_studies.sql
-- Description: Adds view_count column to studies table for tracking study views
-- Rollback: ALTER TABLE studies DROP COLUMN IF EXISTS view_count;

ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
