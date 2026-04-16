import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlogFilterValues } from "../BlogFilters";

// --- Mock data ---

const mockBooksOld = [
  {
    id: "uuid-genesis",
    name: "Gênesis",
    abbreviation: "Gn",
    testament: "old" as const,
    chapters: 50,
    order: 1,
  },
  {
    id: "uuid-exodus",
    name: "Êxodo",
    abbreviation: "Ex",
    testament: "old" as const,
    chapters: 40,
    order: 2,
  },
];

const mockBooksNew = [
  {
    id: "uuid-matthew",
    name: "Mateus",
    abbreviation: "Mt",
    testament: "new" as const,
    chapters: 28,
    order: 40,
  },
  {
    id: "uuid-mark",
    name: "Marcos",
    abbreviation: "Mc",
    testament: "new" as const,
    chapters: 16,
    order: 41,
  },
];

const allBooks = [...mockBooksOld, ...mockBooksNew];

// --- Mocks ---

const mockUseBibleBooks = vi.fn();

vi.mock("@/hooks/use-bible-books", () => ({
  useBibleBooks: (...args: unknown[]) => mockUseBibleBooks(...args),
}));

vi.mock("@base-ui/react/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// --- Helpers ---

function setupHook(overrides: Record<string, unknown> = {}) {
  mockUseBibleBooks.mockReturnValue({
    books: allBooks,
    booksByTestament: { old: mockBooksOld, new: mockBooksNew },
    loading: false,
    error: null,
    ...overrides,
  });
}

async function renderFilters(props: {
  testament?: string | null;
  bookId?: string | null;
} = {}) {
  const onFilterChange = vi.fn<(filters: BlogFilterValues) => void>();
  const fullProps = {
    testament: null as string | null,
    bookId: null as string | null,
    ...props,
    onFilterChange,
  };

  const { BlogFilters } = await import("../BlogFilters");

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<BlogFilters {...fullProps} />);
  });

  return { ...result!, onFilterChange };
}

// --- Tests ---

