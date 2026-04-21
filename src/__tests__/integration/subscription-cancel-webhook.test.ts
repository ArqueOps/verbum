// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: "user-cancel-test-123",
  email: "cancel-test@verbum.app",
  aud: "authenticated",
};

const MOCK_SUBSCRIPTION = {
  id: "sub-cancel-test-456",
  status: "active",
  current_period_end: new Date(Date.now() + 86400000).toISOString(),
  caramelou_subscription_id: "caramelou-sub-789",
};

const CARAMELOU_API_KEY = "test-webhook-secret-key";
const CARAMELOU_API_URL = "https://caramelou-test.example.com";

// ---------------------------------------------------------------------------
// Mock Supabase state
// ---------------------------------------------------------------------------

const mockFromResults: Record<string, unknown> = {};
const mockInsertCalls: Array<{ table: string; data: unknown }> = [];
const mockUpdateCalls: Array<{ table: string; data: unknown; filters: Record<string, unknown> }> = [];

function buildChainableMock(resolvedValue: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(resolvedValue);
  const chain: Record<string, unknown> = {};

  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.then = resolved.then.bind(resolved);

  return chain;
}

function createMockSupabaseClient(options: {
  user: typeof MOCK_USER | null;
  authError: Error | null;
}) {
  const mockFrom = vi.fn((table: string) => {
    const result = mockFromResults[table];

    const chain = buildChainableMock({
      data: result ?? null,
      error: null,
    });

    chain.insert = vi.fn((data: unknown) => {
      mockInsertCalls.push({ table, data });
      return buildChainableMock({ data: null, error: null });
    });

    chain.update = vi.fn((data: unknown) => {
      const filters: Record<string, unknown> = {};
      const updateChain = buildChainableMock({ data: null, error: null });
      const originalEq = updateChain.eq as (...args: unknown[]) => unknown;
      updateChain.eq = vi.fn((col: string, val: unknown) => {
        filters[col] = val;
        mockUpdateCalls.push({ table, data, filters: { ...filters } });
        return originalEq(col, val);
      });
      return updateChain;
    });

    return chain;
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.authError,
      }),
    },
    from: mockFrom,
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(
        buildChainableMock({
          data: options.user ? { id: options.user.id } : null,
          error: null,
        }),
      ),
    }),
  };
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: () => [],
      set: vi.fn(),
    }),
  ),
}));

const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCancelRequest(body?: unknown): NextRequest {
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost:3000/api/subscription/cancel", init);
}

