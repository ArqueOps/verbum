-- Migration: 20260415000000_fix_handle_new_user_trigger.sql
-- Description: Fixes handle_new_user() trigger that was incorrectly redefined in
--   00002_triggers_and_functions.sql to insert into non-existent columns (email, full_name).
--   The profiles table only has: id, display_name, avatar_url, role, preferred_version,
--   created_at, updated_at. This migration drops and recreates the function with correct
--   column mapping.
-- Rollback: Re-apply 00002_triggers_and_functions.sql handle_new_user() definition

-- Drop existing function to ensure clean state
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate with correct column mapping matching profiles table schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger (CASCADE above drops it, so we need to recreate)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
