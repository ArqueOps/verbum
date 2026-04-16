// @vitest-environment node

/**
 * Integration tests for POST /api/checkout/create.
 *
 * Verifies:
 *   1. Returns 401 when no auth session (Supabase client has no user)
 *   2. Returns 400 for invalid plan values ('lifetime', '', undefined)
 *   3. Returns 409 when user already has an active subscription
 *   4. Returns 200 with checkoutUrl for monthly plan (authenticated, no active sub)
 *   5. Returns 200 with checkoutUrl for annual plan (authenticated, no active sub)
 *   6. checkoutUrl contains user_id and points to caramelou.com.br
 *   7. Returns 502 when Caramelou API returns a 5xx error
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: "user-abc-123-test",
  email: "test@verbum.app",
  aud: "authenticated",
};

const CARAMELOU_CHECKOUT_URL = "https://caramelou.com.br/api/checkout";

// ---------------------------------------------------------------------------
// Mock setup: Supabase client factory
// ---------------------------------------------------------------------------

function createMockSupabaseClient(options: {
  user: typeof MOCK_USER | null;
  authError: Error | null;
  hasActiveSubscription: boolean | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.authError,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "user_credits") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: options.hasActiveSubscription !== null
                  ? { has_active_subscription: options.hasActiveSubscription }
                  : null,
                error: options.hasActiveSubscription === null
                  ? { code: "PGRST116", message: "No rows found" }
                  : null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock setup: Modules
// ---------------------------------------------------------------------------

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: () => [],
      set: vi.fn(),
    }),
  ),
}));

// ---------------------------------------------------------------------------
// Mock setup: global fetch (for Caramelou API calls)
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;

function mockCaramelouFetch(options: {
  status: number;
  checkoutUrl?: string;
}) {
  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.includes("caramelou.com.br")) {
      if (options.status >= 500) {
        return new Response(
          JSON.stringify({ error: "Internal Server Error" }),
          { status: options.status, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ checkout_url: options.checkoutUrl }),
        { status: options.status, headers: { "Content-Type": "application/json" } },
      );
    }

    return originalFetch(input as RequestInfo, undefined);
  }) as Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildEmptyRequest(): Request {
  return new Request("http://localhost:3000/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/checkout/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // 1. Authentication — 401
  // =========================================================================

  describe("Authentication", () => {
    it("should return 401 when no auth session exists", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: null,
        authError: new Error("No session"),
        hasActiveSubscription: null,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "monthly" });
      const response = await POST(request);

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when auth returns no user (no error but null user)", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: null,
        authError: null,
        hasActiveSubscription: null,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "annual" });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. Plan validation — 400
  // =========================================================================

  describe("Plan validation", () => {
    it("should return 400 for invalid plan 'lifetime'", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "lifetime" });
      const response = await POST(request);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("Invalid plan");
    });

    it("should return 400 for empty string plan", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "" });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when plan is undefined (missing from body)", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });

      const { POST } = await import("../route");
      const request = buildEmptyRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Active subscription — 409
  // =========================================================================

  describe("Active subscription conflict", () => {
    it("should return 409 when user already has an active subscription", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: true,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "monthly" });
      const response = await POST(request);

      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.error).toContain("active subscription");
    });
  });

  // =========================================================================
  // 4. Success — 200 monthly
  // =========================================================================

  describe("Successful checkout creation", () => {
    it("should return 200 with checkoutUrl for monthly plan", async () => {
      const expectedCheckoutUrl = `${CARAMELOU_CHECKOUT_URL}/session/sess-monthly-123?user_id=${MOCK_USER.id}`;

      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });
      mockCaramelouFetch({
        status: 200,
        checkoutUrl: expectedCheckoutUrl,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "monthly" });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.checkoutUrl).toBeDefined();
      expect(body.checkoutUrl).toBe(expectedCheckoutUrl);
      expect(body.checkoutUrl).toContain("caramelou.com.br");
      expect(body.checkoutUrl).toContain(MOCK_USER.id);
    });

    // =========================================================================
    // 5. Success — 200 annual
    // =========================================================================

    it("should return 200 with checkoutUrl for annual plan", async () => {
      const expectedCheckoutUrl = `${CARAMELOU_CHECKOUT_URL}/session/sess-annual-456?user_id=${MOCK_USER.id}`;

      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });
      mockCaramelouFetch({
        status: 200,
        checkoutUrl: expectedCheckoutUrl,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "annual" });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.checkoutUrl).toBeDefined();
      expect(body.checkoutUrl).toBe(expectedCheckoutUrl);
      expect(body.checkoutUrl).toContain("caramelou.com.br");
      expect(body.checkoutUrl).toContain(MOCK_USER.id);
    });

    // =========================================================================
    // 6. checkoutUrl validation
    // =========================================================================

    it("should pass correct user_id to Caramelou API", async () => {
      const expectedCheckoutUrl = `https://caramelou.com.br/checkout/sess-789?user_id=${MOCK_USER.id}`;

      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });
      mockCaramelouFetch({
        status: 200,
        checkoutUrl: expectedCheckoutUrl,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "monthly" });
      await POST(request);

      // Verify the fetch call to Caramelou included the correct user_id
      const fetchCalls = (global.fetch as Mock).mock.calls;
      const caramelouCall = fetchCalls.find((call) => {
        const url = typeof call[0] === "string" ? call[0] : call[0]?.url;
        return url?.includes("caramelou.com.br");
      });

      expect(caramelouCall).toBeDefined();
      const requestBody = JSON.parse(caramelouCall![1]?.body as string);
      expect(requestBody.user_id).toBe(MOCK_USER.id);
      expect(requestBody.plan).toBe("monthly");
    });
  });

  // =========================================================================
  // 7. Caramelou API error — 502
  // =========================================================================

  describe("Caramelou API failure", () => {
    it("should return 502 when Caramelou API returns 500", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });
      mockCaramelouFetch({ status: 500 });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "monthly" });
      const response = await POST(request);

      expect(response.status).toBe(502);

      const body = await response.json();
      expect(body.error).toContain("Failed to create checkout session");
    });

    it("should return 502 when Caramelou API returns 503", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        hasActiveSubscription: false,
      });
      mockCaramelouFetch({ status: 503 });

      const { POST } = await import("../route");
      const request = buildRequest({ plan: "annual" });
      const response = await POST(request);

      expect(response.status).toBe(502);
    });
  });
});
