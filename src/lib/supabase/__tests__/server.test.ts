import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateServerClient, mockCookieStore } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
  mockCookieStore: {
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { createClient } from "../server";

describe("createClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    mockCookieStore.getAll.mockReturnValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a SupabaseClient instance", async () => {
    // Act
    const client = await createClient();

    // Assert
    expect(client).toBeDefined();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });

  it("should pass cookie handlers to @supabase/ssr createServerClient", async () => {
    // Act
    await createClient();

    // Assert
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

  it("should use cookie store from next/headers", async () => {
    // Arrange
    const testCookies = [{ name: "sb-token", value: "abc123" }];
    mockCookieStore.getAll.mockReturnValue(testCookies);

    // Act
    await createClient();

    // Assert
    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { getAll: () => unknown } };
    const result = options.cookies.getAll();
    expect(result).toEqual(testCookies);
  });
});
