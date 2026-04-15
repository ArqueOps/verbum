import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSupabaseConfig } from "../env";

describe("getSupabaseConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return url and anonKey when both env vars are set", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Act
    const config = getSupabaseConfig();

    // Assert
    expect(config).toEqual({
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
    });
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Act & Assert
    expect(() => getSupabaseConfig()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Act & Assert
    expect(() => getSupabaseConfig()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });

  it("should throw when both env vars are missing", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Act & Assert
    expect(() => getSupabaseConfig()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is empty string", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Act & Assert
    expect(() => getSupabaseConfig()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty string", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

    // Act & Assert
    expect(() => getSupabaseConfig()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });
});
