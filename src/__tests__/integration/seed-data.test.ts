// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Integration test for Bible seed data correctness.
 *
 * Parses supabase/seed.sql and validates structural integrity
 * of Bible versions and books without requiring a live database.
 */

interface BibleVersion {
  slug: string;
  name: string;
  language: string;
}

interface BibleBook {
  name: string;
  abbreviation: string;
  testament: "old" | "new";
  position: number;
  totalChapters: number;
}

function parseSeedSql(filePath: string): {
  versions: BibleVersion[];
  books: BibleBook[];
} {
  const content = readFileSync(filePath, "utf-8");

  const versions: BibleVersion[] = [];
  const books: BibleBook[] = [];

  // Parse bible_versions INSERT
  const versionRegex =
    /gen_random_uuid\(\),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(true|false)/g;

  // Find the bible_versions INSERT block
  const versionBlockMatch = content.match(
    /INSERT INTO bible_versions[\s\S]*?ON CONFLICT \(slug\) DO NOTHING;/
  );
  if (versionBlockMatch) {
    let match: RegExpExecArray | null;
    while ((match = versionRegex.exec(versionBlockMatch[0])) !== null) {
      versions.push({
        slug: match[1]!,
        name: match[2]!,
        language: match[3]!,
      });
    }
  }

  // Parse bible_books INSERT
  const bookRegex =
    /gen_random_uuid\(\),\s*'([^']+)',\s*'([^']+)',\s*'(old|new)',\s*(\d+),\s*(\d+)/g;

  const bookBlockMatch = content.match(
    /INSERT INTO bible_books[\s\S]*?ON CONFLICT \(abbreviation\) DO NOTHING;/
  );
  if (bookBlockMatch) {
    let match: RegExpExecArray | null;
    while ((match = bookRegex.exec(bookBlockMatch[0])) !== null) {
      books.push({
        name: match[1]!,
        abbreviation: match[2]!,
        testament: match[3]! as "old" | "new",
        position: parseInt(match[4]!, 10),
        totalChapters: parseInt(match[5]!, 10),
      });
    }
  }

  return { versions, books };
}

describe("Bible Seed Data Integrity", () => {
  let versions: BibleVersion[];
  let books: BibleBook[];

  beforeAll(() => {
    const seedPath = resolve(__dirname, "../../../supabase/seed.sql");
    const parsed = parseSeedSql(seedPath);
    versions = parsed.versions;
    books = parsed.books;
  });

  describe("Bible Versions", () => {
    it("should contain at least 6 versions", () => {
      expect(versions.length).toBeGreaterThanOrEqual(6);
    });

    it("should have unique slugs", () => {
      const slugs = versions.map((v) => v.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("should include both Portuguese and English versions", () => {
      const languages = new Set(versions.map((v) => v.language));
      expect(languages.has("pt")).toBe(true);
      expect(languages.has("en")).toBe(true);
    });

    it("should include known versions", () => {
      const slugs = versions.map((v) => v.slug);
      expect(slugs).toContain("nvi");
      expect(slugs).toContain("ara");
      expect(slugs).toContain("kjv");
    });
  });

  describe("Bible Books — Total Count", () => {
    it("should contain exactly 66 books", () => {
      expect(books.length).toBe(66);
    });
  });

  describe("Bible Books — Testament Split", () => {
    it("should have exactly 39 Old Testament books", () => {
      const oldTestament = books.filter((b) => b.testament === "old");
      expect(oldTestament.length).toBe(39);
    });

    it("should have exactly 27 New Testament books", () => {
      const newTestament = books.filter((b) => b.testament === "new");
      expect(newTestament.length).toBe(27);
    });
  });

  describe("Bible Books — Sequential Positions", () => {
    it("should have positions 1 through 66 with no gaps", () => {
      const positions = books.map((b) => b.position).sort((a, b) => a - b);
      const expected = Array.from({ length: 66 }, (_, i) => i + 1);
      expect(positions).toEqual(expected);
    });

    it("should have no duplicate positions", () => {
      const positions = books.map((b) => b.position);
      expect(new Set(positions).size).toBe(66);
    });

    it("should have Old Testament books in positions 1-39", () => {
      const oldBooks = books.filter((b) => b.testament === "old");
      oldBooks.forEach((book) => {
        expect(book.position).toBeGreaterThanOrEqual(1);
        expect(book.position).toBeLessThanOrEqual(39);
      });
    });

    it("should have New Testament books in positions 40-66", () => {
      const newBooks = books.filter((b) => b.testament === "new");
      newBooks.forEach((book) => {
        expect(book.position).toBeGreaterThanOrEqual(40);
        expect(book.position).toBeLessThanOrEqual(66);
      });
    });
  });

  describe("Bible Books — Chapter Count Accuracy", () => {
    const knownChapterCounts: Record<string, number> = {
      "Gênesis": 50,
      "Salmos": 150,
      "Obadias": 1,
      "Mateus": 28,
      "Apocalipse": 22,
      "Êxodo": 40,
      "Isaías": 66,
      "Provérbios": 31,
      "Atos": 28,
      "Filemom": 1,
    };

    for (const [bookName, expectedChapters] of Object.entries(
      knownChapterCounts
    )) {
      it(`should have ${expectedChapters} chapters for ${bookName}`, () => {
        const book = books.find((b) => b.name === bookName);
        expect(book).toBeDefined();
        expect(book!.totalChapters).toBe(expectedChapters);
      });
    }
  });

  describe("Bible Books — Portuguese Accents", () => {
    const accentedNames: Record<string, string> = {
      "Gênesis": "Gn",
      "Êxodo": "Ex",
      "Levítico": "Lv",
      "Números": "Nm",
      "Deuteronômio": "Dt",
      "Josué": "Js",
      "Juízes": "Jz",
      "Crônicas": "1Cr",
      "Provérbios": "Pv",
      "Isaías": "Is",
      "Lamentações": "Lm",
      "Oséias": "Os",
      "Amós": "Am",
      "Miquéias": "Mq",
      "Sofonias": "Sf",
      "Zacarias": "Zc",
      "Gálatas": "Gl",
      "Efésios": "Ef",
      "Coríntios": "1Co",
      "Timóteo": "1Tm",
    };

    it("should have correct Portuguese accents on book names", () => {
      for (const [accentedPart, abbrev] of Object.entries(accentedNames)) {
        const book = books.find((b) => b.abbreviation === abbrev);
        expect(book, `Book with abbreviation ${abbrev} not found`).toBeDefined();
        expect(
          book!.name.includes(accentedPart) || book!.name === accentedPart,
          `Expected "${book!.name}" to contain accented form "${accentedPart}"`
        ).toBe(true);
      }
    });

    it("should NOT contain unaccented versions of accented names", () => {
      const unaccentedForms = [
        "Genesis",
        "Exodo",
        "Levitico",
        "Numeros",
        "Deuteronomio",
        "Josue",
        "Juizes",
        "Cronicas",
        "Proverbios",
        "Isaias",
        "Lamentacoes",
        "Oseias",
        "Miqueias",
        "Galatas",
        "Efesios",
        "Corintios",
        "Timoteo",
      ];

      const bookNames = books.map((b) => b.name);
      for (const unaccented of unaccentedForms) {
        const hasUnaccented = bookNames.some(
          (name) => name === unaccented || name.endsWith(` ${unaccented}`)
        );
        expect(
          hasUnaccented,
          `Found unaccented form "${unaccented}" in book names`
        ).toBe(false);
      }
    });
  });

  describe("Bible Books — Unique Abbreviations", () => {
    it("should have unique abbreviations across all books", () => {
      const abbreviations = books.map((b) => b.abbreviation);
      expect(new Set(abbreviations).size).toBe(abbreviations.length);
    });
  });

  describe("Seed SQL — Idempotency", () => {
    it("should use ON CONFLICT DO NOTHING for versions", () => {
      const content = readFileSync(
        resolve(__dirname, "../../../supabase/seed.sql"),
        "utf-8"
      );
      expect(content).toContain("ON CONFLICT (slug) DO NOTHING");
    });

    it("should use ON CONFLICT DO NOTHING for books", () => {
      const content = readFileSync(
        resolve(__dirname, "../../../supabase/seed.sql"),
        "utf-8"
      );
      expect(content).toContain("ON CONFLICT (abbreviation) DO NOTHING");
    });
  });
});
