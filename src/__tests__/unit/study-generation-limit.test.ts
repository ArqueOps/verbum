import { describe, it, expect, vi, beforeEach } from "vitest";
import { canGenerateStudy } from "@/lib/subscription";

function createMockSupabase(options: {
  subscription?: { status: string; current_period_end: string } | null;
  studiesCountToday?: number;
}) {
  const subscriptionChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: options.subscription ?? null,
      error: options.subscription === null ? { code: "PGRST116" } : null,
    }),
  };

  const studiesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({
      count: options.studiesCountToday ?? 0,
      data: null,
      error: null,
    }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "subscriptions") return subscriptionChain;
      if (table === "studies") return studiesChain;
      return subscriptionChain;
    }),
    _chains: { subscriptionChain, studiesChain },
  };
}

function futureDate(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString();
}

function pastDate(daysAgo = 30): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

const USER_ID = "user-abc-123";

describe("canGenerateStudy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test case 1: Active subscriber
  it("should allow active subscriber with future period end", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "active", current_period_end: futureDate() },
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Test case 2: Free user with 0 studies today
  it("should allow free user with 0 studies today", async () => {
    const supabase = createMockSupabase({
      subscription: null,
      studiesCountToday: 0,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Test case 3: Free user with 1 study today
  it("should deny free user with 1 study today with Portuguese message", async () => {
    const supabase = createMockSupabase({
      subscription: null,
      studiesCountToday: 1,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("limite diário");
    expect(result.reason).toContain("Assine um plano");
  });

  // Test case 4: Canceled subscription with future period end
  it("should allow canceled subscription with future period end", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "canceled", current_period_end: futureDate(15) },
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Test case 5: Canceled subscription with past period end → free tier rules
  it("should apply free tier rules for canceled subscription with past period end", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "canceled", current_period_end: pastDate(5) },
      studiesCountToday: 1,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limite diário");
  });

  it("should allow canceled subscription with past period end and 0 studies today", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "canceled", current_period_end: pastDate(5) },
      studiesCountToday: 0,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
  });

  // Test case 6: past_due status → free tier rules
  it("should apply free tier rules for past_due subscription", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "past_due", current_period_end: futureDate() },
      studiesCountToday: 1,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limite diário");
  });

  it("should allow past_due subscription with 0 studies today", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "past_due", current_period_end: futureDate() },
      studiesCountToday: 0,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
  });

  // Test case 7: No subscription row
  it("should apply free tier rules when no subscription exists", async () => {
    const supabase = createMockSupabase({
      subscription: null,
      studiesCountToday: 1,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limite diário");
  });

  // Test case 8: Expired status → free tier rules
  it("should apply free tier rules for expired subscription", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "expired", current_period_end: pastDate(10) },
      studiesCountToday: 1,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limite diário");
  });

  it("should allow expired subscription with 0 studies today", async () => {
    const supabase = createMockSupabase({
      subscription: { status: "expired", current_period_end: pastDate(10) },
      studiesCountToday: 0,
    });

    const result = await canGenerateStudy(supabase as never, USER_ID);

    expect(result.allowed).toBe(true);
  });
});
