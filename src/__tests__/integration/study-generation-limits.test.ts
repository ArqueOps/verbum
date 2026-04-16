import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { canGenerateStudy } from "@/lib/study-limits";

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const testUserIds: string[] = [];
const testStudyIds: string[] = [];
const testSubscriptionIds: string[] = [];

async function createTestUser(
  admin: SupabaseClient,
  label: string,
): Promise<string> {
  const email = `study-limits-${label}-${Date.now()}@test.verbum.app`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123!",
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  testUserIds.push(data.user.id);
  return data.user.id;
}

async function insertStudy(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await admin
    .from("studies")
    .insert({
      user_id: userId,
      title: "Test Study",
      content: "Test content for study generation limits",
      book: "Genesis",
      chapter: 1,
      verse_start: 1,
      verse_end: 3,
      is_public: false,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert study: ${error.message}`);
  testStudyIds.push(data.id);
  return data.id;
}

async function insertSubscription(
  admin: SupabaseClient,
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const defaults = {
    user_id: userId,
    plan_id: "premium",
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };

  const { data, error } = await admin
    .from("subscriptions")
    .insert({ ...defaults, ...overrides })
    .select("id")
    .single();

  if (error)
    throw new Error(`Failed to insert subscription: ${error.message}`);
  testSubscriptionIds.push(data.id);
  return data.id;
}

describe("Study Generation Limits", () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createServiceClient();
  });

  afterAll(async () => {
    for (const id of testStudyIds) {
      await admin.from("studies").delete().eq("id", id);
    }
    for (const id of testSubscriptionIds) {
      await admin.from("subscriptions").delete().eq("id", id);
    }
    for (const id of testUserIds) {
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("should allow active subscriber to generate unlimited studies", async () => {
    const userId = await createTestUser(admin, "active-sub");
    await insertSubscription(admin, userId);

    const first = await canGenerateStudy(admin, userId);
    expect(first.allowed).toBe(true);

    await insertStudy(admin, userId);
    await insertStudy(admin, userId);
    await insertStudy(admin, userId);

    const afterMultiple = await canGenerateStudy(admin, userId);
    expect(afterMultiple.allowed).toBe(true);
  });

  it("should block free user after 1 study per day", async () => {
    const userId = await createTestUser(admin, "free-user");

    const before = await canGenerateStudy(admin, userId);
    expect(before.allowed).toBe(true);

    await insertStudy(admin, userId);

    const after = await canGenerateStudy(admin, userId);
    expect(after.allowed).toBe(false);
    expect(after.reason).toBe("DAILY_LIMIT_REACHED");
  });

  it("should allow canceled subscription with future period_end", async () => {
    const userId = await createTestUser(admin, "canceled-sub");
    await insertSubscription(admin, userId, {
      status: "canceled",
      current_period_end: new Date(
        Date.now() + 15 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    const result = await canGenerateStudy(admin, userId);
    expect(result.allowed).toBe(true);

    await insertStudy(admin, userId);
    await insertStudy(admin, userId);

    const afterStudies = await canGenerateStudy(admin, userId);
    expect(afterStudies.allowed).toBe(true);
  });

  it("should enforce free tier limits for expired subscription", async () => {
    const userId = await createTestUser(admin, "expired-sub");
    await insertSubscription(admin, userId, {
      status: "expired",
      current_period_start: new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      current_period_end: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    const before = await canGenerateStudy(admin, userId);
    expect(before.allowed).toBe(true);

    await insertStudy(admin, userId);

    const after = await canGenerateStudy(admin, userId);
    expect(after.allowed).toBe(false);
    expect(after.reason).toBe("DAILY_LIMIT_REACHED");
  });
});
