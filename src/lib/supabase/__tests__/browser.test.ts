import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
}));

import { createBrowserClient as ssrCreateBrowserClient } from "@supabase/ssr";
import { createBrowserClient } from "../browser";

describe("createBrowserClient", () => {
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
    // Act
    const client = createBrowserClient();

    // Assert
    expect(client).toBeDefined();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });

  it("should call @supabase/ssr createBrowserClient with correct url and key", () => {
    // Act
    createBrowserClient();

    // Assert
    expect(ssrCreateBrowserClient).toHaveBeenCalledOnce();
    expect(ssrCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
  });

  it("should propagate env validation errors when url is missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Act & Assert
    expect(() => createBrowserClient()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should propagate env validation errors when anon key is missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Act & Assert
    expect(() => createBrowserClient()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });
});
