-- Migration: 20260417130001_add_migrated_from_firebase_to_studies.sql
-- Description: Adds migrated_from_firebase boolean to studies table for tracking
--   which records were imported from Firestore vs created natively in Supabase.
-- Rollback:
--   DROP INDEX IF EXISTS idx_studies_migrated_firebase;
--   ALTER TABLE studies DROP COLUMN IF EXISTS migrated_from_firebase;

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS migrated_from_firebase BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_studies_migrated_firebase
  ON public.studies (migrated_from_firebase)
  WHERE migrated_from_firebase = true;
