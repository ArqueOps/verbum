import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateServerClient, mockCookies } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
  mockCookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

import { createServerSupabaseClient as createClient } from "../server";

describe("createClient (server)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    mockCookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a SupabaseClient instance", async () => {
    const client = await createClient();

    expect(client).toBeDefined();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });

  it("should pass cookie handlers to @supabase/ssr createServerClient", async () => {
    const getAll = vi.fn().mockReturnValue([]);
    const set = vi.fn();
    mockCookies.mockResolvedValue({ getAll, set });

    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("should wire getAll to the cookie store", async () => {
    const mockCookieList = [{ name: "session", value: "abc123" }];
    const getAll = vi.fn().mockReturnValue(mockCookieList);
    mockCookies.mockResolvedValue({ getAll, set: vi.fn() });

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { getAll: () => unknown } };
    expect(options.cookies.getAll()).toEqual(mockCookieList);
  });

  it("should handle setAll calling cookieStore.set for each cookie", async () => {
    const set = vi.fn();
    mockCookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set,
    });

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as {
      cookies: {
        setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
      };
    };
    options.cookies.setAll([
      { name: "a", value: "1", options: { path: "/" } },
      { name: "b", value: "2" },
    ]);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith("a", "1", { path: "/" });
    expect(set).toHaveBeenCalledWith("b", "2", undefined);
  });

  it("should not throw when setAll is called from a Server Component", async () => {
    const set = vi.fn().mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    mockCookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set,
    });

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as {
      cookies: {
        setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
      };
    };
    expect(() => {
      options.cookies.setAll([{ name: "a", value: "1" }]);
    }).not.toThrow();
  });
});
