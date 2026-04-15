/**
 * Integration tests for Verbum RLS (Row Level Security) policies.
 *
 * Tests verify that Supabase RLS policies correctly enforce access control:
 *   1. Bible content — public read, no user writes
 *   2. Studies — owner CRUD, public read for is_public=true, private hidden
 *   3. Subscriptions — user read own only
 *   4. Payments — user read own only
 *   5. Study bookmarks — user CRUD own only
 *
 * Uses real Supabase instance with test users created via Auth Admin API.
 * All test data is cleaned up after each suite.
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

/** Service role client — bypasses RLS. Used for setup/teardown. */
function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anonymous client — uses anon key without any auth session. */
function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Authenticated client — impersonates a specific user via their access token. */
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

const testUserIds: string[] = [];

async function createTestUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string
): Promise<TestUser> {
  // Create user via admin API
  const { data: adminData, error: adminError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (adminError) throw new Error(`Failed to create test user ${email}: ${adminError.message}`);

  const userId = adminData.user.id;
  testUserIds.push(userId);

  // Sign in to get access token
  const tempClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } =
    await tempClient.auth.signInWithPassword({ email, password });

  if (signInError) throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);

  const accessToken = signInData.session!.access_token;

  return {
    id: userId,
    email,
    accessToken,
    client: createAuthClient(accessToken),
  };
}