describe("BlogFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHook();
  });

  it("renders testament dropdown with correct options", async () => {
    await renderFilters();

    const select = screen.getByLabelText("Testamento");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");

    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Todos");
    expect(options[0]).toHaveAttribute("value", "");
    expect(options[1]).toHaveTextContent("Antigo Testamento");
    expect(options[1]).toHaveAttribute("value", "old");
    expect(options[2]).toHaveTextContent("Novo Testamento");
    expect(options[2]).toHaveAttribute("value", "new");
  });

  it("renders book dropdown with all books when no testament selected", async () => {
    await renderFilters();

    const select = screen.getByLabelText("Livro");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    // 1 default ("Todos os livros") + 4 books
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent("Todos os livros");
    expect(options[1]).toHaveTextContent("Gênesis");
    expect(options[2]).toHaveTextContent("Êxodo");
    expect(options[3]).toHaveTextContent("Mateus");
    expect(options[4]).toHaveTextContent("Marcos");
  });

  it("filters books by Old Testament when testament='old'", async () => {
    await renderFilters({ testament: "old" });

    const select = screen.getByLabelText("Livro");
    const options = select.querySelectorAll("option");
    // 1 default + 2 OT books
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveTextContent("Gênesis");
    expect(options[2]).toHaveTextContent("Êxodo");
  });

  it("filters books by New Testament when testament='new'", async () => {
    await renderFilters({ testament: "new" });

    const select = screen.getByLabelText("Livro");
    const options = select.querySelectorAll("option");
    // 1 default + 2 NT books
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveTextContent("Mateus");
    expect(options[2]).toHaveTextContent("Marcos");
  });

  it("shows 'Carregando...' when books are loading", async () => {
    setupHook({ loading: true, books: [], booksByTestament: { old: [], new: [] } });
    await renderFilters();

    const select = screen.getByLabelText("Livro");
    expect(select).toBeDisabled();

    const defaultOption = select.querySelector("option[value='']");
    expect(defaultOption).toHaveTextContent("Carregando...");
  });

  it("calls onFilterChange with new testament and null bookId when testament changes", async () => {
    const { onFilterChange } = await renderFilters();

    const select = screen.getByLabelText("Testamento");
    fireEvent.change(select, { target: { value: "old" } });

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: "old",
      bookId: null,
    });
  });

  it("resets bookId to null when testament changes", async () => {
    const { onFilterChange } = await renderFilters({
      testament: "old",
      bookId: "uuid-genesis",
    });

    const select = screen.getByLabelText("Testamento");
    fireEvent.change(select, { target: { value: "new" } });

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: "new",
      bookId: null,
    });
  });

  it("calls onFilterChange with bookId when book changes", async () => {
    const { onFilterChange } = await renderFilters({ testament: "old" });

    const select = screen.getByLabelText("Livro");
    fireEvent.change(select, { target: { value: "uuid-genesis" } });

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: "old",
      bookId: "uuid-genesis",
    });
  });

  it("calls onFilterChange with null bookId when book cleared", async () => {
    const { onFilterChange } = await renderFilters({
      testament: "old",
      bookId: "uuid-genesis",
    });

    const select = screen.getByLabelText("Livro");
    fireEvent.change(select, { target: { value: "" } });

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: "old",
      bookId: null,
    });
  });

  it("does not show 'Limpar filtros' button when no filters active", async () => {
    await renderFilters({ testament: null, bookId: null });

    expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
  });

  it("shows 'Limpar filtros' button when testament is selected", async () => {
    await renderFilters({ testament: "old" });

    expect(screen.getByText("Limpar filtros")).toBeInTheDocument();
  });

  it("shows 'Limpar filtros' button when bookId is selected", async () => {
    await renderFilters({ bookId: "uuid-genesis" });

    expect(screen.getByText("Limpar filtros")).toBeInTheDocument();
  });

  it("clicking 'Limpar filtros' resets both filters to null", async () => {
    const { onFilterChange } = await renderFilters({
      testament: "old",
      bookId: "uuid-genesis",
    });

    const clearButton = screen.getByText("Limpar filtros");
    fireEvent.click(clearButton);

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: null,
      bookId: null,
    });
  });

  it("uses string type for book id (UUID compatibility)", async () => {
    const { onFilterChange } = await renderFilters();

    const select = screen.getByLabelText("Livro");
    fireEvent.change(select, { target: { value: "uuid-genesis" } });

    const call = onFilterChange.mock.calls[0]![0];
    expect(typeof call.bookId).toBe("string");
    expect(call.bookId).toBe("uuid-genesis");
  });

  it("displays Portuguese labels with correct accentuation", async () => {
    await renderFilters();

    expect(screen.getByText("Testamento")).toBeInTheDocument();
    expect(screen.getByText("Livro")).toBeInTheDocument();
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Antigo Testamento")).toBeInTheDocument();
    expect(screen.getByText("Novo Testamento")).toBeInTheDocument();
  });

  it("uses accessible label-select associations", async () => {
    await renderFilters();

    const testamentSelect = screen.getByLabelText("Testamento");
    expect(testamentSelect).toHaveAttribute("id", "testament-filter");

    const bookSelect = screen.getByLabelText("Livro");
    expect(bookSelect).toHaveAttribute("id", "book-filter");
  });

  it("sets testament dropdown value from props", async () => {
    await renderFilters({ testament: "new" });

    const select = screen.getByLabelText("Testamento") as HTMLSelectElement;
    expect(select.value).toBe("new");
  });

  it("sets book dropdown value from props", async () => {
    await renderFilters({ bookId: "uuid-matthew" });

    const select = screen.getByLabelText("Livro") as HTMLSelectElement;
    expect(select.value).toBe("uuid-matthew");
  });

  it("sets testament to null when 'Todos' is selected", async () => {
    const { onFilterChange } = await renderFilters({ testament: "old" });

    const select = screen.getByLabelText("Testamento");
    fireEvent.change(select, { target: { value: "" } });

    expect(onFilterChange).toHaveBeenCalledWith({
      testament: null,
      bookId: null,
    });
  });
});
