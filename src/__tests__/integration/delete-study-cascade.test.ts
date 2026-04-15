/**
 * Integration tests for delete study cascade behavior.
 *
 * Verifies against real Supabase:
 *   1. Deleting a study removes the study row
 *   2. Associated study_bookmarks entries are cascade-deleted
 *   3. Owner can delete their own study (RLS enforced)
 *   4. Non-owner cannot delete another user's study (RLS enforced)
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

const testUserIds: string[] = [];

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

  if (adminError) throw new Error(`Failed to create test user ${email}: ${adminError.message}`);

  const userId = adminData.user.id;
  testUserIds.push(userId);

  const tempClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } =
    await tempClient.auth.signInWithPassword({ email, password });

  if (signInError) throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);

  return {
    id: userId,
    email,
    accessToken: signInData.session!.access_token,
    client: createAuthClient(signInData.session!.access_token),
  };
}

async function cleanupTestUsers(serviceClient: SupabaseClient): Promise<void> {
  for (const userId of testUserIds) {
    await serviceClient.from("study_bookmarks").delete().eq("user_id", userId);
    await serviceClient.from("studies").delete().eq("user_id", userId);
    await serviceClient.from("profiles").delete().eq("id", userId);
    await serviceClient.auth.admin.deleteUser(userId);
  }
  testUserIds.length = 0;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Delete Study Cascade Integration Tests", () => {
  let serviceClient: SupabaseClient;
  let owner: TestUser;
  let nonOwner: TestUser;

  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    serviceClient = createServiceClient();

    owner = await createTestUser(
      serviceClient,
      `del-cascade-owner-${uniqueSuffix}@test.verbum.app`,
      "TestPassword123!"
    );

    nonOwner = await createTestUser(
      serviceClient,
      `del-cascade-other-${uniqueSuffix}@test.verbum.app`,
      "TestPassword456!"
    );
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUsers(serviceClient);
  });

  // =========================================================================
  // 1. Owner can delete their own study — row is removed
  // =========================================================================

  describe("Owner deletes own study", () => {
    let studyId: string;

    afterAll(async () => {
      if (studyId) {
        await serviceClient.from("studies").delete().eq("id", studyId);
      }
    });

    it("should remove the study row when owner deletes", async () => {
      const { data: created, error: insertError } = await owner.client
        .from("studies")
        .insert({
          user_id: owner.id,
          title: "Study to delete",
          content: "Content that will be deleted.",
          book: "John",
          chapter: 3,
          verse_start: 16,
          verse_end: 16,
          is_public: false,
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(created).toBeDefined();
      studyId = created!.id;

      const { error: deleteError } = await owner.client
        .from("studies")
        .delete()
        .eq("id", studyId);

      expect(deleteError).toBeNull();

      const { data: check } = await serviceClient
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .maybeSingle();

      expect(check).toBeNull();
      studyId = "";
    });
  });

  // =========================================================================
  // 2. Cascade: deleting a study removes associated study_bookmarks
  // =========================================================================

  describe("Cascade delete of study_bookmarks", () => {
    let studyId: string;

    afterAll(async () => {
      if (studyId) {
        await serviceClient.from("study_bookmarks").delete().eq("study_id", studyId);
        await serviceClient.from("studies").delete().eq("id", studyId);
      }
    });

    it("should cascade-delete study_bookmarks when study is deleted", async () => {
      const { data: study, error: studyError } = await serviceClient
        .from("studies")
        .insert({
          user_id: owner.id,
          title: "Study with bookmarks",
          content: "Content for cascade test.",
          book: "Psalms",
          chapter: 23,
          verse_start: 1,
          verse_end: 6,
          is_public: true,
        })
        .select()
        .single();

      expect(studyError).toBeNull();
      studyId = study!.id;

      const { error: bmOwnerErr } = await serviceClient
        .from("study_bookmarks")
        .insert({ user_id: owner.id, study_id: studyId });

      expect(bmOwnerErr).toBeNull();

      const { error: bmOtherErr } = await serviceClient
        .from("study_bookmarks")
        .insert({ user_id: nonOwner.id, study_id: studyId });

      expect(bmOtherErr).toBeNull();

      const { data: beforeDelete } = await serviceClient
        .from("study_bookmarks")
        .select("id")
        .eq("study_id", studyId);

      expect(beforeDelete).toHaveLength(2);

      const { error: deleteError } = await serviceClient
        .from("studies")
        .delete()
        .eq("id", studyId);

      expect(deleteError).toBeNull();

      const { data: afterDelete } = await serviceClient
        .from("study_bookmarks")
        .select("id")
        .eq("study_id", studyId);

      expect(afterDelete).toHaveLength(0);
      studyId = "";
    });
  });

  // =========================================================================
  // 3. Owner can delete via authenticated client (RLS allows)
  // =========================================================================

  describe("RLS: owner delete allowed", () => {
    it("should allow owner to delete their own study via authenticated client", async () => {
      const { data: study, error: insertError } = await owner.client
        .from("studies")
        .insert({
          user_id: owner.id,
          title: "Owner delete RLS test",
          content: "Owner should be able to delete this.",
          book: "Genesis",
          chapter: 1,
          verse_start: 1,
          verse_end: 3,
          is_public: false,
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      const studyId = study!.id;

      const { error: deleteError } = await owner.client
        .from("studies")
        .delete()
        .eq("id", studyId);

      expect(deleteError).toBeNull();

      const { data: check } = await serviceClient
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .maybeSingle();

      expect(check).toBeNull();
    });
  });

  // =========================================================================
  // 4. Non-owner cannot delete another user's study (RLS blocks)
  // =========================================================================

  describe("RLS: non-owner delete blocked", () => {
    let studyId: string;

    afterAll(async () => {
      if (studyId) {
        await serviceClient.from("studies").delete().eq("id", studyId);
      }
    });

    it("should NOT allow non-owner to delete another user's study", async () => {
      const { data: study, error: insertError } = await owner.client
        .from("studies")
        .insert({
          user_id: owner.id,
          title: "Protected from non-owner delete",
          content: "Non-owner should not be able to delete this.",
          book: "Romans",
          chapter: 8,
          verse_start: 28,
          verse_end: 28,
          is_public: true,
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      studyId = study!.id;

      await nonOwner.client
        .from("studies")
        .delete()
        .eq("id", studyId);

      const { data: check } = await serviceClient
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .single();

      expect(check).not.toBeNull();
      expect(check!.id).toBe(studyId);
    });

    it("should NOT allow non-owner to delete even a public study they can read", async () => {
      const { data: readable } = await nonOwner.client
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .maybeSingle();

      expect(readable).not.toBeNull();

      await nonOwner.client
        .from("studies")
        .delete()
        .eq("id", studyId);

      const { data: stillExists } = await serviceClient
        .from("studies")
        .select("id")
        .eq("id", studyId)
        .single();

      expect(stillExists).not.toBeNull();
    });
  });
});
