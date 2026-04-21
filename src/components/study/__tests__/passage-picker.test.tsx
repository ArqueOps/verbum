import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import type { BibleVersion } from "@/types/bible";
import type { BibleBookWithId, BibleBooksByTestament } from "@/hooks/use-bible-books";

// --- Mock data ---

const mockVersions: BibleVersion[] = [
  { code: "acf", name: "Almeida Corrigida Fiel", language: "pt", description: "" },
  { code: "nvi", name: "Nova Versão Internacional", language: "pt", description: "" },
];

const mockBooks: BibleBookWithId[] = [
  { id: "gen-1", name: "Gênesis", abbreviation: "Gn", testament: "old", chapters: 50, order: 1 },
  { id: "exo-2", name: "Êxodo", abbreviation: "Ex", testament: "old", chapters: 40, order: 2 },
  { id: "mat-40", name: "Mateus", abbreviation: "Mt", testament: "new", chapters: 28, order: 40 },
];

const mockBooksByTestament: BibleBooksByTestament = {
  old: mockBooks.filter((b) => b.testament === "old"),
  new: mockBooks.filter((b) => b.testament === "new"),
};

// --- Mock hooks ---

const mockUseBibleVersions = vi.fn(() => ({
  versions: mockVersions,
  loading: false,
  error: null,
}));

const mockUseBibleBooks = vi.fn(() => ({
  books: mockBooks,
  booksByTestament: mockBooksByTestament,
  loading: false,
  error: null,
}));

const mockUseBibleChapters = vi.fn((bookId: string | null) => {
  if (!bookId) return { chapters: [], loading: false, error: null };
  const book = mockBooks.find((b) => b.id === bookId);
  const count = book?.chapters ?? 0;
  return {
    chapters: Array.from({ length: count }, (_, i) => i + 1),
    loading: false,
    error: null,
  };
});

vi.mock("@/hooks/use-bible-versions", () => ({
  useBibleVersions: () => mockUseBibleVersions(),
}));

vi.mock("@/hooks/use-bible-books", () => ({
  useBibleBooks: () => mockUseBibleBooks(),
}));

