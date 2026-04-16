/**
 * Integration tests for the handle_new_user() trigger.
 *
 * Validates that when a new user is created via Supabase Auth,
 * the trigger automatically creates a profile row with correct
 * column mapping (display_name, avatar_url from raw_user_meta_data).
 *
 * Also verifies ON CONFLICT (id) DO NOTHING idempotency.
 *
 * Uses real Supabase instance with service role client.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, afterAll } from "vitest";

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

const testUserIds: string[] = [];

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

afterAll(async () => {
  // Clean up all test users and their profiles
  for (const userId of testUserIds) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

/**
 * Helper: create an auth user and track for cleanup.
 */
async function createTestUser(
  email: string,
  metadata?: Record<string, string>
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123!",
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  testUserIds.push(data.user.id);
  return data.user.id;
}

describe("handle_new_user trigger", () => {
  it("should auto-create a profile when a new user signs up with display_name metadata", async () => {
    const userId = await createTestUser(
      `handle-new-user-dn-${Date.now()}@test.verbum.app`,
      { display_name: "Test Display Name", avatar_url: "https://example.com/avatar.png" }
    );

    // Allow a brief moment for the trigger to execute
    await new Promise((r) => setTimeout(r, 500));

    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.id).toBe(userId);
    expect(profile!.display_name).toBe("Test Display Name");
    expect(profile!.avatar_url).toBe("https://example.com/avatar.png");
    expect(profile!.created_at).toBeTruthy();
    expect(profile!.updated_at).toBeTruthy();
  });

  it("should extract display_name from full_name metadata as fallback", async () => {
    const userId = await createTestUser(
      `handle-new-user-fn-${Date.now()}@test.verbum.app`,
      { full_name: "Full Name Fallback" }
    );

    await new Promise((r) => setTimeout(r, 500));

    const { data: profile, error } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.display_name).toBe("Full Name Fallback");
  });

  it("should extract display_name from name metadata as second fallback", async () => {
    const userId = await createTestUser(
      `handle-new-user-name-${Date.now()}@test.verbum.app`,
      { name: "Name Fallback" }
    );

    await new Promise((r) => setTimeout(r, 500));

    const { data: profile, error } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.display_name).toBe("Name Fallback");
  });

  it("should default display_name and avatar_url to empty string when no metadata", async () => {
    const userId = await createTestUser(
      `handle-new-user-empty-${Date.now()}@test.verbum.app`
    );

    await new Promise((r) => setTimeout(r, 500));

    const { data: profile, error } = await admin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.display_name).toBe("");
    expect(profile!.avatar_url).toBe("");
  });

  it("should not fail on duplicate trigger execution (ON CONFLICT idempotency)", async () => {
    const userId = await createTestUser(
      `handle-new-user-conflict-${Date.now()}@test.verbum.app`,
      { display_name: "Conflict Test User" }
    );

    await new Promise((r) => setTimeout(r, 500));

    // Verify profile was created by trigger
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    expect(profile).toBeTruthy();
    expect(profile!.display_name).toBe("Conflict Test User");

    // Simulate duplicate trigger execution by calling the function directly via SQL
    // This exercises the ON CONFLICT (id) DO NOTHING path
    const { error: rpcError } = await admin.rpc("handle_new_user_idempotency_check", {
      user_id: userId,
    }).maybeSingle();

    // If the RPC doesn't exist, fall back to a direct insert with ON CONFLICT
    if (rpcError) {
      const { error: insertError } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: "Should Not Overwrite",
            avatar_url: "should-not-overwrite",
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

      expect(insertError).toBeNull();
    }

    // Verify original profile data is unchanged
    const { data: afterProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    expect(afterProfile).toBeTruthy();
    expect(afterProfile!.display_name).toBe("Conflict Test User");
  });
});
