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

import { BlogCard } from "../BlogCard";

const baseProps = {
  title: "O Significado de João 3:16",
  verseReference: "João 3:16",
  publishedAt: "2026-04-10T12:00:00Z",
  bookName: "João",
  slug: "significado-joao-3-16",
  summary: "Um estudo profundo sobre o versículo mais conhecido da Bíblia.",
  authorName: "Verbum AI",
};

describe("BlogCard", () => {
  it("renders title, verse reference, and summary", () => {
    render(<BlogCard {...baseProps} />);

    expect(screen.getByText(baseProps.title)).toBeInTheDocument();
    expect(screen.getByText(baseProps.verseReference)).toBeInTheDocument();
    expect(screen.getByText(baseProps.summary!)).toBeInTheDocument();
  });

  it("links to /estudos/[slug]", () => {
    render(<BlogCard {...baseProps} />);

    const link = screen.getByTestId("blog-card");
    expect(link).toHaveAttribute("href", `/estudos/${baseProps.slug}`);
  });

  it("renders formatted date in pt-BR", () => {
    render(<BlogCard {...baseProps} />);

    const timeEl = screen.getByRole("time");
    expect(timeEl).toHaveAttribute("dateTime", baseProps.publishedAt);
    expect(timeEl.textContent).toMatch(/abril/i);
    expect(timeEl.textContent).toMatch(/2026/);
  });

  it("renders author name and book name", () => {
    render(<BlogCard {...baseProps} />);

    expect(screen.getByText("Verbum AI · João")).toBeInTheDocument();
  });

  it("renders only author name when book is null", () => {
    render(<BlogCard {...baseProps} bookName={null} />);

    expect(screen.getByText("Verbum AI")).toBeInTheDocument();
  });

  it("renders only book name when author is null", () => {
    render(<BlogCard {...baseProps} authorName={null} />);

    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("truncates summary longer than 120 characters with ellipsis", () => {
    const longSummary = "A".repeat(150);
    render(<BlogCard {...baseProps} summary={longSummary} />);

    expect(screen.getByText("A".repeat(120) + "\u2026")).toBeInTheDocument();
  });

  it("does not render summary when null", () => {
    render(<BlogCard {...baseProps} summary={null} />);

    expect(screen.queryByText(baseProps.summary!)).not.toBeInTheDocument();
  });

  it("does not render date when publishedAt is null", () => {
    render(<BlogCard {...baseProps} publishedAt={null} />);

    expect(screen.queryByRole("time")).not.toBeInTheDocument();
  });
});
