/**
 * Integration tests for POST /api/generate-study route handler.
 *
 * Tests the route handler directly by importing it and calling with
 * mock Request objects. All external dependencies (Supabase auth,
 * Supabase DB queries, OpenAI, Bible API) are mocked at module level.
 *
 * Covers:
 *   1. Auth: 401 for unauthenticated requests
 *   2. Credits: 403 when no credits and no active subscription
 *   3. Success: SSE stream with study data when credits > 0
 *   4. Subscription override: proceeds when subscription active + credits = 0
 *   5. Validation: 400 for missing book_id
 *   6. Validation: 400 for chapter as string
 *   7. Fallback: Bible API failure still generates study
 *   8. Error: OpenAI parse failure on both attempts returns error, credits NOT decremented
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Import the route handler under test
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/generate-study/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/generate-study", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readSSEStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (part.trim()) events.push(part.trim());
    }
  }

  if (buffer.trim()) events.push(buffer.trim());
  return events;
}

function parseSSEEvent(raw: string): { event: string; data: unknown } {
  const lines = raw.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) event = line.slice(7);
    if (line.startsWith("data: ")) data = line.slice(6);
  }

  return { event, data: JSON.parse(data) };
}

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function mockSupabaseChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    update: vi.fn().mockReturnThis(),
  };
  return chain;
}

function setupAuthenticatedUser(userId = "user-123") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

function setupProfileAndSubscription(
  options: {
    creditsRemaining?: number;
    hasActiveSubscription?: boolean;
    userId?: string;
  } = {},
) {
  const {
    creditsRemaining = 5,
    hasActiveSubscription = false,
  } = options;

  const profileChain = mockSupabaseChain({
    data: { credits_remaining: creditsRemaining },
    error: null,
  });

  const subscriptionChain = mockSupabaseChain({
    data: hasActiveSubscription ? { status: "active" } : null,
    error: null,
  });

  const updateChain = mockSupabaseChain({ data: null, error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      // Determine if this is a select or update call by checking subsequent calls
      return {
        select: vi.fn().mockReturnValue(profileChain),
        update: vi.fn().mockReturnValue(updateChain),
      };
    }
    if (table === "subscriptions") {
      return { select: vi.fn().mockReturnValue(subscriptionChain) };
    }
    return mockSupabaseChain({ data: null, error: null });
  });

  return { profileChain, subscriptionChain, updateChain };
}

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockGlobalFetch(options: {
  bibleApiResponse?: { ok: boolean; data?: unknown; error?: boolean };
  openAiResponse?: {
    ok: boolean;
    data?: unknown;
    failParse?: boolean;
    callCount?: number;
  };
}) {
  const {
    bibleApiResponse = { ok: true, data: { verses: [{ number: 1, text: "In the beginning..." }] } },
    openAiResponse = {
      ok: true,
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              title: "Test Study",
              content: "# Study Content",
              verse_reference: "Genesis 1",
              sections: [{ title: "Introduction", content: "Study intro" }],
            }),
          },
        }],
      },
    },
  } = options;

  let openAiCallCount = 0;

  globalThis.fetch = vi.fn(async (url: string | URL | RequestInfo) => {
    const urlStr = typeof url === "string" ? url : url.toString();

    if (urlStr.includes("abibliadigital")) {
      if (bibleApiResponse.error) {
        throw new Error("Bible API network error");
      }
      return new Response(JSON.stringify(bibleApiResponse.data), {
        status: bibleApiResponse.ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("openai.com")) {
      openAiCallCount++;
      if (!openAiResponse.ok) {
        return new Response("Internal Server Error", { status: 500 });
      }

      if (openAiResponse.failParse) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "not valid json {{{" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify(openAiResponse.data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(url as RequestInfo, undefined);
  }) as typeof fetch;

  return { getOpenAiCallCount: () => openAiCallCount };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/generate-study", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  // =========================================================================
  // 1. Unauthenticated → 401
  // =========================================================================

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      setupUnauthenticated();

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when getUser returns null user without error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. No credits + no subscription → 403
  // =========================================================================

  describe("Credits and subscription check", () => {
    it("should return 403 when credits_remaining=0 and no active subscription", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({
        creditsRemaining: 0,
        hasActiveSubscription: false,
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("No credits");
    });
  });

  // =========================================================================
  // 3. Authenticated with credits > 0 → SSE stream
  // =========================================================================

  describe("Successful generation with credits", () => {
    it("should return SSE stream with study data when user has credits", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({ creditsRemaining: 3 });
      mockGlobalFetch({});

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);

      // Should have data events (fetching_passage, generating_study) and a done event
      const dataEvents = parsed.filter((e) => e.event === "data");
      const doneEvents = parsed.filter((e) => e.event === "done");

      expect(dataEvents.length).toBeGreaterThanOrEqual(2);
      expect(doneEvents).toHaveLength(1);

      const doneData = doneEvents[0]!.data as { study: Record<string, unknown> };
      expect(doneData.study).toBeDefined();
      expect(doneData.study.title).toBe("Test Study");
    });

    it("should set correct SSE headers", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({ creditsRemaining: 1 });
      mockGlobalFetch({});

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");

      // Consume the stream to prevent hanging
      await readSSEStream(response);
    });
  });

  // =========================================================================
  // 4. Active subscription overrides credits = 0
  // =========================================================================

  describe("Subscription override", () => {
    it("should proceed when user has active subscription but credits=0", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({
        creditsRemaining: 0,
        hasActiveSubscription: true,
      });
      mockGlobalFetch({});

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const doneEvents = parsed.filter((e) => e.event === "done");

      expect(doneEvents).toHaveLength(1);
    });
  });

  // =========================================================================
  // 5. Missing book_id → 400 with Zod error details
  // =========================================================================

  describe("Input validation", () => {
    it("should return 400 when book_id is missing", async () => {
      setupAuthenticatedUser();

      const request = createRequest({ chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid input");
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThan(0);

      const bookIdIssue = body.details.find(
        (d: { path?: unknown[] }) =>
          Array.isArray(d.path) && d.path.includes("book_id"),
      );
      expect(bookIdIssue).toBeDefined();
    });

    // =========================================================================
    // 6. Chapter as string → 400 with Zod error details
    // =========================================================================

    it("should return 400 when chapter is a string instead of number", async () => {
      setupAuthenticatedUser();

      const request = createRequest({ book_id: 1, chapter: "three" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid input");
      expect(body.details).toBeDefined();
      expect(body.details.length).toBeGreaterThan(0);
    });

    it("should return 400 for completely invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/generate-study",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not json at all",
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. Bible API failure → study still generates
  // =========================================================================

  describe("Bible API fallback", () => {
    it("should generate study even when Bible API returns error status", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({ creditsRemaining: 5 });
      mockGlobalFetch({
        bibleApiResponse: { ok: false, data: { error: "Not found" } },
      });

      const request = createRequest({ book_id: 99, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const doneEvents = parsed.filter((e) => e.event === "done");

      expect(doneEvents).toHaveLength(1);
      const doneData = doneEvents[0]!.data as { study: Record<string, unknown> };
      expect(doneData.study).toBeDefined();
    });

    it("should generate study even when Bible API throws network error", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({ creditsRemaining: 5 });
      mockGlobalFetch({
        bibleApiResponse: { ok: false, error: true },
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const doneEvents = parsed.filter((e) => e.event === "done");
      const errorEvents = parsed.filter((e) => e.event === "error");

      expect(doneEvents).toHaveLength(1);
      expect(errorEvents).toHaveLength(0);
    });
  });

  // =========================================================================
  // 8. OpenAI parse failure on both attempts → error, credits NOT decremented
  // =========================================================================

  describe("OpenAI failure handling", () => {
    it("should return error event when OpenAI fails to parse on both attempts", async () => {
      setupAuthenticatedUser("user-no-decrement");
      const { updateChain } = setupProfileAndSubscription({
        creditsRemaining: 5,
      });
      const { getOpenAiCallCount } = mockGlobalFetch({
        openAiResponse: { ok: true, failParse: true },
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const errorEvents = parsed.filter((e) => e.event === "error");
      const doneEvents = parsed.filter((e) => e.event === "done");

      expect(errorEvents).toHaveLength(1);
      expect(doneEvents).toHaveLength(0);

      const errorData = errorEvents[0]!.data as { error: string };
      expect(errorData.error).toContain("Failed to generate study");

      // Verify credits were NOT decremented
      expect(updateChain.eq).not.toHaveBeenCalled();

      // OpenAI should have been called exactly 2 times (initial + 1 retry)
      expect(getOpenAiCallCount()).toBe(2);
    });

    it("should return error event when OpenAI API returns 500 on both attempts", async () => {
      setupAuthenticatedUser();
      const { updateChain } = setupProfileAndSubscription({
        creditsRemaining: 5,
      });
      mockGlobalFetch({
        openAiResponse: { ok: false },
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const errorEvents = parsed.filter((e) => e.event === "error");

      expect(errorEvents).toHaveLength(1);
      expect(updateChain.eq).not.toHaveBeenCalled();
    });

    it("should include retry status events before final error", async () => {
      setupAuthenticatedUser();
      setupProfileAndSubscription({ creditsRemaining: 5 });
      mockGlobalFetch({
        openAiResponse: { ok: true, failParse: true },
      });

      const request = createRequest({ book_id: 1, chapter: 1 });
      const response = await POST(request);

      const events = await readSSEStream(response);
      const parsed = events.map(parseSSEEvent);
      const retryEvents = parsed.filter(
        (e) =>
          e.event === "data" &&
          (e.data as Record<string, unknown>).status === "retrying",
      );

      // Should have at least 1 retry event (after first failed attempt)
      expect(retryEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
