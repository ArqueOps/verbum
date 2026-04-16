/**
 * Integration tests for atomic credit RPCs:
 *   - check_user_credits: returns credit state + subscription status
 *   - consume_credit_and_save_study: atomically checks credits, saves study + 7 sections, decrements credit
 *
 * Tests cover: happy path, subscriber bypass, zero credits, race condition, expired subscription.
 * Uses real Supabase instance with service role client. No mocks.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

const SECTION_TYPES = [
  "context",
  "key_words",
  "cross_references",
  "theological_analysis",
  "historical_context",
  "practical_application",
  "reflection_questions",
] as const;

function buildSections(): object[] {
  return SECTION_TYPES.map((type, i) => ({
    section_type: type,
    title: `Section: ${type}`,
    content: `Content for ${type} section.`,
    display_order: i + 1,
  }));
}

let admin: SupabaseClient;
const testUserIds: string[] = [];
const testStudyIds: string[] = [];

async function createTestUser(
  email: string,
  credits: number,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-Atomic1!",
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create user: ${error.message}`);
  const userId = data.user.id;
  testUserIds.push(userId);

  // Ensure profile exists with specified credits
  await admin.from("profiles").upsert({
    id: userId,
    display_name: `Test ${email.split("@")[0]}`,
    email,
    credits_remaining: credits,
    study_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return userId;
}

async function addSubscription(
  userId: string,
  periodEnd: Date,
  status = "active",
): Promise<void> {
  await admin.from("subscriptions").insert({
    user_id: userId,
    status,
    current_period_start: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    current_period_end: periodEnd.toISOString(),
  });
}

beforeAll(() => {
  admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});

afterAll(async () => {
  // Clean up in reverse dependency order
  for (const studyId of testStudyIds) {
    await admin.from("study_sections").delete().eq("study_id", studyId);
    await admin.from("studies").delete().eq("id", studyId);
  }
  for (const userId of testUserIds) {
    await admin.from("subscriptions").delete().eq("user_id", userId);
    await admin.from("studies").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

// ---------------------------------------------------------------------------
// check_user_credits
// ---------------------------------------------------------------------------

describe("check_user_credits RPC", () => {
  it("should return credits and can_generate=true when user has credits", async () => {
    const userId = await createTestUser(
      `credits-check-${Date.now()}@test.verbum.app`,
      5,
    );

    const { data, error } = await admin.rpc("check_user_credits", {
      p_user_id: userId,
    });

    expect(error).toBeNull();
    expect(data).toEqual({
      credits_remaining: 5,
      has_active_subscription: false,
      can_generate: true,
    });
  });

  it("should return can_generate=false when user has 0 credits and no subscription", async () => {
    const userId = await createTestUser(
      `credits-zero-${Date.now()}@test.verbum.app`,
      0,
    );

    const { data, error } = await admin.rpc("check_user_credits", {
      p_user_id: userId,
    });

    expect(error).toBeNull();
    expect(data).toEqual({
      credits_remaining: 0,
      has_active_subscription: false,
      can_generate: false,
    });
  });

  it("should return has_active_subscription=true when subscription is active and not expired", async () => {
    const userId = await createTestUser(
      `credits-sub-${Date.now()}@test.verbum.app`,
      0,
    );
    await addSubscription(
      userId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    const { data, error } = await admin.rpc("check_user_credits", {
      p_user_id: userId,
    });

    expect(error).toBeNull();
    expect(data.has_active_subscription).toBe(true);
    expect(data.can_generate).toBe(true);
  });

  it("should return has_active_subscription=false when subscription is expired", async () => {
    const userId = await createTestUser(
      `credits-expsub-${Date.now()}@test.verbum.app`,
      2,
    );
    await addSubscription(
      userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
    );

    const { data, error } = await admin.rpc("check_user_credits", {
      p_user_id: userId,
    });

    expect(error).toBeNull();
    expect(data.has_active_subscription).toBe(false);
    expect(data.credits_remaining).toBe(2);
    expect(data.can_generate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// consume_credit_and_save_study
// ---------------------------------------------------------------------------

describe("consume_credit_and_save_study RPC", () => {
  it("should decrement credit and save study with 7 sections (happy path)", async () => {
    const userId = await createTestUser(
      `consume-happy-${Date.now()}@test.verbum.app`,
      5,
    );

    const { data: studyId, error } = await admin.rpc(
      "consume_credit_and_save_study",
      {
        p_user_id: userId,
        p_title: "Study on John 3:16",
        p_content: "Full study content here.",
        p_book: "Jo",
        p_chapter: 3,
        p_verse_start: 16,
        p_verse_end: 16,
        p_sections: buildSections(),
      },
    );

    expect(error).toBeNull();
    expect(studyId).toBeTruthy();
    testStudyIds.push(studyId);

    // Verify credits decremented
    const { data: profile } = await admin
      .from("profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();
    expect(profile!.credits_remaining).toBe(4);

    // Verify study saved
    const { data: study } = await admin
      .from("studies")
      .select("*")
      .eq("id", studyId)
      .single();
    expect(study!.title).toBe("Study on John 3:16");
    expect(study!.user_id).toBe(userId);

    // Verify 7 sections saved
    const { data: sections } = await admin
      .from("study_sections")
      .select("*")
      .eq("study_id", studyId)
      .order("display_order");
    expect(sections).toHaveLength(7);
    expect(sections!.map((s: { section_type: string }) => s.section_type)).toEqual([
      "context",
      "key_words",
      "cross_references",
      "theological_analysis",
      "historical_context",
      "practical_application",
      "reflection_questions",
    ]);
  });

  // ---------------------------------------------------------------------------
  // Subscriber bypass
  // ---------------------------------------------------------------------------

  it("should NOT decrement credits when user has active subscription", async () => {
    const userId = await createTestUser(
      `consume-sub-${Date.now()}@test.verbum.app`,
      5,
    );
    await addSubscription(
      userId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    const { data: studyId, error } = await admin.rpc(
      "consume_credit_and_save_study",
      {
        p_user_id: userId,
        p_title: "Subscriber Study",
        p_content: "Subscriber study content.",
        p_book: "Gn",
        p_chapter: 1,
        p_verse_start: 1,
        p_verse_end: 3,
        p_sections: buildSections(),
      },
    );

    expect(error).toBeNull();
    expect(studyId).toBeTruthy();
    testStudyIds.push(studyId);

    // Credits should remain unchanged
    const { data: profile } = await admin
      .from("profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();
    expect(profile!.credits_remaining).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Zero credits, no subscription
  // ---------------------------------------------------------------------------

  it("should raise NO_CREDITS when user has 0 credits and no subscription", async () => {
    const userId = await createTestUser(
      `consume-zero-${Date.now()}@test.verbum.app`,
      0,
    );

    const { error } = await admin.rpc(
      "consume_credit_and_save_study",
      {
        p_user_id: userId,
        p_title: "Should Fail",
        p_content: "This should not be saved.",
        p_book: "Gn",
        p_chapter: 1,
        p_verse_start: 1,
        p_verse_end: 1,
        p_sections: buildSections(),
      },
    );

    expect(error).toBeTruthy();
    expect(error!.message).toContain("NO_CREDITS");

    // Verify no study was saved for this user (beyond any pre-existing)
    const { data: studies } = await admin
      .from("studies")
      .select("id")
      .eq("user_id", userId);
    expect(studies).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Expired subscription — should decrement credits normally
  // ---------------------------------------------------------------------------

  it("should decrement credits when subscription is expired", async () => {
    const userId = await createTestUser(
      `consume-expired-${Date.now()}@test.verbum.app`,
      3,
    );
    // Expired subscription
    await addSubscription(
      userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    const { data: studyId, error } = await admin.rpc(
      "consume_credit_and_save_study",
      {
        p_user_id: userId,
        p_title: "Expired Sub Study",
        p_content: "Study with expired subscription.",
        p_book: "Sl",
        p_chapter: 23,
        p_verse_start: 1,
        p_verse_end: 6,
        p_sections: buildSections(),
      },
    );

    expect(error).toBeNull();
    expect(studyId).toBeTruthy();
    testStudyIds.push(studyId);

    // Credits should be decremented (expired sub = no bypass)
    const { data: profile } = await admin
      .from("profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();
    expect(profile!.credits_remaining).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Race condition: 2 concurrent calls with 1 credit
  // ---------------------------------------------------------------------------

  it("should allow only one of two concurrent calls when user has 1 credit", async () => {
    const userId = await createTestUser(
      `consume-race-${Date.now()}@test.verbum.app`,
      1,
    );

    const call1 = admin.rpc("consume_credit_and_save_study", {
      p_user_id: userId,
      p_title: "Race Study A",
      p_content: "Race condition test A.",
      p_book: "Mt",
      p_chapter: 5,
      p_verse_start: 1,
      p_verse_end: 12,
      p_sections: buildSections(),
    });

    const call2 = admin.rpc("consume_credit_and_save_study", {
      p_user_id: userId,
      p_title: "Race Study B",
      p_content: "Race condition test B.",
      p_book: "Mt",
      p_chapter: 5,
      p_verse_start: 13,
      p_verse_end: 16,
      p_sections: buildSections(),
    });

    const [result1, result2] = await Promise.all([call1, call2]);

    const successes = [result1, result2].filter((r) => !r.error);
    const failures = [result1, result2].filter((r) => r.error);

    // Exactly one should succeed, one should fail with NO_CREDITS
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.error!.message).toContain("NO_CREDITS");

    // Track successful study for cleanup
    if (successes[0]?.data) testStudyIds.push(successes[0].data);

    // Credits should be exactly 0
    const { data: profile } = await admin
      .from("profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();
    expect(profile!.credits_remaining).toBe(0);
  });
});
