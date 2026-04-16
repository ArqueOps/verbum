// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOrder, mockEq, mockSelect, mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockOrder = vi.fn();
  const mockEq = vi.fn(() => ({ order: mockOrder }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
  return { mockOrder, mockEq, mockSelect, mockFrom, mockCreateClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

import sitemap from "../sitemap";

const BASE_URL = "https://verbum.vercel.app";

const MOCK_STUDIES = [
  { slug: "estudo-genesis-1", updated_at: "2026-04-10T12:00:00Z" },
  { slug: "estudo-salmo-23", updated_at: "2026-04-08T08:30:00Z" },
  { slug: "estudo-joao-3-16", updated_at: "2026-04-05T14:00:00Z" },
];

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockCreateClient.mockReturnValue({ from: mockFrom });
  });

  function setupSupabaseReturn(data: typeof MOCK_STUDIES | null, error: unknown = null) {
    mockOrder.mockResolvedValue({ data, error });
  }

  describe("static pages", () => {
    it("should always include /, /blog, and /pricing", async () => {
      setupSupabaseReturn([]);

      const result = await sitemap();

      const urls = result.map((entry) => entry.url);
      expect(urls).toContain(BASE_URL);
      expect(urls).toContain(`${BASE_URL}/blog`);
      expect(urls).toContain(`${BASE_URL}/pricing`);
    });

    it("should set priority 1.0 for homepage", async () => {
      setupSupabaseReturn([]);

      const result = await sitemap();

      const homepage = result.find((entry) => entry.url === BASE_URL);
      expect(homepage?.priority).toBe(1.0);
    });

    it("should set correct changeFrequency for each static page", async () => {
      setupSupabaseReturn([]);

      const result = await sitemap();

      const homepage = result.find((e) => e.url === BASE_URL);
      const blog = result.find((e) => e.url === `${BASE_URL}/blog`);
      const pricing = result.find((e) => e.url === `${BASE_URL}/pricing`);

      expect(homepage?.changeFrequency).toBe("daily");
      expect(blog?.changeFrequency).toBe("daily");
      expect(pricing?.changeFrequency).toBe("weekly");
    });

    it("should set lastModified as Date for static pages", async () => {
      setupSupabaseReturn([]);

      const result = await sitemap();

      for (const entry of result.slice(0, 3)) {
        expect(entry.lastModified).toBeInstanceOf(Date);
      }
    });
  });

  describe("published studies", () => {
    it("should include URLs for published studies", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      const result = await sitemap();

      const urls = result.map((entry) => entry.url);
      expect(urls).toContain(`${BASE_URL}/estudos/estudo-genesis-1`);
      expect(urls).toContain(`${BASE_URL}/estudos/estudo-salmo-23`);
      expect(urls).toContain(`${BASE_URL}/estudos/estudo-joao-3-16`);
    });

    it("should query Supabase with is_published = true", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      await sitemap();

      expect(mockFrom).toHaveBeenCalledWith("studies");
      expect(mockSelect).toHaveBeenCalledWith("slug, updated_at");
      expect(mockEq).toHaveBeenCalledWith("is_published", true);
    });

    it("should set lastModified from study updated_at", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      const result = await sitemap();

      const studyEntry = result.find((e) => e.url === `${BASE_URL}/estudos/estudo-genesis-1`);
      expect(studyEntry?.lastModified).toEqual(new Date("2026-04-10T12:00:00Z"));
    });

    it("should set priority 0.6 and changeFrequency weekly for studies", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      const result = await sitemap();

      const studyEntries = result.filter((e) => e.url.includes("/estudos/"));
      for (const entry of studyEntries) {
        expect(entry.priority).toBe(0.6);
        expect(entry.changeFrequency).toBe("weekly");
      }
    });

    it("should have required fields on every entry", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      const result = await sitemap();

      for (const entry of result) {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("lastModified");
        expect(entry).toHaveProperty("changeFrequency");
        expect(entry).toHaveProperty("priority");
        expect(typeof entry.url).toBe("string");
        expect(typeof entry.priority).toBe("number");
      }
    });
  });

  describe("unpublished studies excluded", () => {
    it("should not include unpublished studies (filtered by Supabase query)", async () => {
      setupSupabaseReturn([{ slug: "published-only", updated_at: "2026-04-10T00:00:00Z" }]);

      const result = await sitemap();

      const studyUrls = result.filter((e) => e.url.includes("/estudos/"));
      expect(studyUrls).toHaveLength(1);
      expect(studyUrls[0]!.url).toBe(`${BASE_URL}/estudos/published-only`);
    });
  });

  describe("edge cases", () => {
    it("should return only static pages when no published studies exist", async () => {
      setupSupabaseReturn([]);

      const result = await sitemap();

      expect(result).toHaveLength(3);
      const urls = result.map((e) => e.url);
      expect(urls).toContain(BASE_URL);
      expect(urls).toContain(`${BASE_URL}/blog`);
      expect(urls).toContain(`${BASE_URL}/pricing`);
    });

    it("should return only static pages when Supabase returns null data", async () => {
      setupSupabaseReturn(null);

      const result = await sitemap();

      expect(result).toHaveLength(3);
    });

    it("should return only static pages on Supabase error", async () => {
      setupSupabaseReturn(null, { message: "connection error" });

      const result = await sitemap();

      expect(result).toHaveLength(3);
    });

    it("should order studies by updated_at descending", async () => {
      setupSupabaseReturn(MOCK_STUDIES);

      await sitemap();

      expect(mockOrder).toHaveBeenCalledWith("updated_at", { ascending: false });
    });
  });
});
