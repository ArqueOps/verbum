import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateServerClient, mockCookies } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
  mockCookies: vi.fn(() => ({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

import { createClient } from "../server";

describe("createClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
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

  it("should call cookies() from next/headers", async () => {
    await createClient();

    expect(mockCookies).toHaveBeenCalledOnce();
  });

  it("should pass cookie handlers to @supabase/ssr createServerClient", async () => {
    const mockGetAll = vi.fn().mockReturnValue([]);
    const mockSet = vi.fn();
    mockCookies.mockReturnValueOnce({ getAll: mockGetAll, set: mockSet });

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

  it("should use cookieStore.getAll in the getAll handler", async () => {
    const mockGetAll = vi.fn().mockReturnValue([{ name: "sb", value: "token" }]);
    mockCookies.mockReturnValueOnce({ getAll: mockGetAll, set: vi.fn() });

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { getAll: () => unknown } };
    const result = options.cookies.getAll();

    expect(mockGetAll).toHaveBeenCalled();
    expect(result).toEqual([{ name: "sb", value: "token" }]);
  });

  it("should use cookieStore.set in the setAll handler", async () => {
    const mockSet = vi.fn();
    mockCookies.mockReturnValueOnce({ getAll: vi.fn().mockReturnValue([]), set: mockSet });

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void } };
    options.cookies.setAll([
      { name: "sb-token", value: "abc123", options: { path: "/" } },
    ]);

    expect(mockSet).toHaveBeenCalledWith("sb-token", "abc123", { path: "/" });
  });
});
