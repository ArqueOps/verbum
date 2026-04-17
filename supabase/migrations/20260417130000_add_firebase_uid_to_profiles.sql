-- Migration: 20260417130000_add_firebase_uid_to_profiles.sql
-- Description: Adds firebase_uid column to profiles for Firebase Auth → Supabase Auth migration traceability.
--   Required by the Firestore data migration script to map Firebase UIDs to Supabase UUIDs.
-- Rollback: ALTER TABLE profiles DROP COLUMN IF EXISTS firebase_uid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid
  ON public.profiles (firebase_uid)
  WHERE firebase_uid IS NOT NULL;
