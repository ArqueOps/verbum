-- ============================================================================
-- Verbum — Row Level Security Policies
-- ============================================================================
-- This migration enables RLS on ALL public tables and creates granular
-- access policies. It is idempotent: uses DROP POLICY IF EXISTS before
-- CREATE POLICY, so it can be re-run safely.
--
-- Access model:
--   - service_role bypasses RLS by default (Supabase built-in)
--   - anon/authenticated access governed by policies below
--   - auth.uid() used for all user identification
--
-- Table categories:
--   1. Profiles        — read all, write own
--   2. Bible content   — public read, no user writes
--   3. Studies          — owner CRUD + public read (is_public)
--   4. Study sections  — follows parent study ownership
--   5. Bookmarks/History — user CRUD own only
--   6. Plans           — public read, no user writes
--   7. Subscriptions   — user read own only
--   8. Payments        — user read own only
-- ============================================================================


-- ============================================================================
-- 1. PROFILES
-- ============================================================================
-- Users can read all profiles (for displaying author names, avatars, etc.)
-- but can only modify their own profile row (id = auth.uid()).
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());


-- ============================================================================
-- 2. BIBLE CONTENT TABLES (read-only for all, writes via service_role only)
-- ============================================================================
-- Bible data is reference content managed by the backend. Both anonymous
-- and authenticated users can read. No user-facing writes.
-- service_role bypasses RLS automatically for backend seeding/updates.
-- ============================================================================

-- ---- bible_versions ----

ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bible_versions_select" ON bible_versions;
CREATE POLICY "bible_versions_select" ON bible_versions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---- bible_books ----

ALTER TABLE bible_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bible_books_select" ON bible_books;
CREATE POLICY "bible_books_select" ON bible_books
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---- bible_chapters ----

ALTER TABLE bible_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bible_chapters_select" ON bible_chapters;
CREATE POLICY "bible_chapters_select" ON bible_chapters
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---- bible_verses ----

ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bible_verses_select" ON bible_verses;
CREATE POLICY "bible_verses_select" ON bible_verses
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================================
-- 3. STUDIES
-- ============================================================================
-- Owner (user_id = auth.uid()) has full CRUD.
-- Other authenticated users can SELECT only public studies (is_public = true).
-- Anonymous users can also read public studies (for sharing/SEO).
-- ============================================================================

ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studies_select_own" ON studies;
CREATE POLICY "studies_select_own" ON studies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_public = true
  );

DROP POLICY IF EXISTS "studies_select_anon" ON studies;
CREATE POLICY "studies_select_anon" ON studies
  FOR SELECT
  TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "studies_insert" ON studies;
CREATE POLICY "studies_insert" ON studies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "studies_update" ON studies;
CREATE POLICY "studies_update" ON studies
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "studies_delete" ON studies;
CREATE POLICY "studies_delete" ON studies
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 4. STUDY SECTIONS
-- ============================================================================
-- Permissions follow the parent study via JOIN.
-- Owner of the parent study has full CRUD on its sections.
-- Other users can SELECT sections only if the parent study is public.
-- Anonymous users can read sections of public studies.
-- ============================================================================

ALTER TABLE study_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_sections_select" ON study_sections;
CREATE POLICY "study_sections_select" ON study_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND (studies.user_id = auth.uid() OR studies.is_public = true)
    )
  );

DROP POLICY IF EXISTS "study_sections_select_anon" ON study_sections;
CREATE POLICY "study_sections_select_anon" ON study_sections
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND studies.is_public = true
    )
  );

DROP POLICY IF EXISTS "study_sections_insert" ON study_sections;
CREATE POLICY "study_sections_insert" ON study_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND studies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "study_sections_update" ON study_sections;
CREATE POLICY "study_sections_update" ON study_sections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND studies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND studies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "study_sections_delete" ON study_sections;
CREATE POLICY "study_sections_delete" ON study_sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_sections.study_id
        AND studies.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 5. STUDY BOOKMARKS
-- ============================================================================
-- Users can only access their own bookmarks (user_id = auth.uid()).
-- Full CRUD for own rows only.
-- ============================================================================

ALTER TABLE study_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_bookmarks_select" ON study_bookmarks;
CREATE POLICY "study_bookmarks_select" ON study_bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "study_bookmarks_insert" ON study_bookmarks;
CREATE POLICY "study_bookmarks_insert" ON study_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "study_bookmarks_update" ON study_bookmarks;
CREATE POLICY "study_bookmarks_update" ON study_bookmarks
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "study_bookmarks_delete" ON study_bookmarks;
CREATE POLICY "study_bookmarks_delete" ON study_bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 6. STUDY HISTORY
-- ============================================================================
-- Users can only access their own history (user_id = auth.uid()).
-- Full CRUD for own rows only.
-- ============================================================================

ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_history_select" ON study_history;
CREATE POLICY "study_history_select" ON study_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "study_history_insert" ON study_history;
CREATE POLICY "study_history_insert" ON study_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "study_history_update" ON study_history;
CREATE POLICY "study_history_update" ON study_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "study_history_delete" ON study_history;
CREATE POLICY "study_history_delete" ON study_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 7. PLANS
-- ============================================================================
-- Plans are public reference data (subscription tiers).
-- Both anonymous and authenticated users can read.
-- Writes are restricted to service_role (backend admin operations).
-- ============================================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================================
-- 8. SUBSCRIPTIONS
-- ============================================================================
-- Users can only read their own subscription record.
-- All writes (create, update, cancel) are managed by the backend via
-- service_role to ensure payment integrity.
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 9. PAYMENTS
-- ============================================================================
-- Users can only read their own payment records.
-- All writes are managed by the backend via service_role to ensure
-- financial data integrity and prevent tampering.
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
