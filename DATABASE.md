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

### search_published_studies(query, testament, book_id)
- **Type**: RPC function (SQL, STABLE)
- **Parameters**: `query text DEFAULT NULL`, `testament text DEFAULT NULL` ('old'/'new'), `book_id uuid DEFAULT NULL`
- **Returns**: TABLE (id, title, slug, verse_reference, published_at, book_name, book_abbreviation, book_testament)
- **Behavior**: Full-text search on published studies using Portuguese tsvector on `title + content`. Parses `verse_reference` (first word = abbreviation) to join `bible_books` for testament/book filtering. All filters are optional and combinable. Only returns `is_published = true` studies.
- **Indexes**: `idx_studies_fts` GIN index on generated `fts` tsvector column.
- **Grants**: `authenticated`, `anon`.

## Migration History

| Migration | Description |
|-----------|-------------|
| 00002_triggers_and_functions.sql | Trigger functions and triggers for profiles, studies, subscriptions |
| 20260416000000_search_published_studies.sql | Add tsvector column, GIN index, and search_published_studies RPC function |
