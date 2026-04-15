import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateServerClient } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

import { createServerClient } from "../server";

describe("createServerClient", () => {
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

  it("should return a SupabaseClient instance", () => {
    // Arrange
    const cookies = {
      getAll: vi.fn().mockReturnValue([]),
      setAll: vi.fn(),
    };

    // Act
    const client = createServerClient(cookies);

    // Assert
    expect(client).toBeDefined();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });

  it("should pass cookie handlers to @supabase/ssr createServerClient", () => {
    // Arrange
    const getAll = vi.fn().mockReturnValue([]);
    const setAll = vi.fn();
    const cookies = { getAll, setAll };

    // Act
    createServerClient(cookies);

    // Assert
    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      { cookies: { getAll, setAll } }
    );
  });

  it("should support optional setAll (read-only pages/components)", () => {
    // Arrange
    const getAll = vi.fn().mockReturnValue([]);
    const cookies = { getAll };

    // Act
    createServerClient(cookies);

    // Assert
    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    const callArgs = mockCreateServerClient.mock.calls[0] as unknown[];
    const options = callArgs[2] as { cookies: { getAll: unknown; setAll?: unknown } };
    expect(options.cookies.getAll).toBe(getAll);
    expect(options.cookies.setAll).toBeUndefined();
  });

  it("should propagate env validation errors when url is missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cookies = {
      getAll: vi.fn().mockReturnValue([]),
    };

    // Act & Assert
    expect(() => createServerClient(cookies)).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should propagate env validation errors when anon key is missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const cookies = {
      getAll: vi.fn().mockReturnValue([]),
    };

    // Act & Assert
    expect(() => createServerClient(cookies)).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });
});
