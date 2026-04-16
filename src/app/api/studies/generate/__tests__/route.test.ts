// @vitest-environment node

/**
 * Integration tests for POST /api/studies/generate (SSE study generation).
 *
 * Verifies:
 *   1. Returns 401 when no auth session
 *   2. Returns 402 when credits_remaining is 0
 *   3. Returns SSE Content-Type header
 *   4. Stream emits 7 section events with valid sectionType values
 *   5. Stream ends with metadata event containing generationTimeMs
 *   6. Supabase insert calls for study and study_sections after completion
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SECTION_TYPES = [
  "introduction",
  "historical_context",
  "exegesis",
  "theological_reflection",
  "cross_references",
  "practical_application",
  "prayer",
] as const;

const MOCK_USER = {
  id: "user-123-test",
  email: "test@verbum.app",
  aud: "authenticated",
};

const MOCK_STUDY_ID = "study-456-test";

// ---------------------------------------------------------------------------
// Mock setup: Supabase
// ---------------------------------------------------------------------------

const mockInsertSelect = vi.fn();
const mockInsert = vi.fn();
const mockSelectSingle = vi.fn();
const mockEqChain = vi.fn();

function createMockSupabaseClient(options: {
  user: typeof MOCK_USER | null;
  authError: Error | null;
  subscription: Record<string, unknown> | null;
}) {
  const mockFrom = vi.fn((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: options.subscription,
                error: null,
              }),
            }),
          }),
        }),
      };
    }

    if (table === "studies") {
      return {
        insert: mockInsertSelect.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: MOCK_STUDY_ID },
              error: null,
            }),
          }),
        }),
      };
    }

    if (table === "study_sections") {
      return {
        insert: mockInsert.mockResolvedValue({ data: null, error: null }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        eq: mockEqChain.mockReturnValue({
          single: mockSelectSingle.mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.authError,
      }),
    },
    from: mockFrom,
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
// Mock setup: OpenAI (global fetch)
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;

function mockOpenAiFetch() {
  let callCount = 0;

  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("api.openai.com")) {
      const sectionType = VALID_SECTION_TYPES[callCount % VALID_SECTION_TYPES.length];
      callCount++;

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: `Title for ${sectionType}`,
                  content: `Generated content for ${sectionType} section.`,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return originalFetch(input as RequestInfo, undefined);
  }) as Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/studies/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readSSEStream(
  response: Response,
): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  const events: Array<Record<string, unknown>> = [];

  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6);
      events.push(JSON.parse(jsonStr));
    }
  }

  return events;
}

function createActiveSubscription(creditsLimit: number) {
  return {
    id: "sub-789",
    user_id: MOCK_USER.id,
    status: "active",
    plan_id: "plan-100",
    plans: {
      id: "plan-100",
      name: "Premium",
      slug: "premium",
      price: 29.9,
      is_active: true,
      features: { study_limit: creditsLimit },
    },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/studies/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
    mockInsertSelect.mockClear();
    mockInsert.mockClear();
  });

  // =========================================================================
  // 1. Authentication — 401
  // =========================================================================

  describe("Authentication", () => {
    it("should return 401 when no auth session exists", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: null,
        authError: new Error("No session"),
        subscription: null,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ verseReference: "John 3:16" });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when auth returns no user", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: null,
        authError: null,
        subscription: null,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ verseReference: "Psalm 23:1" });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. Credits — 402
  // =========================================================================

  describe("Credits validation", () => {
    it("should return 402 when credits_remaining is 0", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(0),
      });

      const { POST } = await import("../route");
      const request = buildRequest({ verseReference: "Romans 8:28" });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      expect(response.status).toBe(402);

      const body = await response.json();
      expect(body.credits_remaining).toBe(0);
    });

    it("should return 402 when user has no subscription", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: null,
      });

      const { POST } = await import("../route");
      const request = buildRequest({ verseReference: "Genesis 1:1" });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      expect(response.status).toBe(402);
    });
  });

  // =========================================================================
  // 3. SSE Content-Type header
  // =========================================================================

  describe("SSE streaming", () => {
    it("should return text/event-stream Content-Type header", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(10),
      });
      mockOpenAiFetch();

      const { POST } = await import("../route");
      const request = buildRequest({
        verseReference: "John 3:16",
        language: "pt-BR",
      });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");

      // Consume the stream to avoid hanging
      await response.text();
    });

    // =========================================================================
    // 4. Seven section events with valid sectionType
    // =========================================================================

    it("should emit 7 section events with valid sectionType values", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(10),
      });
      mockOpenAiFetch();

      const { POST } = await import("../route");
      const request = buildRequest({
        verseReference: "Philippians 4:13",
        language: "pt-BR",
      });
      const response = await POST(request as unknown as import("next/server").NextRequest);
      const events = await readSSEStream(response);

      const sectionEvents = events.filter((e) => e.type === "section");

      expect(sectionEvents).toHaveLength(7);

      const emittedTypes = sectionEvents.map((e) => e.sectionType);
      for (const sectionType of VALID_SECTION_TYPES) {
        expect(emittedTypes).toContain(sectionType);
      }

      for (const event of sectionEvents) {
        expect(event.title).toBeDefined();
        expect(typeof event.title).toBe("string");
        expect(event.content).toBeDefined();
        expect(typeof event.content).toBe("string");
        expect(event.position).toBeDefined();
        expect(typeof event.position).toBe("number");
      }
    });

    // =========================================================================
    // 5. Metadata event with generationTimeMs
    // =========================================================================

    it("should end with metadata event containing generationTimeMs", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(10),
      });
      mockOpenAiFetch();

      const { POST } = await import("../route");
      const request = buildRequest({
        verseReference: "Psalm 119:105",
        language: "pt-BR",
      });
      const response = await POST(request as unknown as import("next/server").NextRequest);
      const events = await readSSEStream(response);

      const metadataEvent = events.find((e) => e.type === "metadata");

      expect(metadataEvent).toBeDefined();
      expect(metadataEvent!.generationTimeMs).toBeDefined();
      expect(typeof metadataEvent!.generationTimeMs).toBe("number");
      expect((metadataEvent!.generationTimeMs as number)).toBeGreaterThanOrEqual(0);
      expect(metadataEvent!.studyId).toBe(MOCK_STUDY_ID);

      // Metadata should be the last event
      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.type).toBe("metadata");
    });
  });

  // =========================================================================
  // 6. Database inserts — study and study_sections
  // =========================================================================

  describe("Database persistence", () => {
    it("should insert study and study_sections after stream completes", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(10),
      });
      mockOpenAiFetch();

      const { POST } = await import("../route");
      const request = buildRequest({
        verseReference: "Matthew 5:1-12",
        language: "pt-BR",
      });
      const response = await POST(request as unknown as import("next/server").NextRequest);

      // Must consume stream to trigger all inserts
      await response.text();

      // Verify study insert was called
      expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      const studyInsertCall = mockInsertSelect.mock.calls[0]![0];
      expect(studyInsertCall).toMatchObject({
        title: expect.stringContaining("Matthew 5:1-12"),
        verse_reference: "Matthew 5:1-12",
        model_used: "gpt-5.4",
        language: "pt-BR",
        owner_id: MOCK_USER.id,
      });
      expect(studyInsertCall.slug).toBeDefined();
      expect(studyInsertCall.content).toBeDefined();

      // Verify study_sections insert was called with 7 sections
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const sectionsInsertCall = mockInsert.mock.calls[0]![0];
      expect(sectionsInsertCall).toHaveLength(7);

      for (let i = 0; i < 7; i++) {
        expect(sectionsInsertCall[i]).toMatchObject({
          study_id: MOCK_STUDY_ID,
          title: expect.any(String),
          content: expect.any(String),
          position: i + 1,
        });
      }
    });

    it("should set owner_id to the authenticated user", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: MOCK_USER,
        authError: null,
        subscription: createActiveSubscription(10),
      });
      mockOpenAiFetch();

      const { POST } = await import("../route");
      const request = buildRequest({ verseReference: "Isaiah 40:31" });
      const response = await POST(request as unknown as import("next/server").NextRequest);
      await response.text();

      const studyInsertCall = mockInsertSelect.mock.calls[0]![0];
      expect(studyInsertCall.owner_id).toBe(MOCK_USER.id);
    });
  });
});
