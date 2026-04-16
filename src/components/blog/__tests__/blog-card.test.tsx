import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlogCard, stripMarkdown } from "../BlogCard";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  BookOpen: ({ className }: { className?: string }) => (
    <svg data-testid="book-open-icon" className={className} />
  ),
}));

const defaultProps = {
  title: "A Parábola do Semeador",
  slug: "a-parabola-do-semeador",
  verseReference: "Mateus 13:1-23",
  content: "Este estudo explora a parábola do semeador.",
  publishedAt: "2026-04-15T12:00:00Z",
  authorName: "Pastor João",
};

describe("stripMarkdown", () => {
  it("removes headers (h1 through h6)", () => {
    expect(stripMarkdown("# Heading 1")).toBe("Heading 1");
    expect(stripMarkdown("## Heading 2")).toBe("Heading 2");
    expect(stripMarkdown("### Heading 3")).toBe("Heading 3");
    expect(stripMarkdown("###### Heading 6")).toBe("Heading 6");
  });

  it("removes bold markers (**text** and __text__)", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
    expect(stripMarkdown("__bold alt__")).toBe("bold alt");
  });

  it("removes italic markers (*text* and _text_)", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text");
    expect(stripMarkdown("_italic alt_")).toBe("italic alt");
  });

  it("removes links but keeps link text", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe(
      "click here"
    );
  });

  it("removes image syntax when not preceded by link stripping", () => {
    expect(stripMarkdown("![alt text](image.png)")).not.toContain("image.png");
  });

  it("removes unordered list markers (-, *, +)", () => {
    expect(stripMarkdown("- item one\n- item two")).toBe("item one item two");
    expect(stripMarkdown("* starred item")).toBe("starred item");
    expect(stripMarkdown("+ plus item")).toBe("plus item");
  });

  it("removes ordered list markers", () => {
    expect(stripMarkdown("1. first\n2. second")).toBe("first second");
  });

  it("removes blockquote markers", () => {
    expect(stripMarkdown("> quoted text")).toBe("quoted text");
  });

  it("removes inline code backticks", () => {
    expect(stripMarkdown("`const x = 1`")).toBe("const x = 1");
  });

  it("removes fenced code blocks entirely", () => {
    const input = "before\n\n```\nconst x = 1;\n```\n\nafter";
    const result = stripMarkdown(input);
    expect(result).toContain("before");
    expect(result).toContain("after");
  });

  it("removes strikethrough markers", () => {
    expect(stripMarkdown("~~deleted~~")).toBe("deleted");
  });

  it("collapses multiple newlines into spaces and trims", () => {
    expect(stripMarkdown("line one\n\n\nline two")).toBe("line one line two");
  });

  it("handles combined markdown elements", () => {
    const input = "# Title\n\n**Bold** and *italic* with [link](url)\n\n- item";
    const result = stripMarkdown(input);
    expect(result).toBe("Title Bold and italic with link item");
  });
});

describe("BlogCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title", () => {
    render(<BlogCard {...defaultProps} />);
    expect(screen.getByText("A Parábola do Semeador")).toBeInTheDocument();
  });

  it("renders the verse reference", () => {
    render(<BlogCard {...defaultProps} />);
    expect(screen.getByText("Mateus 13:1-23")).toBeInTheDocument();
  });

  it("renders the author name", () => {
    render(<BlogCard {...defaultProps} />);
    expect(screen.getByText("Pastor João")).toBeInTheDocument();
  });

  it("renders the stripped content as excerpt", () => {
    render(<BlogCard {...defaultProps} />);
    expect(
      screen.getByText("Este estudo explora a parábola do semeador.")
    ).toBeInTheDocument();
  });

  it("renders the date formatted in pt-BR", () => {
    render(<BlogCard {...defaultProps} />);
    const timeEl = screen.getByText(/abril/i);
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.tagName).toBe("TIME");
    expect(timeEl).toHaveAttribute("dateTime", "2026-04-15T12:00:00Z");
  });

  it("renders the BookOpen icon", () => {
    render(<BlogCard {...defaultProps} />);
    expect(screen.getByTestId("book-open-icon")).toBeInTheDocument();
  });

  it("links to /study/[slug]", () => {
    render(<BlogCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/study/a-parabola-do-semeador");
  });

  it("truncates content longer than 120 characters with ellipsis", () => {
    const longContent = "A".repeat(150);
    render(<BlogCard {...defaultProps} content={longContent} />);
    const excerpt = screen.getByText("A".repeat(120) + "...");
    expect(excerpt).toBeInTheDocument();
  });

  it("does not append ellipsis when content is 120 chars or less", () => {
    const shortContent = "B".repeat(120);
    render(<BlogCard {...defaultProps} content={shortContent} />);
    const excerpt = screen.getByText("B".repeat(120));
    expect(excerpt).toBeInTheDocument();
    expect(excerpt.textContent).not.toContain("...");
  });

  it("does not append ellipsis for content shorter than 120 chars", () => {
    const content = "Short content";
    render(<BlogCard {...defaultProps} content={content} />);
    expect(screen.getByText("Short content")).toBeInTheDocument();
  });

  it("strips markdown before truncating", () => {
    const markdownContent = "# " + "X".repeat(130);
    render(<BlogCard {...defaultProps} content={markdownContent} />);
    const excerpt = screen.getByText("X".repeat(120) + "...");
    expect(excerpt).toBeInTheDocument();
  });
});
