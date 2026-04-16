import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchVerses, buildVerseUrl } from "../bible-api";

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildVerseUrl", () => {
    it("should build URL for a single verse", () => {
      const url = buildVerseUrl({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
      });

      expect(url).toBe(
        "https://www.abibliadigital.com.br/api/verses/nvi/gn/1/1"
      );
    });

    it("should build URL for a verse range", () => {
      const url = buildVerseUrl({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
        verseEnd: 5,
      });

      expect(url).toBe(
        "https://www.abibliadigital.com.br/api/verses/nvi/gn/1/1-5"
      );
    });

    it("should build single verse URL when verseEnd equals verseStart", () => {
      const url = buildVerseUrl({
        version: "acf",
        book: "sl",
        chapter: 23,
        verseStart: 4,
        verseEnd: 4,
      });

      expect(url).toBe(
        "https://www.abibliadigital.com.br/api/verses/acf/sl/23/4"
      );
    });
  });

  describe("fetchVerses", () => {
    it("should return success with joined verse text on valid response", async () => {
      // Arrange
      const mockVerses = [
        { text: "No princípio, Deus criou os céus e a terra." },
        { text: "A terra era sem forma e vazia." },
      ];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockVerses),
        })
      );

      // Act
      const result = await fetchVerses({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
        verseEnd: 2,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.text).toBe(
          "No princípio, Deus criou os céus e a terra. A terra era sem forma e vazia."
        );
      }
    });

    it("should return success for single verse (non-array response)", async () => {
      // Arrange
      const mockVerse = { text: "O Senhor é meu pastor, nada me faltará." };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockVerse),
        })
      );

      // Act
      const result = await fetchVerses({
        version: "nvi",
        book: "sl",
        chapter: 23,
        verseStart: 1,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.text).toBe("O Senhor é meu pastor, nada me faltará.");
      }
    });

    it("should return error with timeout message when fetch takes too long", async () => {
      // Arrange
      vi.useFakeTimers();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((_url: string, options: RequestInit) => {
          return new Promise((_resolve, reject) => {
            const onAbort = () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            };
            if (options?.signal) {
              options.signal.addEventListener("abort", onAbort);
            }
          });
        })
      );

      // Act
      const resultPromise = fetchVerses({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
      });
      await vi.advanceTimersByTimeAsync(6000);
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("timed out");
      }

      vi.useRealTimers();
    });

    it("should return error without throwing on network failure", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      // Act
      const result = await fetchVerses({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Network error");
      }
    });

    it("should return error for non-200 response status", async () => {
      // Arrange
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        })
      );

      // Act
      const result = await fetchVerses({
        version: "nvi",
        book: "invalid",
        chapter: 1,
        verseStart: 1,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("404");
      }
    });

    it("should call fetch with the correct URL for verse range", async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([{ text: "verse" }]),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Act
      await fetchVerses({
        version: "acf",
        book: "jo",
        chapter: 3,
        verseStart: 16,
        verseEnd: 17,
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.abibliadigital.com.br/api/verses/acf/jo/3/16-17",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should call fetch with the correct URL for single verse", async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: "verse" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Act
      await fetchVerses({
        version: "nvi",
        book: "gn",
        chapter: 1,
        verseStart: 1,
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.abibliadigital.com.br/api/verses/nvi/gn/1/1",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });
});