function buildWebhookRequest(
  payload: Record<string, unknown>,
  options?: { apiKeyHash?: string | null },
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.apiKeyHash !== null) {
    const hash =
      options?.apiKeyHash ??
      createHash("sha256").update(CARAMELOU_API_KEY).digest("hex");
    headers["x-api-key-hash"] = hash;
  }

  return new NextRequest("http://localhost:3000/api/webhooks/caramelou", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// POST /api/subscription/cancel
// ---------------------------------------------------------------------------

describe("POST /api/subscription/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockInsertCalls.length = 0;
    mockUpdateCalls.length = 0;
    Object.keys(mockFromResults).forEach((k) => delete mockFromResults[k]);
    globalThis.fetch = originalFetch;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.CARAMELOU_API_URL = CARAMELOU_API_URL;
  });

  it("should return 401 when user is not authenticated", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: null,
      authError: new Error("No session"),
    });

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(buildCancelRequest({ reason: "Too expensive" }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 403 when user has no active subscription", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["subscriptions"] = null;

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(buildCancelRequest({ reason: "Not using it" }));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 when reason is missing", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(buildCancelRequest({ feedback: "no reason given" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 when body is empty", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(buildCancelRequest({}));

    expect(response.status).toBe(400);
  });

  it("should return 200 and insert cancellation on success", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["subscriptions"] = MOCK_SUBSCRIPTION;

    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("cancel-subscription")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input as RequestInfo, undefined);
    }) as typeof fetch;

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(
      buildCancelRequest({ reason: "Too expensive", feedback: "Lower the price" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBeDefined();

    const cancellationInsert = mockInsertCalls.find(
      (c) => c.table === "subscription_cancellations",
    );
    expect(cancellationInsert).toBeDefined();
    expect(cancellationInsert!.data).toMatchObject({
      user_id: MOCK_USER.id,
      subscription_id: MOCK_SUBSCRIPTION.id,
      reason: "Too expensive",
      feedback: "Lower the price",
    });
  });

  it("should call Caramelou API with correct subscription_id", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["subscriptions"] = MOCK_SUBSCRIPTION;

    let capturedBody: Record<string, unknown> | null = null;

    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("cancel-subscription")) {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string) as Record<string, unknown>;
        } else if (input instanceof Request) {
          capturedBody = (await input.json()) as Record<string, unknown>;
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input as RequestInfo, undefined);
    }) as typeof fetch;

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    await POST(buildCancelRequest({ reason: "Switching provider" }));

    expect(capturedBody).toMatchObject({
      subscription_id: MOCK_SUBSCRIPTION.caramelou_subscription_id,
      cancellation_reason: "Switching provider",
    });
  });

  it("should return 502 when Caramelou API fails", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["subscriptions"] = MOCK_SUBSCRIPTION;

    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ error: "internal" }), {
        status: 500,
      });
    }) as typeof fetch;

    const { POST } = await import(
      "@/app/api/subscription/cancel/route"
    );
    const response = await POST(buildCancelRequest({ reason: "Cancelling" }));

    expect(response.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/caramelou
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/caramelou", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockInsertCalls.length = 0;
    mockUpdateCalls.length = 0;
    Object.keys(mockFromResults).forEach((k) => delete mockFromResults[k]);
    globalThis.fetch = originalFetch;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.CARAMELOU_API_KEY = CARAMELOU_API_KEY;
  });

  it("should return 401 when webhook signature is missing", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: null,
      authError: null,
    });

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const request = buildWebhookRequest(
      { event: "subscription_created", subscription_id: "sub-1" },
      { apiKeyHash: null },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("should return 401 when webhook signature is invalid", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: null,
      authError: null,
    });

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const request = buildWebhookRequest(
      { event: "subscription_created", subscription_id: "sub-1" },
      { apiKeyHash: "invalid-hash-value-that-does-not-match-anything-here" },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("should handle subscription_created event and insert webhook_events row", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["webhook_events"] = null;

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const response = await POST(
      buildWebhookRequest({
        event: "subscription_created",
        subscription_id: "sub-new-001",
        customer: { email: MOCK_USER.email },
        frequency_type: "monthly",
        current_period_start: "2026-04-16T00:00:00Z",
        next_charge_at: "2026-05-16T00:00:00Z",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);

    const webhookInsert = mockInsertCalls.find(
      (c) => c.table === "webhook_events",
    );
    expect(webhookInsert).toBeDefined();
    expect(webhookInsert!.data).toMatchObject({
      event_type: "subscription_created",
    });
  });

  it("should handle subscription_canceled event", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["webhook_events"] = null;

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const response = await POST(
      buildWebhookRequest({
        event: "subscription_canceled",
        subscription_id: "sub-cancel-001",
        customer: { email: MOCK_USER.email },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);

    const webhookInsert = mockInsertCalls.find(
      (c) => c.table === "webhook_events",
    );
    expect(webhookInsert).toBeDefined();
    expect(webhookInsert!.data).toMatchObject({
      event_type: "subscription_canceled",
    });
  });

  it("should deduplicate events with the same event_id", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["webhook_events"] = { id: "existing-event-id" };

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const response = await POST(
      buildWebhookRequest({
        event: "subscription_created",
        subscription_id: "sub-dup-001",
        customer: { email: MOCK_USER.email },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(true);

    const webhookInserts = mockInsertCalls.filter(
      (c) => c.table === "webhook_events",
    );
    expect(webhookInserts).toHaveLength(0);
  });

  it("should handle subscription_charge_succeeded event", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: MOCK_USER,
      authError: null,
    });
    mockFromResults["webhook_events"] = null;

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const response = await POST(
      buildWebhookRequest({
        event: "subscription_charge_succeeded",
        subscription_id: "sub-charge-001",
        customer: { email: MOCK_USER.email },
        next_charge_at: "2026-06-16T00:00:00Z",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  it("should return 400 when event field is missing", async () => {
    mockSupabaseClient = createMockSupabaseClient({
      user: null,
      authError: null,
    });

    const { POST } = await import(
      "@/app/api/webhooks/caramelou/route"
    );
    const response = await POST(
      buildWebhookRequest({ subscription_id: "sub-no-event" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing event");
  });
});
