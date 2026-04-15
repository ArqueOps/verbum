/**
 * Integration tests for the OAuth callback flow.
 *
 * Unlike unit tests that mock `@/lib/supabase/server` at the function level,
 * these tests let the real `createServerClient` from `@supabase/ssr` run and
 * only intercept at the HTTP transport level (globalThis.fetch). This verifies:
 *
 *   1. The route handler processes the `code` query parameter
 *   2. The Supabase client reads the PKCE code verifier from cookies
 *   3. The token exchange HTTP call is made with correct payload
 *   4. Session cookies are set after successful exchange
 *   5. Redirect behavior for success (/dashboard) and failure (/login)
 *
 * Uses a fake Supabase URL + anon key to avoid hitting real services.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Fake Supabase config ────────────────────────────────────────────
const FAKE_SUPABASE_URL = "https://fake-project.supabase.co";
const FAKE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2UtcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.fake-signature-for-testing";

// ─── Mock cookie store ───────────────────────────────────────────────
// Simulates Next.js `cookies()` from `next/headers` so the real
// `createServerClient` can read/write cookies during the flow.
const cookieJar = new Map<string, { name: string; value: string; options?: Record<string, unknown> }>();

function buildMockCookieStore() {
  return {
    getAll: () => Array.from(cookieJar.values()).map(({ name, value }) => ({ name, value })),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieJar.set(name, { name, value, options });
    },
    get: (name: string) => {
      const c = cookieJar.get(name);
      return c ? { name: c.name, value: c.value } : undefined;
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  };
}

// Mock `next/headers` before any import that depends on it
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => buildMockCookieStore()),
}));

// Set env vars before importing the route handler
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", FAKE_SUPABASE_URL);
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", FAKE_ANON_KEY);

// Import the route handler AFTER mocks are in place
import { GET } from "@/app/auth/callback/route";

// ─── Helpers ─────────────────────────────────────────────────────────

/** Build a fake successful token exchange response matching Supabase GoTrue shape */
function buildTokenResponse() {
  return {
    access_token: "fake-access-token-" + Date.now(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token-" + Date.now(),
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      aud: "authenticated",
      role: "authenticated",
      email: "test@verbum.app",
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: "Test User" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/** Seed the cookie jar with a PKCE code verifier (required for token exchange) */
function seedCodeVerifier(verifier = "test-code-verifier-abc123") {
  const storageKey = "sb-fake-project-auth-token-code-verifier";
  cookieJar.set(storageKey, {
    name: storageKey,
    value: verifier,
  });
}

// ─── Fetch interceptor ──────────────────────────────────────────────
let originalFetch: typeof globalThis.fetch;
let fetchInterceptor: ((url: string | URL | Request, init?: RequestInit) => Response | Promise<Response>) | null;

function interceptFetch(handler: (url: string | URL | Request, init?: RequestInit) => Response | Promise<Response>) {
  fetchInterceptor = handler;
}

beforeEach(() => {
  cookieJar.clear();
  fetchInterceptor = null;

  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (fetchInterceptor && url.startsWith(FAKE_SUPABASE_URL)) {
      const result = await fetchInterceptor(input, init);
      return result;
    }

    // Fallback: return 404 for any unhandled Supabase call
    if (url.startsWith(FAKE_SUPABASE_URL)) {
      return new Response(JSON.stringify({ error: "unhandled" }), { status: 404 });
    }

    return originalFetch(input, init);
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cookieJar.clear();
});

// ─── Tests ───────────────────────────────────────────────────────────

describe("OAuth callback integration — /auth/callback", () => {
  describe("successful code exchange", () => {
    it("should exchange code via PKCE token endpoint and redirect to /dashboard", async () => {
      seedCodeVerifier();

      let capturedBody: Record<string, unknown> | null = null;

      interceptFetch(async (_url, init) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          // Capture the request body for assertions
          const bodyText = typeof init?.body === "string" ? init.body : "";
          capturedBody = JSON.parse(bodyText);

          return new Response(JSON.stringify(buildTokenResponse()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Handle session retrieval calls (getUser, etc.)
        return new Response(JSON.stringify({ data: { user: null } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=oauth-auth-code-123");
      const response = await GET(request);

      // Verify redirect to /dashboard
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/dashboard");
      expect(location.origin).toBe("http://localhost:3000");

      // Verify the PKCE token exchange was called with correct payload
      expect(capturedBody).toBeTruthy();
      expect(capturedBody!.auth_code).toBe("oauth-auth-code-123");
      expect(capturedBody!.code_verifier).toBe("test-code-verifier-abc123");
    });

    it("should set session cookies after successful exchange", async () => {
      seedCodeVerifier();

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(JSON.stringify(buildTokenResponse()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
      await GET(request);

      // After successful exchange, the Supabase client writes session data
      // to cookies via the setAll callback. Verify session-related cookies exist.
      const cookieNames = Array.from(cookieJar.keys());
      const hasAuthCookie = cookieNames.some(
        (name) => name.includes("auth-token") && !name.includes("code-verifier")
      );
      expect(hasAuthCookie).toBe(true);
    });

    it("should preserve origin in redirect URL", async () => {
      seedCodeVerifier();

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(JSON.stringify(buildTokenResponse()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("https://verbum.vercel.app/auth/callback?code=abc");
      const response = await GET(request);

      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://verbum.vercel.app");
      expect(location.pathname).toBe("/dashboard");
    });
  });

  describe("missing code parameter", () => {
    it("should redirect to /login with error=missing_code when code is absent", async () => {
      const request = new Request("http://localhost:3000/auth/callback");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("missing_code");
    });

    it("should not make any HTTP calls to Supabase when code is missing", async () => {
      let supabaseCalled = false;

      interceptFetch(async () => {
        supabaseCalled = true;
        return new Response("{}", { status: 200 });
      });

      const request = new Request("http://localhost:3000/auth/callback");
      await GET(request);

      expect(supabaseCalled).toBe(false);
    });
  });

  describe("token exchange failure", () => {
    it("should redirect to /login with error when token exchange returns error", async () => {
      seedCodeVerifier();

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Invalid authorization code",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=expired-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("auth_callback_error");
    });

    it("should redirect to /login when token exchange returns 500", async () => {
      seedCodeVerifier();

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({ error: "server_error", error_description: "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=some-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("auth_callback_error");
    });

    it("should preserve origin on failure redirect", async () => {
      seedCodeVerifier();

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({ error: "invalid_grant", error_description: "Expired" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("https://verbum.vercel.app/auth/callback?code=bad");
      const response = await GET(request);

      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://verbum.vercel.app");
      expect(location.pathname).toBe("/login");
    });
  });

  describe("PKCE code verifier handling", () => {
    it("should handle missing code verifier gracefully (redirect to login)", async () => {
      // Do NOT seed code verifier — simulates corrupted/missing PKCE state
      // Supabase PKCE flow throws AuthPKCECodeVerifierMissingError when verifier is missing

      interceptFetch(async () => {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
      const response = await GET(request);

      // Without a code verifier, exchangeCodeForSession returns an error
      // and the route should redirect to /login
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("auth_callback_error");
    });

    it("should remove code verifier cookie after exchange", async () => {
      const verifierKey = "sb-fake-project-auth-token-code-verifier";
      seedCodeVerifier();

      // Verify verifier exists before exchange
      expect(cookieJar.has(verifierKey)).toBe(true);

      interceptFetch(async (_url) => {
        const urlStr = typeof _url === "string" ? _url : _url instanceof URL ? _url.toString() : _url.url;

        if (urlStr.includes("/auth/v1/token")) {
          return new Response(JSON.stringify(buildTokenResponse()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new Request("http://localhost:3000/auth/callback?code=code-123");
      await GET(request);

      // After exchange, the Supabase client should have cleared or overwritten
      // the code verifier (it calls removeItem on the storage key).
      // The cookie may be set to empty or deleted entirely.
      const verifierCookie = cookieJar.get(verifierKey);
      const verifierCleared = !verifierCookie || verifierCookie.value === "" || verifierCookie.value === "null";
      expect(verifierCleared).toBe(true);
    });
  });
});
