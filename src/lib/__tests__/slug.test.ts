import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { generateStudySlug } from "../slug";

type BookRow = Database["public"]["Tables"]["bible_books"]["Row"];

function makeBook(overrides: Partial<BookRow> & Pick<BookRow, "name" | "abbreviation">): BookRow {
  return {
    id: crypto.randomUUID(),
    position: 1,
    testament: "OT",
    total_chapters: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const defaultBooks: BookRow[] = [
  makeBook({ name: "Gênesis", abbreviation: "Gn", position: 1 }),
  makeBook({ name: "Êxodo", abbreviation: "Êx", position: 2 }),
  makeBook({ name: "João", abbreviation: "Jo", position: 43 }),
  makeBook({ name: "Salmos", abbreviation: "Sl", position: 19 }),
  makeBook({ name: "Apocalipse", abbreviation: "Ap", position: 66 }),
  makeBook({ name: "1 Coríntios", abbreviation: "1Co", position: 46 }),
  makeBook({ name: "2 Crônicas", abbreviation: "2Cr", position: 14 }),
];

function createMockSupabase(existingSlugs: string[] = []) {
  const like = vi.fn().mockResolvedValue({
    data: existingSlugs.map((slug) => ({ slug })),
    error: null,
  });
  const select = vi.fn(() => ({ like }));
  const from = vi.fn(() => ({ select }));

  return { from, select, like } as unknown as SupabaseClient<Database> & {
    select: ReturnType<typeof vi.fn>;
    like: ReturnType<typeof vi.fn>;
  };
}

function createErrorSupabase() {
  const like = vi.fn().mockResolvedValue({
    data: null,
    error: { message: "connection refused" },
  });
  const select = vi.fn(() => ({ like }));
  const from = vi.fn(() => ({ select }));

  return { from } as unknown as SupabaseClient<Database>;
}

describe("generateStudySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("standard multi-verse reference", () => {
    it("should generate slug for Gn 1:1-3", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo");
    });

    it("should generate slug for 1Co 15:1-4", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("1Co 15:1-4", defaultBooks, supabase);
      expect(result).toBe("1-corintios-15-1-4-estudo");
    });

    it("should generate slug for 2Cr 7:14-16", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("2Cr 7:14-16", defaultBooks, supabase);
      expect(result).toBe("2-cronicas-7-14-16-estudo");
    });
  });

  describe("single-verse reference", () => {
    it("should generate slug for Jo 3:16 (single verse)", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Jo 3:16", defaultBooks, supabase);
      expect(result).toBe("joao-3-16-estudo");
    });

    it("should generate slug for Sl 23:1 (single verse)", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Sl 23:1", defaultBooks, supabase);
      expect(result).toBe("salmos-23-1-estudo");
    });

    it("should generate slug for Ap 1:1 (single verse)", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Ap 1:1", defaultBooks, supabase);
      expect(result).toBe("apocalipse-1-1-estudo");
    });
  });

  describe("accent normalization in book names", () => {
    it("should remove accent from Gênesis", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Gn 1:1", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-estudo");
      expect(result).not.toMatch(/[àáâãäåèéêëìíîïòóôõöùúûüýÿçñ]/);
    });

    it("should remove accent from Êxodo", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Êx 3:1-5", defaultBooks, supabase);
      expect(result).toBe("exodo-3-1-5-estudo");
    });

    it("should remove accent from João", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Jo 1:1", defaultBooks, supabase);
      expect(result).toBe("joao-1-1-estudo");
    });

    it("should remove accent from 1 Coríntios", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("1Co 13:1-3", defaultBooks, supabase);
      expect(result).toBe("1-corintios-13-1-3-estudo");
    });

    it("should remove accent from 2 Crônicas", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("2Cr 1:1", defaultBooks, supabase);
      expect(result).toBe("2-cronicas-1-1-estudo");
    });
  });

  describe("slug conflict resolution", () => {
    it("should return base slug when no conflicts exist", async () => {
      const supabase = createMockSupabase([]);
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo");
    });

    it("should return base slug when similar slugs exist but not exact match", async () => {
      const supabase = createMockSupabase(["genesis-1-1-3-estudo-extra"]);
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo");
    });

    it("should append -2 when base slug already exists", async () => {
      const supabase = createMockSupabase(["genesis-1-1-3-estudo"]);
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo-2");
    });

    it("should append -3 when base and -2 already exist", async () => {
      const supabase = createMockSupabase([
        "genesis-1-1-3-estudo",
        "genesis-1-1-3-estudo-2",
      ]);
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo-3");
    });

    it("should find next available suffix with gaps", async () => {
      const supabase = createMockSupabase([
        "genesis-1-1-3-estudo",
        "genesis-1-1-3-estudo-2",
        "genesis-1-1-3-estudo-3",
        "genesis-1-1-3-estudo-4",
      ]);
      const result = await generateStudySlug("Gn 1:1-3", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo-5");
    });

    it("should query the studies table with like pattern", async () => {
      const supabase = createMockSupabase([]);
      await generateStudySlug("Jo 3:16", defaultBooks, supabase);

      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      expect(fromMock).toHaveBeenCalledWith("studies");
      expect(supabase.select).toHaveBeenCalledWith("slug");
      expect(supabase.like).toHaveBeenCalledWith("slug", "joao-3-16-estudo%");
    });
  });

  describe("edge cases", () => {
    it("should handle multi-digit chapter and verse numbers", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Sl 119:105-112", defaultBooks, supabase);
      expect(result).toBe("salmos-119-105-112-estudo");
    });

    it("should throw on invalid verse reference format", async () => {
      const supabase = createMockSupabase();
      await expect(
        generateStudySlug("invalid", defaultBooks, supabase),
      ).rejects.toThrow("Invalid verse reference format");
    });

    it("should throw on unknown book abbreviation", async () => {
      const supabase = createMockSupabase();
      await expect(
        generateStudySlug("Xyz 1:1", defaultBooks, supabase),
      ).rejects.toThrow("Unknown book abbreviation");
    });

    it("should throw when Supabase returns an error", async () => {
      const supabase = createErrorSupabase();
      await expect(
        generateStudySlug("Gn 1:1", defaultBooks, supabase),
      ).rejects.toThrow("Failed to check slug conflicts: connection refused");
    });

    it("should handle whitespace in verse reference", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("  Gn 1:1-3  ", defaultBooks, supabase);
      expect(result).toBe("genesis-1-1-3-estudo");
    });

    it("should handle abbreviation with accent matching (Êx)", async () => {
      const supabase = createMockSupabase();
      const result = await generateStudySlug("Êx 20:1-17", defaultBooks, supabase);
      expect(result).toBe("exodo-20-1-17-estudo");
    });
  });
});
