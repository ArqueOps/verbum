-- Migration: 00002_triggers_and_functions.sql
-- Description: Creates PostgreSQL triggers and functions for Verbum:
--   1) handle_new_user() — auto-creates profile on auth.users INSERT
--   2) update_updated_at() — generic updated_at trigger for all relevant tables
--   3) increment_study_count() — increments profile.study_count on study INSERT
--   4) update_subscription_status() — checks subscription expiry and updates status
-- Rollback: DROP TRIGGER/FUNCTION statements at the bottom of this file (commented)

-- =============================================================================
-- 1) handle_new_user()
--    Fires on auth.users INSERT. Creates a corresponding row in public.profiles.
--    Uses SECURITY DEFINER to access auth schema from public schema context.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users (requires SECURITY DEFINER on the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 2) update_updated_at()
--    Generic trigger function that sets updated_at = NOW() on every UPDATE.
--    Applied to all tables that have an updated_at column.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at column.
-- Using DROP IF EXISTS + CREATE ensures idempotency.

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.studies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.studies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.study_notes;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.reading_plans;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.reading_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.reading_plan_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.reading_plan_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- =============================================================================
-- 3) increment_study_count()
--    Fires on public.studies INSERT. Increments the study_count column
--    on the corresponding user's profile row.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_study_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET study_count = COALESCE(study_count, 0) + 1,
      updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_study_created ON public.studies;
CREATE TRIGGER on_study_created
  AFTER INSERT ON public.studies
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_study_count();


-- =============================================================================
-- 4) update_subscription_status()
--    Callable function that checks subscription expiry and updates status.
--    Designed to be called by a cron job or edge function periodically.
--    Updates 'active' subscriptions whose current_period_end has passed to 'expired'.
--    Updates 'expired' subscriptions whose current_period_end is in the future to 'active'.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_subscription_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER := 0;
  expired_count INTEGER;
  reactivated_count INTEGER;
BEGIN
  -- Expire active subscriptions past their period end
  UPDATE public.subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND current_period_end < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Reactivate expired subscriptions that have been renewed
  UPDATE public.subscriptions
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'expired'
    AND current_period_end >= NOW();

  GET DIAGNOSTICS reactivated_count = ROW_COUNT;

  affected_rows := expired_count + reactivated_count;

  RETURN affected_rows;
END;
$$;


-- =============================================================================
-- ROLLBACK (run manually if needed)
-- =============================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.studies;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.study_notes;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.reading_plans;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.reading_plan_progress;
-- DROP FUNCTION IF EXISTS public.update_updated_at();
-- DROP TRIGGER IF EXISTS on_study_created ON public.studies;
-- DROP FUNCTION IF EXISTS public.increment_study_count();
-- DROP FUNCTION IF EXISTS public.update_subscription_status();
