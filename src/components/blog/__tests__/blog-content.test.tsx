import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    rpc: mockRpc,
  }),
}));

vi.mock("@/components/search-bar", () => ({
  SearchBar: ({ onChange }: { onChange?: (v: string) => void }) => (
    <input
      data-testid="search-input"
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("@/components/blog/BlogFilters", () => ({
  BlogFilters: () => <div data-testid="blog-filters" />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { BlogContent } from "../BlogContent";

function makeStudy(overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  published_at: string | null;
  book_name: string | null;
  book_abbreviation: string | null;
  book_testament: string | null;
  summary: string | null;
  author_name: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Estudo sobre Gênesis",
    slug: overrides.slug ?? "estudo-genesis",
    verse_reference: overrides.verse_reference ?? "Gênesis 1:1",
    published_at: overrides.published_at ?? "2026-04-01T10:00:00Z",
    book_name: overrides.book_name ?? "Gênesis",
    book_abbreviation: overrides.book_abbreviation ?? "Gn",
    book_testament: overrides.book_testament ?? "old",
    summary: overrides.summary ?? "Resumo do estudo bíblico",
    author_name: overrides.author_name ?? "Verbum AI",
  };
}

describe("BlogContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders study cards with mocked data", async () => {
    const studies = [
      makeStudy({ id: "1", title: "A Criação", slug: "a-criacao" }),
      makeStudy({ id: "2", title: "O Dilúvio", slug: "o-diluvio" }),
    ];
    mockRpc.mockResolvedValueOnce({ data: studies, error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-results")).toBeInTheDocument();
    });

    expect(screen.getByText("A Criação")).toBeInTheDocument();
    expect(screen.getByText("O Dilúvio")).toBeInTheDocument();
  });

  it("renders each card linking to /estudos/[slug]", async () => {
    const studies = [
      makeStudy({ id: "1", slug: "estudo-alfa" }),
      makeStudy({ id: "2", slug: "estudo-beta" }),
    ];
    mockRpc.mockResolvedValueOnce({ data: studies, error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-results")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("blog-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("href", "/estudos/estudo-alfa");
    expect(cards[1]).toHaveAttribute("href", "/estudos/estudo-beta");
  });

  it("renders empty state when no studies returned", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("Nenhum estudo encontrado")).toBeInTheDocument();
    expect(screen.queryByTestId("blog-results")).not.toBeInTheDocument();
  });

  it("renders empty state when Supabase returns error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-empty")).toBeInTheDocument();
    });
  });

  it("shows loading spinner before data arrives", () => {
    mockRpc.mockReturnValueOnce(new Promise(() => {}));

    render(<BlogContent />);

    expect(screen.getByTestId("blog-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("blog-results")).not.toBeInTheDocument();
    expect(screen.queryByTestId("blog-empty")).not.toBeInTheDocument();
  });

  it("renders card with title, summary, and date", async () => {
    const study = makeStudy({
      id: "1",
      title: "Sermão do Monte",
      summary: "Jesus ensina sobre as bem-aventuranças",
      published_at: "2026-03-15T08:00:00Z",
    });
    mockRpc.mockResolvedValueOnce({ data: [study], error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-results")).toBeInTheDocument();
    });

    expect(screen.getByText("Sermão do Monte")).toBeInTheDocument();
    expect(
      screen.getByText("Jesus ensina sobre as bem-aventuranças"),
    ).toBeInTheDocument();
    const timeEl = screen.getByRole("time");
    expect(timeEl).toHaveAttribute("dateTime", "2026-03-15T08:00:00Z");
  });

  it("calls rpc with search_published_studies", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("search_published_studies", {});
    });
  });

  it("does not show pagination when studies fit in one page", async () => {
    const studies = [makeStudy({ id: "1" })];
    mockRpc.mockResolvedValueOnce({ data: studies, error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-results")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("blog-pagination")).not.toBeInTheDocument();
  });

  it("shows pagination when studies exceed one page", async () => {
    const studies = Array.from({ length: 15 }, (_, i) =>
      makeStudy({ id: String(i + 1), slug: `estudo-${i + 1}` }),
    );
    mockRpc.mockResolvedValueOnce({ data: studies, error: null });

    render(<BlogContent />);

    await waitFor(() => {
      expect(screen.getByTestId("blog-pagination")).toBeInTheDocument();
    });

    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });
});
