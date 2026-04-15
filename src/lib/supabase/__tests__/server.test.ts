import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateServerClient, mockCookies } = vi.hoisted(() => {
  const mockCookieStore = {
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  };
  return {
    mockCreateServerClient: vi.fn(() => ({
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    })),
    mockCookies: vi.fn().mockResolvedValue(mockCookieStore),
  };
});

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

  it("should use env variables for Supabase URL and anon key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://custom.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "custom-key";

    await createClient();

    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    expect(callArgs[0]).toBe("https://custom.supabase.co");
    expect(callArgs[1]).toBe("custom-key");
  });
});
