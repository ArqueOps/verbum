-- Migration: 20260417120000_add_firebase_uid_to_profiles.sql
-- Description: Adds firebase_uid column to profiles for Firebase Auth → Supabase Auth migration traceability
-- Rollback: ALTER TABLE profiles DROP COLUMN IF EXISTS firebase_uid;

-- Up
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid
  ON profiles (firebase_uid)
  WHERE firebase_uid IS NOT NULL;
