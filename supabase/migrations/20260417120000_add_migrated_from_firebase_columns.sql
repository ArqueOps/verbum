-- Migration: 20260417120000_add_migrated_from_firebase_columns.sql
-- Description: Adds migrated_from_firebase boolean column to studies and study_sections tables
-- Rollback: ALTER TABLE study_sections DROP COLUMN IF EXISTS migrated_from_firebase;
--           ALTER TABLE studies DROP COLUMN IF EXISTS migrated_from_firebase;

-- Up

ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS migrated_from_firebase BOOLEAN DEFAULT false;

ALTER TABLE study_sections
  ADD COLUMN IF NOT EXISTS migrated_from_firebase BOOLEAN DEFAULT false;