vi.mock("@/hooks/use-bible-chapters", () => ({
  useBibleChapters: (bookId: string | null) => mockUseBibleChapters(bookId),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseBibleVersions.mockReturnValue({
    versions: mockVersions,
    loading: false,
    error: null,
  });
  mockUseBibleBooks.mockReturnValue({
    books: mockBooks,
    booksByTestament: mockBooksByTestament,
    loading: false,
    error: null,
  });
  mockUseBibleChapters.mockImplementation((bookId: string | null) => {
    if (!bookId) return { chapters: [], loading: false, error: null };
    const book = mockBooks.find((b) => b.id === bookId);
    const count = book?.chapters ?? 0;
    return {
      chapters: Array.from({ length: count }, (_, i) => i + 1),
      loading: false,
      error: null,
    };
  });
});

async function renderPassagePicker(
  props: { onPassageSelect?: (s: unknown) => void } = {}
) {
  const { PassagePicker } = await import("../PassagePicker");
  await act(() => {
    render(<PassagePicker {...props} />);
  });
}

// --- Helpers to interact with FilterableDropdown ---

function getComboboxByLabel(labelText: string | RegExp): HTMLInputElement {
  const labels = typeof labelText === "string"
    ? screen.getAllByText(labelText)
    : screen.getAllByText(labelText);
  for (const label of labels) {
    const container = label.closest(".relative.flex.flex-col") ?? label.closest("div");
    const input = container?.querySelector("input[role='combobox']") as HTMLInputElement | null;
    if (input) return input;
  }
  throw new Error(`Could not find combobox for label "${labelText}"`);
}

async function selectDropdownItem(
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  itemText: string
) {
  const input = getComboboxByLabel(labelText);

  await act(async () => {
    await user.click(input);
  });

  const option = await screen.findByRole("option", { name: new RegExp(itemText) });
  await act(async () => {
    await user.click(option);
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("PassagePicker", () => {
  describe("rendering", () => {
    it("renders version and book select dropdowns", async () => {
      await renderPassagePicker();

      expect(screen.getByText("Versão")).toBeInTheDocument();
      expect(screen.getByText("Livro")).toBeInTheDocument();
    });

    it("renders verse range inputs", async () => {
      await renderPassagePicker();

      expect(screen.getByPlaceholderText("Início")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Fim")).toBeInTheDocument();
    });
  });

  describe("chapter dropdown conditional rendering", () => {
    it("does not render chapter dropdown when no book is selected", async () => {
      await renderPassagePicker();

      expect(screen.queryByText("Capítulo")).not.toBeInTheDocument();
    });

    it("renders chapter dropdown after book selection", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Livro", "Gênesis");

      expect(screen.getByText("Capítulo")).toBeInTheDocument();
    });
  });

  describe("verse range validation", () => {
    it("shows error when end verse is less than start verse", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      // Select book to enable chapter, then chapter to enable verse inputs
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      const startInput = screen.getByPlaceholderText("Início");
      const endInput = screen.getByPlaceholderText("Fim");

      await act(async () => {
        await user.clear(startInput);
        await user.type(startInput, "10");
        await user.clear(endInput);
        await user.type(endInput, "5");
      });

      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(
        "O versículo final deve ser maior ou igual ao inicial"
      );
    });

    it("does not show error when end verse equals start verse", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      const startInput = screen.getByPlaceholderText("Início");
      const endInput = screen.getByPlaceholderText("Fim");

      await act(async () => {
        await user.clear(startInput);
        await user.type(startInput, "5");
        await user.clear(endInput);
        await user.type(endInput, "5");
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not show error when only start verse is filled", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      const startInput = screen.getByPlaceholderText("Início");

      await act(async () => {
        await user.clear(startInput);
        await user.type(startInput, "10");
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("passage preview", () => {
    it("shows preview with correct format when version, book and chapter selected", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      expect(screen.getByText("Passagem selecionada")).toBeInTheDocument();
      expect(screen.getByText("Gênesis 1 (ACF)")).toBeInTheDocument();
    });

    it("shows preview with verse range format 'Livro Cap:VerInício-VerFim (Versão)'", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      const startInput = screen.getByPlaceholderText("Início");
      const endInput = screen.getByPlaceholderText("Fim");

      await act(async () => {
        await user.clear(startInput);
        await user.type(startInput, "1");
        await user.clear(endInput);
        await user.type(endInput, "3");
      });

      expect(screen.getByText("Gênesis 1:1-3 (ACF)")).toBeInTheDocument();
    });

    it("hides preview when version is not selected", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      // Select only book and chapter, no version
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      expect(screen.queryByText("Passagem selecionada")).not.toBeInTheDocument();
    });

    it("hides preview when book is not selected", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      // Select only version
      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");

      expect(screen.queryByText("Passagem selecionada")).not.toBeInTheDocument();
    });

    it("hides preview when chapter is not selected", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");
      await selectDropdownItem(user, "Livro", "Gênesis");
      // Don't select chapter

      expect(screen.queryByText("Passagem selecionada")).not.toBeInTheDocument();
    });
  });

  describe("filterable dropdowns", () => {
    it("filters version options by text input", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      const versionInput = getComboboxByLabel("Versão");

      await act(async () => {
        await user.click(versionInput);
        await user.type(versionInput, "Nova");
      });

      expect(screen.getByRole("option", { name: /Nova Versão Internacional/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Almeida Corrigida Fiel/i })).not.toBeInTheDocument();
    });

    it("filters book options by text input", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      const bookInput = getComboboxByLabel("Livro");

      await act(async () => {
        await user.click(bookInput);
        await user.type(bookInput, "Mat");
      });

      expect(screen.getByRole("option", { name: /Mateus/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Gênesis/i })).not.toBeInTheDocument();
    });

    it("shows 'Nenhum resultado encontrado' when filter matches nothing", async () => {
      const user = userEvent.setup();
      await renderPassagePicker();

      const versionInput = getComboboxByLabel("Versão");

      await act(async () => {
        await user.click(versionInput);
        await user.type(versionInput, "xyz999");
      });

      expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
    });
  });

  describe("callback behavior", () => {
    it("fires onPassageSelect when version, book and chapter are selected", async () => {
      const user = userEvent.setup();
      const onPassageSelect = vi.fn();
      await renderPassagePicker({ onPassageSelect });

      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      expect(onPassageSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          book: "Gênesis",
          chapter: 1,
          version: "acf",
        })
      );
    });

    it("does not fire onPassageSelect when verse range has error", async () => {
      const user = userEvent.setup();
      const onPassageSelect = vi.fn();
      await renderPassagePicker({ onPassageSelect });

      await selectDropdownItem(user, "Versão", "Almeida Corrigida Fiel");
      await selectDropdownItem(user, "Livro", "Gênesis");
      await selectDropdownItem(user, "Capítulo", "^1$");

      const startInput = screen.getByPlaceholderText("Início");
      const endInput = screen.getByPlaceholderText("Fim");

      await act(async () => {
        await user.clear(startInput);
        await user.type(startInput, "10");
        await user.clear(endInput);
        await user.type(endInput, "5");
      });

      // Record call count after entering invalid range
      const callCountAfterInvalidRange = onPassageSelect.mock.calls.length;

      // Verify the error is displayed (range is invalid)
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // No NEW calls should have been made with the invalid range
      // (all prior calls were from valid states before the error)
      const callsWithInvalidRange = onPassageSelect.mock.calls.filter(
        (args: unknown[]) => {
          const sel = args[0] as { verseStart: number; verseEnd?: number };
          return sel.verseStart === 10 && sel.verseEnd === 5;
        }
      );
      expect(callsWithInvalidRange).toHaveLength(0);

      // Verify no additional calls happen after this point
      expect(onPassageSelect.mock.calls.length).toBe(callCountAfterInvalidRange);
    });
  });
});
