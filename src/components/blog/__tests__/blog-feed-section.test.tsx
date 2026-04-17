import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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

import { BlogFeedSection } from "../BlogFeedSection";

function makeStudy(overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  verseReference: string;
  publishedAt: string | null;
  bookName: string | null;
  summary: string | null;
  authorName: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Estudo sobre Gênesis",
    slug: overrides.slug ?? "estudo-genesis",
    verseReference: overrides.verseReference ?? "Gênesis 1:1",
    publishedAt: overrides.publishedAt ?? "2026-04-01T10:00:00Z",
    bookName: overrides.bookName ?? "Gênesis",
    summary: overrides.summary ?? "Resumo do estudo bíblico",
    authorName: overrides.authorName ?? "Verbum AI",
  };
}

describe("BlogFeedSection", () => {
  it("renders study cards with title, summary, and date", () => {
    const studies = [
      makeStudy({
        id: "1",
        title: "A Criação do Mundo",
        summary: "Estudo sobre os primeiros dias",
        publishedAt: "2026-03-20T08:00:00Z",
      }),
      makeStudy({
        id: "2",
        title: "O Sermão do Monte",
        summary: "As bem-aventuranças de Jesus",
      }),
    ];

    render(<BlogFeedSection studies={studies} />);

    expect(screen.getByText("A Criação do Mundo")).toBeInTheDocument();
    expect(screen.getByText("O Sermão do Monte")).toBeInTheDocument();
    expect(
      screen.getByText("Estudo sobre os primeiros dias"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("As bem-aventuranças de Jesus"),
    ).toBeInTheDocument();
  });

  it("renders each card linking to /estudos/[slug]", () => {
    const studies = [
      makeStudy({ id: "1", slug: "criacao-do-mundo" }),
      makeStudy({ id: "2", slug: "sermao-do-monte" }),
    ];

    render(<BlogFeedSection studies={studies} />);

    const cards = screen.getAllByTestId("blog-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("href", "/estudos/criacao-do-mundo");
    expect(cards[1]).toHaveAttribute("href", "/estudos/sermao-do-monte");
  });

  it("renders secondary CTA button with link to /blog", () => {
    const studies = [makeStudy()];

    render(<BlogFeedSection studies={studies} />);

    const cta = screen.getByTestId("blog-feed-cta");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/blog");
    expect(cta).toHaveTextContent("Ver todos os estudos");
  });

  it("renders empty state when no studies available", () => {
    render(<BlogFeedSection studies={[]} />);

    expect(
      screen.getByText("Nenhum estudo disponível no momento."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("blog-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("blog-feed-cta")).not.toBeInTheDocument();
  });

  it("renders section heading", () => {
    const studies = [makeStudy()];

    render(<BlogFeedSection studies={studies} />);

    expect(
      screen.getByRole("heading", { name: /estudos recentes/i }),
    ).toBeInTheDocument();
  });

  it("renders section with accessible landmark", () => {
    const studies = [makeStudy()];

    render(<BlogFeedSection studies={studies} />);

    expect(
      screen.getByRole("region", { name: /estudos recentes/i }),
    ).toBeInTheDocument();
  });
});