async function cleanupTestUsers(serviceClient: SupabaseClient): Promise<void> {
  for (const userId of testUserIds) {
    // Clean up user-owned data first (service role bypasses RLS)
    await serviceClient.from("study_bookmarks").delete().eq("user_id", userId);
    await serviceClient.from("studies").delete().eq("user_id", userId);
    await serviceClient.from("payments").delete().eq("user_id", userId);
    await serviceClient.from("subscriptions").delete().eq("user_id", userId);
    await serviceClient.from("profiles").delete().eq("id", userId);

    // Delete auth user
    await serviceClient.auth.admin.deleteUser(userId);
  }
  testUserIds.length = 0;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("RLS Policies Integration Tests", () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    serviceClient = createServiceClient();
    anonClient = createAnonClient();

    userA = await createTestUser(
      serviceClient,
      `rls-test-user-a-${uniqueSuffix}@test.verbum.app`,
      "TestPassword123!"
    );

    userB = await createTestUser(
      serviceClient,
      `rls-test-user-b-${uniqueSuffix}@test.verbum.app`,
      "TestPassword456!"
    );
  });

  afterAll(async () => {
    await cleanupTestUsers(serviceClient);
  });

  // =========================================================================
  // 1. Bible content — public read, no user writes
  // =========================================================================

  describe("Bible content (bible_verses)", () => {
    it("should allow anon users to SELECT from bible_verses", async () => {
      const { data, error } = await anonClient
        .from("bible_verses")
        .select("*")
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // The table exists and is queryable — may have 0 rows if not seeded,
      // but the query itself must not be rejected by RLS.
      expect(Array.isArray(data)).toBe(true);
    });

    it("should allow authenticated users to SELECT from bible_verses", async () => {
      const { data, error } = await userA.client
        .from("bible_verses")
        .select("*")
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should NOT allow anon users to INSERT into bible_verses", async () => {
      const { error } = await anonClient.from("bible_verses").insert({
        book: "Genesis",
        chapter: 1,
        verse_number: 1,
        text: "RLS test — should be rejected",
        version: "TEST",
      });

      expect(error).not.toBeNull();
      // RLS rejection returns a 403 or a policy violation error
      expect(error!.code).toBeTruthy();
    });

    it("should NOT allow authenticated users to INSERT into bible_verses", async () => {
      const { error } = await userA.client.from("bible_verses").insert({
        book: "Genesis",
        chapter: 1,
        verse_number: 1,
        text: "RLS test — should be rejected",
        version: "TEST",
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. Studies — owner CRUD, visibility based on is_public
  // =========================================================================

  describe("Studies", () => {
    let privateStudyId: string;
    let publicStudyId: string;

    afterAll(async () => {
      // Cleanup studies created in this suite
      if (privateStudyId) {
        await serviceClient.from("studies").delete().eq("id", privateStudyId);
      }
      if (publicStudyId) {
        await serviceClient.from("studies").delete().eq("id", publicStudyId);
      }
    });

    it("should allow authenticated user to INSERT a study", async () => {
      const { data, error } = await userA.client
        .from("studies")
        .insert({
          user_id: userA.id,
          title: "RLS Test Private Study",
          content: "This is a private study for RLS testing.",
          book: "John",
          chapter: 3,
          verse_start: 16,
          verse_end: 16,
          is_public: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBeTruthy();
      expect(data!.title).toBe("RLS Test Private Study");
      privateStudyId = data!.id;
    });

    it("should allow authenticated user to SELECT their own study", async () => {
      const { data, error } = await userA.client
        .from("studies")
        .select("*")
        .eq("id", privateStudyId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(privateStudyId);
      expect(data!.user_id).toBe(userA.id);
    });

    it("should NOT allow user B to SELECT user A's private study", async () => {
      const { data, error } = await userB.client
        .from("studies")
        .select("*")
        .eq("id", privateStudyId)
        .maybeSingle();

      // RLS filters the row out — returns null/empty, not an error
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should allow user to INSERT a public study", async () => {
      const { data, error } = await userA.client
        .from("studies")
        .insert({
          user_id: userA.id,
          title: "RLS Test Public Study",
          content: "This is a public study for RLS testing.",
          book: "Psalms",
          chapter: 23,
          verse_start: 1,
          verse_end: 6,
          is_public: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      publicStudyId = data!.id;
    });

    it("should allow user B to SELECT user A's public study", async () => {
      const { data, error } = await userB.client
        .from("studies")
        .select("*")
        .eq("id", publicStudyId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(publicStudyId);
      expect(data!.is_public).toBe(true);
    });

    it("should allow anon user to SELECT public studies", async () => {
      const { data, error } = await anonClient
        .from("studies")
        .select("*")
        .eq("id", publicStudyId)
        .maybeSingle();

      // Anon policy exists for public studies
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(publicStudyId);
    });

    it("should NOT allow anon user to SELECT private studies", async () => {
      const { data, error } = await anonClient
        .from("studies")
        .select("*")
        .eq("id", privateStudyId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should NOT allow user B to UPDATE user A's study", async () => {
      const { error } = await userB.client
        .from("studies")
        .update({ title: "Hijacked Title" })
        .eq("id", publicStudyId);

      // RLS prevents update — either error or 0 rows affected
      // Supabase returns no error but the row is not matched by the USING clause
      const { data: check } = await userA.client
        .from("studies")
        .select("title")
        .eq("id", publicStudyId)
        .single();

      expect(check!.title).toBe("RLS Test Public Study");
    });

    it("should NOT allow user B to DELETE user A's study", async () => {
      const { error } = await userB.client
        .from("studies")
        .delete()
        .eq("id", publicStudyId);

      // Verify it still exists
      const { data: check } = await serviceClient
        .from("studies")
        .select("id")
        .eq("id", publicStudyId)
        .single();

      expect(check).not.toBeNull();
    });

    it("should NOT allow user to INSERT a study for another user", async () => {
      const { error } = await userB.client.from("studies").insert({
        user_id: userA.id, // Trying to impersonate user A
        title: "Impersonation Study",
        content: "Should be rejected by RLS.",
        book: "Genesis",
        chapter: 1,
        verse_start: 1,
        verse_end: 1,
        is_public: false,
      });

      expect(error).not.toBeNull();
    });
  });

  // =========================================================================
  // 3. Subscriptions — user read own only
  // =========================================================================

  describe("Subscriptions", () => {
    let subscriptionIdA: string;
    let subscriptionIdB: string;

    beforeAll(async () => {
      // Insert subscriptions via service role (users can't insert directly)
      const { data: subA } = await serviceClient
        .from("subscriptions")
        .insert({
          user_id: userA.id,
          plan_id: "free",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        .select()
        .single();

      subscriptionIdA = subA!.id;

      const { data: subB } = await serviceClient
        .from("subscriptions")
        .insert({
          user_id: userB.id,
          plan_id: "premium",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        .select()
        .single();

      subscriptionIdB = subB!.id;
    });

    afterAll(async () => {
      if (subscriptionIdA) {
        await serviceClient.from("subscriptions").delete().eq("id", subscriptionIdA);
      }
      if (subscriptionIdB) {
        await serviceClient.from("subscriptions").delete().eq("id", subscriptionIdB);
      }
    });

    it("should allow user A to read own subscription", async () => {
      const { data, error } = await userA.client
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionIdA)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user_id).toBe(userA.id);
      expect(data!.plan_id).toBe("free");
    });

    it("should NOT allow user A to read user B's subscription", async () => {
      const { data, error } = await userA.client
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionIdB)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should NOT allow anon to read any subscriptions", async () => {
      const { data, error } = await anonClient
        .from("subscriptions")
        .select("*")
        .limit(5);

      // RLS policy is only for authenticated — anon gets empty or error
      expect(data).toEqual([]);
    });

    it("should only return own subscriptions when querying all", async () => {
      const { data, error } = await userA.client
        .from("subscriptions")
        .select("*");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // All returned rows must belong to user A
      for (const row of data!) {
        expect(row.user_id).toBe(userA.id);
      }
    });
  });

  // =========================================================================
  // 4. Payments — user read own only
  // =========================================================================

  describe("Payments", () => {
    let paymentIdA: string;
    let paymentIdB: string;

    beforeAll(async () => {
      // First get subscription IDs for FK reference
      const { data: subA } = await serviceClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", userA.id)
        .limit(1)
        .single();

      const { data: subB } = await serviceClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", userB.id)
        .limit(1)
        .single();

      const { data: payA } = await serviceClient
        .from("payments")
        .insert({
          user_id: userA.id,
          subscription_id: subA?.id ?? null,
          amount: 2990,
          currency: "BRL",
          status: "paid",
        })
        .select()
        .single();

      paymentIdA = payA!.id;

      const { data: payB } = await serviceClient
        .from("payments")
        .insert({
          user_id: userB.id,
          subscription_id: subB?.id ?? null,
          amount: 4990,
          currency: "BRL",
          status: "paid",
        })
        .select()
        .single();

      paymentIdB = payB!.id;
    });

    afterAll(async () => {
      if (paymentIdA) {
        await serviceClient.from("payments").delete().eq("id", paymentIdA);
      }
      if (paymentIdB) {
        await serviceClient.from("payments").delete().eq("id", paymentIdB);
      }
    });

    it("should allow user A to read own payment", async () => {
      const { data, error } = await userA.client
        .from("payments")
        .select("*")
        .eq("id", paymentIdA)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user_id).toBe(userA.id);
      expect(data!.amount).toBe(2990);
    });

    it("should NOT allow user A to read user B's payment", async () => {
      const { data, error } = await userA.client
        .from("payments")
        .select("*")
        .eq("id", paymentIdB)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should NOT allow anon to read any payments", async () => {
      const { data, error } = await anonClient
        .from("payments")
        .select("*")
        .limit(5);

      expect(data).toEqual([]);
    });

    it("should only return own payments when querying all", async () => {
      const { data, error } = await userA.client
        .from("payments")
        .select("*");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      for (const row of data!) {
        expect(row.user_id).toBe(userA.id);
      }
    });
  });

  // =========================================================================
  // 5. Study bookmarks — user CRUD own only
  // =========================================================================

  describe("Study bookmarks", () => {
    let publicStudyId: string;
    let bookmarkIdA: string;

    beforeAll(async () => {
      // Create a public study via service role for bookmarking
      const { data } = await serviceClient
        .from("studies")
        .insert({
          user_id: userA.id,
          title: "Bookmark Test Study",
          content: "Study content for bookmark testing.",
          book: "Romans",
          chapter: 8,
          verse_start: 28,
          verse_end: 28,
          is_public: true,
        })
        .select()
        .single();

      publicStudyId = data!.id;
    });

    afterAll(async () => {
      if (bookmarkIdA) {
        await serviceClient.from("study_bookmarks").delete().eq("id", bookmarkIdA);
      }
      if (publicStudyId) {
        await serviceClient.from("studies").delete().eq("id", publicStudyId);
      }
    });

    it("should allow user A to bookmark a study", async () => {
      const { data, error } = await userA.client
        .from("study_bookmarks")
        .insert({
          user_id: userA.id,
          study_id: publicStudyId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user_id).toBe(userA.id);
      expect(data!.study_id).toBe(publicStudyId);
      bookmarkIdA = data!.id;
    });

    it("should allow user A to read own bookmarks", async () => {
      const { data, error } = await userA.client
        .from("study_bookmarks")
        .select("*")
        .eq("id", bookmarkIdA)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user_id).toBe(userA.id);
    });

    it("should NOT allow user B to read user A's bookmarks", async () => {
      const { data, error } = await userB.client
        .from("study_bookmarks")
        .select("*")
        .eq("id", bookmarkIdA)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should NOT allow user B to insert bookmark as user A", async () => {
      const { error } = await userB.client.from("study_bookmarks").insert({
        user_id: userA.id, // Impersonation attempt
        study_id: publicStudyId,
      });

      expect(error).not.toBeNull();
    });

    it("should NOT allow user B to delete user A's bookmark", async () => {
      await userB.client
        .from("study_bookmarks")
        .delete()
        .eq("id", bookmarkIdA);

      // Verify bookmark still exists
      const { data: check } = await serviceClient
        .from("study_bookmarks")
        .select("id")
        .eq("id", bookmarkIdA)
        .single();

      expect(check).not.toBeNull();
    });

    it("should only return own bookmarks when querying all", async () => {
      const { data, error } = await userA.client
        .from("study_bookmarks")
        .select("*");

      expect(error).toBeNull();
      for (const row of data!) {
        expect(row.user_id).toBe(userA.id);
      }
    });
  });

  // =========================================================================
  // 6. Profiles — read all, write own
  // =========================================================================

  describe("Profiles", () => {
    it("should allow authenticated user to read all profiles", async () => {
      const { data, error } = await userA.client
        .from("profiles")
        .select("*")
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      // Should see at least userA and userB profiles
      const ids = data!.map((p: { id: string }) => p.id);
      expect(ids).toContain(userA.id);
      expect(ids).toContain(userB.id);
    });

    it("should allow user to update own profile", async () => {
      const { error } = await userA.client
        .from("profiles")
        .update({ display_name: "RLS Test User A" })
        .eq("id", userA.id);

      expect(error).toBeNull();

      // Verify update persisted
      const { data } = await userA.client
        .from("profiles")
        .select("display_name")
        .eq("id", userA.id)
        .single();

      expect(data!.display_name).toBe("RLS Test User A");
    });

    it("should NOT allow user A to update user B's profile", async () => {
      await userA.client
        .from("profiles")
        .update({ display_name: "Hijacked Name" })
        .eq("id", userB.id);

      // Verify user B profile was not modified
      const { data } = await serviceClient
        .from("profiles")
        .select("display_name")
        .eq("id", userB.id)
        .single();

      expect(data!.display_name).not.toBe("Hijacked Name");
    });
  });
});
