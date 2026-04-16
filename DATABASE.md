# Verbum — Database Documentation

## Triggers and Functions

### handle_new_user()
- **Type**: Trigger function (SECURITY DEFINER)
- **Fires on**: `auth.users` AFTER INSERT
- **Trigger name**: `on_auth_user_created`
- **Behavior**: Creates a `public.profiles` row with `id`, `email`, `full_name`, and `avatar_url` extracted from the new auth user's metadata. Uses `ON CONFLICT (id) DO NOTHING` for safety.
- **Security**: `SECURITY DEFINER` with `SET search_path = public` to safely access `auth.users` from public schema context.

### update_updated_at()
- **Type**: Generic trigger function
- **Fires on**: BEFORE UPDATE on any table it's attached to
- **Trigger name**: `set_updated_at` (on each table)
- **Applied to**: `profiles`, `studies`, `subscriptions`, `study_notes`, `reading_plans`, `reading_plan_progress`
- **Behavior**: Sets `NEW.updated_at = NOW()` on every row update.

### increment_study_count()
- **Type**: Trigger function
- **Fires on**: `public.studies` AFTER INSERT
- **Trigger name**: `on_study_created`
- **Behavior**: Increments `study_count` on the user's `profiles` row by 1. Uses `COALESCE(study_count, 0) + 1` for NULL safety.

### update_subscription_status()
- **Type**: Callable function (SECURITY DEFINER)
- **Returns**: `INTEGER` (number of affected rows)
- **Behavior**: Checks all subscriptions — expires active ones past `current_period_end`, reactivates expired ones with renewed `current_period_end`. Designed to be called by a cron job or edge function.
- **Security**: `SECURITY DEFINER` with `SET search_path = public`.

### consume_credit_and_save_study(p_user_id, p_slug, p_title, p_verse_reference, p_content, p_model_used, ...)
- **Type**: RPC function (SECURITY DEFINER)
- **Returns**: `JSONB` (study record + credits_remaining)
- **Behavior**: Atomic credit consumption + study creation. Checks user_credits for active subscription — if active and not expired, skips credit decrement. Otherwise decrements credits_remaining by 1 (raises `NO_CREDITS` exception if 0). Inserts study row, inserts all sections from JSONB array, returns study_id + credits_remaining.
- **Security**: `SECURITY DEFINER` with `SET search_path = public`. Row locked with `FOR UPDATE` for atomicity.

### check_user_credits(p_user_id)
- **Type**: RPC function (SECURITY DEFINER)
- **Returns**: `JSONB` (credits_remaining, has_active_subscription, subscription_end)
- **Behavior**: Returns credit and subscription status for a given user. Returns defaults (0 credits, no subscription) if no user_credits row exists.
- **Security**: `SECURITY DEFINER` with `SET search_path = public`.

## Migration History

| Migration | Description |
|-----------|-------------|
| 00002_triggers_and_functions.sql | Trigger functions and triggers for profiles, studies, subscriptions |
| 20260415200000_study_sections_user_credits_alter_studies.sql | ALTER studies (add book_id, chapter, verse_start/end, version_id, generation_time_ms; content TEXT→JSONB; language default→pt-BR). ALTER study_sections (section_type enum→TEXT CHECK 7 new types, content→JSONB, display_order→order_index, UNIQUE constraint). CREATE user_credits table. CREATE consume_credit_and_save_study and check_user_credits RPCs. DROP decrement_credits_on_study trigger. |
