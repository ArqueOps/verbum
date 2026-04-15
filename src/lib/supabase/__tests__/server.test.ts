import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
};

const { mockCreateServerClient } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
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
    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    expect(callArgs[0]).toBe("https://test.supabase.co");
    expect(callArgs[1]).toBe("test-anon-key");
    const options = callArgs[2] as { cookies: { getAll: unknown; setAll: unknown } };
    expect(options.cookies.getAll).toBeTypeOf("function");
    expect(options.cookies.setAll).toBeTypeOf("function");
  });

  it("should use cookie store from next/headers", async () => {
    // Arrange
    const testCookies = [{ name: "sb-token", value: "abc123" }];
    mockCookieStore.getAll.mockReturnValue(testCookies);

    // Act
    await createClient();

    // Assert
    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { getAll: () => unknown; setAll: unknown } };
    const result = options.cookies.getAll();
    expect(result).toEqual(testCookies);
  });
});
