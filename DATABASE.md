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

## Tables

### webhook_events
- **Purpose**: Idempotency guard and audit log for payment provider webhooks (Caramelou relaying Stripe).
- **Columns**: `id` (UUID PK), `event_id` (TEXT UNIQUE — provider event id), `event_type` (TEXT), `user_id` (UUID FK → `profiles.id`, nullable, `ON DELETE SET NULL`), `payload` (JSONB), `processed_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
- **Indexes**: UNIQUE on `event_id` (auto-created, powers O(1) idempotency lookup); partial index on `user_id WHERE user_id IS NOT NULL` for audit queries.
- **RLS**: Enabled with **no policies** — only `service_role` (which bypasses RLS) may read/write. `anon` and `authenticated` are denied by default.

## Migration History

| Migration | Description |
|-----------|-------------|
| 00002_triggers_and_functions.sql | Trigger functions and triggers for profiles, studies, subscriptions |
| 20260416160000_create_webhook_events.sql | Create `webhook_events` table for webhook idempotency and audit (Caramelou/Stripe) |
| 20260416170000_create_subscriptions_and_webhook_events.sql | Create `subscriptions` table (mirrors Caramelou state) and `webhook_events` (idempotent) |
| 20260416180000_add_admin_moderation_and_subscription_management.sql | Add `studies.unpublish_reason`, `profiles.is_active`, subscription lifecycle columns, and `subscription_admin_actions` audit table |

### subscription_admin_actions
- **Purpose**: Audit log for admin grant/revoke/extend actions on subscriptions.
- **Columns**: `id` (UUID PK), `subscription_id` (UUID FK → `subscriptions.id`, nullable, `ON DELETE SET NULL`), `user_id` (UUID FK → `auth.users.id`, `ON DELETE CASCADE`), `action_type` (TEXT CHECK `grant`/`revoke`/`extend`), `plan_interval` (TEXT CHECK `monthly`/`annual`), `period_months` (INTEGER), `extend_days` (INTEGER), `reason` (TEXT), `performed_by` (UUID FK → `auth.users.id`, `ON DELETE CASCADE`), `created_at` (TIMESTAMPTZ).
- **Indexes**: `idx_subscription_admin_actions_user_id`, `idx_subscription_admin_actions_subscription_id`.
- **RLS**: Enabled. SELECT restricted to users with `profiles.role = 'admin'`. Writes via `service_role` only (bypasses RLS).
