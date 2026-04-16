// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockSingle = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(
      _element: React.ReactElement,
      options?: { width?: number; height?: number; headers?: Record<string, string> },
    ) {
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      ]);

      super(pngHeader, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          ...options?.headers,
        },
      });
    }
  },
}));

import { GET } from "@/app/api/og/[slug]/route";

function createRequest(slug: string): Request {
  return new Request(`http://localhost:3000/api/og/${slug}`);
}

function setupSupabaseChain(data: unknown) {
  mockSingle.mockResolvedValue({ data, error: data ? null : { message: "Not found" } });
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

describe("GET /api/og/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  describe("Valid study slug", () => {
    it("should return 200 with image/png content-type", async () => {
      setupSupabaseChain({
        title: "O Sermão do Monte",
        verse_reference: "Mateus 5:1-12",
      });

      const response = await GET(createRequest("o-sermao-do-monte"), {
        params: Promise.resolve({ slug: "o-sermao-do-monte" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("should return non-empty binary data in response body", async () => {
      setupSupabaseChain({
        title: "O Sermão do Monte",
        verse_reference: "Mateus 5:1-12",
      });

      const response = await GET(createRequest("o-sermao-do-monte"), {
        params: Promise.resolve({ slug: "o-sermao-do-monte" }),
      });

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4e);
      expect(bytes[3]).toBe(0x47);
    });

    it("should include cache headers with s-maxage", async () => {
      setupSupabaseChain({
        title: "O Sermão do Monte",
        verse_reference: "Mateus 5:1-12",
      });

      const response = await GET(createRequest("o-sermao-do-monte"), {
        params: Promise.resolve({ slug: "o-sermao-do-monte" }),
      });

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("s-maxage=86400");
      expect(cacheControl).toContain("stale-while-revalidate=604800");
    });

    it("should query Supabase with correct slug and is_published filter", async () => {
      setupSupabaseChain({
        title: "Test",
        verse_reference: "Genesis 1:1",
      });

      await GET(createRequest("test-slug"), {
        params: Promise.resolve({ slug: "test-slug" }),
      });

      expect(mockFrom).toHaveBeenCalledWith("studies");
      expect(mockSelect).toHaveBeenCalledWith("title, verse_reference");
      expect(mockEq).toHaveBeenCalledWith("slug", "test-slug");
      expect(mockEq).toHaveBeenCalledWith("is_published", true);
    });
  });

  describe("Non-existent slug (fallback image)", () => {
    it("should return 200 with fallback image for unknown slug", async () => {
      setupSupabaseChain(null);

      const response = await GET(createRequest("non-existent-study"), {
        params: Promise.resolve({ slug: "non-existent-study" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("should return non-empty binary data for fallback image", async () => {
      setupSupabaseChain(null);

      const response = await GET(createRequest("non-existent-study"), {
        params: Promise.resolve({ slug: "non-existent-study" }),
      });

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should include cache headers on fallback image", async () => {
      setupSupabaseChain(null);

      const response = await GET(createRequest("non-existent-study"), {
        params: Promise.resolve({ slug: "non-existent-study" }),
      });

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("s-maxage=86400");
    });
  });

  describe("Missing Supabase configuration", () => {
    it("should return fallback image when env vars are missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await GET(createRequest("any-slug"), {
        params: Promise.resolve({ slug: "any-slug" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
    });
  });
});
