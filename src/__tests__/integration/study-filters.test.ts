/**
 * Integration tests for /meus-estudos study filter queries.
 *
 * Tests verify that Supabase queries correctly filter studies:
 *   1. Favorites filter — returns only bookmarked studies
 *   2. Book filter — returns studies matching a specific book name
 *   3. Date range filter — returns studies within created_at bounds
 *   4. Combined filters — AND logic across all filters
 *   5. Empty results — no matches returns empty array
 *
 * NOTE: The page code (page.tsx) references columns owner_id, slug,
 * verse_reference, model_used — but the live DB schema uses user_id,
 * book, chapter, verse_start, verse_end. These tests verify filter
 * logic against the ACTUAL database schema.
 *
 * Uses real Supabase instance with service role for data seeding.
 * All test data is cleaned up after the suite.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const ANON_KEY = process.env.CRED_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAuthClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ---------------------------------------------------------------------------
// Test user management
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  client: SupabaseClient;
}

async function createTestUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string
): Promise<TestUser> {
  const { data: adminData, error: adminError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (adminError)
    throw new Error(`Failed to create test user ${email}: ${adminError.message}`);

  const userId = adminData.user.id;

  const tempClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } =
    await tempClient.auth.signInWithPassword({ email, password });

  if (signInError)
    throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);

  return {
    id: userId,
    email,
    accessToken: signInData.session!.access_token,
    client: createAuthClient(signInData.session!.access_token),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Study Filters Integration Tests", () => {
  let serviceClient: SupabaseClient;
  let user: TestUser;

  const uniqueSuffix = Date.now();
  const studyIds: string[] = [];
  const bookmarkIds: string[] = [];

  let genesisStudy1Id: string;
  let genesisStudy2Id: string;
  let exodusStudy1Id: string;
  let exodusStudy2Id: string;

  beforeAll(async () => {
    serviceClient = createServiceClient();

    user = await createTestUser(
      serviceClient,
      `study-filters-${uniqueSuffix}@test.verbum.app`,
      "TestPassword789!"
    );

    // Seed 4 studies with different books and dates
    const studies = [
      {
        user_id: user.id,
        title: `Filter Test Genesis 1 - ${uniqueSuffix}`,
        content: "Study about Genesis chapter 1.",
        book: "Genesis",
        chapter: 1,
        verse_start: 1,
        verse_end: 3,
        is_public: false,
        created_at: "2026-01-15T10:00:00Z",
      },
      {
        user_id: user.id,
        title: `Filter Test Genesis 3 - ${uniqueSuffix}`,
        content: "Study about Genesis chapter 3.",
        book: "Genesis",
        chapter: 3,
        verse_start: 1,
        verse_end: 5,
        is_public: false,
        created_at: "2026-02-10T14:00:00Z",
      },
      {
        user_id: user.id,
        title: `Filter Test Exodus 12 - ${uniqueSuffix}`,
        content: "Study about Exodus chapter 12.",
        book: "Exodus",
        chapter: 12,
        verse_start: 1,
        verse_end: 14,
        is_public: false,
        created_at: "2026-03-05T08:00:00Z",
      },
      {
        user_id: user.id,
        title: `Filter Test Exodus 20 - ${uniqueSuffix}`,
        content: "Study about Exodus chapter 20.",
        book: "Exodus",
        chapter: 20,
        verse_start: 1,
        verse_end: 17,
        is_public: false,
        created_at: "2026-04-01T16:00:00Z",
      },
    ];

    const { data: insertedStudies, error: insertError } = await serviceClient
      .from("studies")
      .insert(studies)
      .select("id, title, book, created_at");

    if (insertError)
      throw new Error(`Failed to seed studies: ${insertError.message}`);

    for (const s of insertedStudies!) {
      studyIds.push(s.id);
    }

    genesisStudy1Id = insertedStudies![0]!.id;
    genesisStudy2Id = insertedStudies![1]!.id;
    exodusStudy1Id = insertedStudies![2]!.id;
    exodusStudy2Id = insertedStudies![3]!.id;

    // Bookmark only genesis study 1 and exodus study 1
    const bookmarks = [
      { user_id: user.id, study_id: genesisStudy1Id },
      { user_id: user.id, study_id: exodusStudy1Id },
    ];

    const { data: insertedBookmarks, error: bmError } = await serviceClient
      .from("study_bookmarks")
      .insert(bookmarks)
      .select("id");

    if (bmError)
      throw new Error(`Failed to seed bookmarks: ${bmError.message}`);

    for (const bm of insertedBookmarks!) {
      bookmarkIds.push(bm.id);
    }
  });

  afterAll(async () => {
    for (const bmId of bookmarkIds) {
      await serviceClient.from("study_bookmarks").delete().eq("id", bmId);
    }
    for (const sId of studyIds) {
      await serviceClient.from("studies").delete().eq("id", sId);
    }
    await serviceClient.from("profiles").delete().eq("id", user.id);
    await serviceClient.auth.admin.deleteUser(user.id);
  });

  // =========================================================================
  // Helper: mirrors the page filter logic adapted to actual DB schema
  // =========================================================================

  async function queryStudies(opts: {
    favoritosOnly?: boolean;
    bookName?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  }) {
    const supabase = user.client;

    let query = supabase
      .from("studies")
      .select("id, title, book, chapter, verse_start, verse_end, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (opts.favoritosOnly) {
      const { data: bookmarkRows } = await supabase
        .from("study_bookmarks")
        .select("study_id")
        .eq("user_id", user.id);

      const ids = bookmarkRows?.map((b: { study_id: string }) => b.study_id) ?? [];
      query = query.in("id", ids.length > 0 ? ids : ["__none__"]);
    }

    if (opts.bookName) {
      query = query.eq("book", opts.bookName);
    }
    if (opts.dateFrom) {
      query = query.gte("created_at", `${opts.dateFrom}T00:00:00`);
    }
    if (opts.dateTo) {
      query = query.lte("created_at", `${opts.dateTo}T23:59:59`);
    }

    const { data, error } = await query;
    return { data, error };
  }

  // =========================================================================
  // 1. Favorites filter
  // =========================================================================

  describe("Favorites filter", () => {
    it("should return only bookmarked studies when favoritos=true", async () => {
      const { data, error } = await queryStudies({ favoritosOnly: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(genesisStudy1Id);
      expect(returnedIds).toContain(exodusStudy1Id);
      expect(returnedIds).not.toContain(genesisStudy2Id);
      expect(returnedIds).not.toContain(exodusStudy2Id);
    });

    it("should return all user studies when favoritos is not set", async () => {
      const { data, error } = await queryStudies({});

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(4);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(genesisStudy1Id);
      expect(returnedIds).toContain(genesisStudy2Id);
      expect(returnedIds).toContain(exodusStudy1Id);
      expect(returnedIds).toContain(exodusStudy2Id);
    });
  });

  // =========================================================================
  // 2. Book filter
  // =========================================================================

  describe("Book filter", () => {
    it("should return studies matching selected book", async () => {
      const { data, error } = await queryStudies({ bookName: "Genesis" });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(genesisStudy1Id);
      expect(returnedIds).toContain(genesisStudy2Id);
      expect(returnedIds).not.toContain(exodusStudy1Id);
      expect(returnedIds).not.toContain(exodusStudy2Id);
    });

    it("should return studies matching second book", async () => {
      const { data, error } = await queryStudies({ bookName: "Exodus" });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(exodusStudy1Id);
      expect(returnedIds).toContain(exodusStudy2Id);
    });
  });

  // =========================================================================
  // 3. Date range filter
  // =========================================================================

  describe("Date range filter", () => {
    it("should return studies within date range", async () => {
      const { data, error } = await queryStudies({
        dateFrom: "2026-02-01",
        dateTo: "2026-03-31",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(genesisStudy2Id);
      expect(returnedIds).toContain(exodusStudy1Id);
      expect(returnedIds).not.toContain(genesisStudy1Id);
      expect(returnedIds).not.toContain(exodusStudy2Id);
    });

    it("should return studies from dateFrom onwards when only dateFrom set", async () => {
      const { data, error } = await queryStudies({
        dateFrom: "2026-03-01",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(exodusStudy1Id);
      expect(returnedIds).toContain(exodusStudy2Id);
    });

    it("should return studies up to dateTo when only dateTo set", async () => {
      const { data, error } = await queryStudies({
        dateTo: "2026-02-28",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      const returnedIds = data!.map((s: { id: string }) => s.id);
      expect(returnedIds).toContain(genesisStudy1Id);
      expect(returnedIds).toContain(genesisStudy2Id);
    });
  });

  // =========================================================================
  // 4. Combined filters (AND logic)
  // =========================================================================

  describe("Combined filters (AND logic)", () => {
    it("should apply favorites + book filter together", async () => {
      const { data, error } = await queryStudies({
        favoritosOnly: true,
        bookName: "Genesis",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // Only genesisStudy1Id is both bookmarked AND Genesis
      expect(data!.length).toBe(1);
      expect(data![0]!.id).toBe(genesisStudy1Id);
    });

    it("should apply favorites + date range filter together", async () => {
      const { data, error } = await queryStudies({
        favoritosOnly: true,
        dateFrom: "2026-02-01",
        dateTo: "2026-04-30",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // exodusStudy1Id (2026-03-05) is bookmarked and in range
      // genesisStudy1Id (2026-01-15) is bookmarked but NOT in range
      expect(data!.length).toBe(1);
      expect(data![0]!.id).toBe(exodusStudy1Id);
    });

    it("should apply book + date range filter together", async () => {
      const { data, error } = await queryStudies({
        bookName: "Exodus",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // exodusStudy1Id (Exodus, 2026-03-05) matches both
      // exodusStudy2Id (Exodus, 2026-04-01) matches book but NOT date range
      expect(data!.length).toBe(1);
      expect(data![0]!.id).toBe(exodusStudy1Id);
    });

    it("should apply all three filters together", async () => {
      const { data, error } = await queryStudies({
        favoritosOnly: true,
        bookName: "Exodus",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // exodusStudy1Id is bookmarked + Exodus + in date range
      expect(data!.length).toBe(1);
      expect(data![0]!.id).toBe(exodusStudy1Id);
    });
  });

  // =========================================================================
  // 5. Empty results
  // =========================================================================

  describe("Empty results", () => {
    it("should return empty array when no studies match book filter", async () => {
      const { data, error } = await queryStudies({ bookName: "Revelation" });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(0);
    });

    it("should return empty array when date range excludes all studies", async () => {
      const { data, error } = await queryStudies({
        dateFrom: "2020-01-01",
        dateTo: "2020-12-31",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(0);
    });

    it("should return empty array when combined filters yield no intersection", async () => {
      // Favorites + Exodus + date range excluding bookmarked Exodus study
      const { data, error } = await queryStudies({
        favoritosOnly: true,
        bookName: "Exodus",
        dateFrom: "2026-04-01",
        dateTo: "2026-12-31",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // exodusStudy2Id is Exodus + in date range but NOT bookmarked
      // exodusStudy1Id is Exodus + bookmarked but NOT in date range
      expect(data!.length).toBe(0);
    });
  });
});
