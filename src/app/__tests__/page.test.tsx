// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import Home, { generateMetadata } from "../page";

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
  Sparkles: (props: Record<string, unknown>) => (
    <svg data-testid="sparkles-icon" {...props} />
  ),
  ScrollText: (props: Record<string, unknown>) => (
    <svg data-testid="scroll-text-icon" {...props} />
  ),
  Languages: (props: Record<string, unknown>) => (
    <svg data-testid="languages-icon" {...props} />
  ),
  BookOpen: (props: Record<string, unknown>) => (
    <svg data-testid="book-open-icon" {...props} />
  ),
  GitBranch: (props: Record<string, unknown>) => (
    <svg data-testid="git-branch-icon" {...props} />
  ),
  MessageSquareQuote: (props: Record<string, unknown>) => (
    <svg data-testid="message-square-quote-icon" {...props} />
  ),
  Target: (props: Record<string, unknown>) => (
    <svg data-testid="target-icon" {...props} />
  ),
  Heart: (props: Record<string, unknown>) => (
    <svg data-testid="heart-icon" {...props} />
  ),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

function renderHome() {
  return act(() => {
    render(<Home />);
  });
}

describe("Home Page", () => {
  describe("Hero Section", () => {
    it("renders the headline about Bible study with AI", async () => {
      await renderHome();

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain("Estude a Bíblia");
      expect(heading.textContent).toContain("profundidade teológica");
      expect(heading.textContent).toContain("inteligência artificial");
    });

    it("renders the primary CTA linking to /register", async () => {
      await renderHome();

      const cta = screen.getByRole("link", { name: /gerar estudo grátis/i });
      expect(cta).toBeInTheDocument();
      expect(cta).toHaveAttribute("href", "/register");
    });

    it("renders the secondary CTA linking to /blog", async () => {
      await renderHome();

      const cta = screen.getByRole("link", {
        name: /ver estudos publicados/i,
      });
      expect(cta).toBeInTheDocument();
      expect(cta).toHaveAttribute("href", "/blog");
    });

    it("renders the trust reducer text", async () => {
      await renderHome();

      expect(
        screen.getByText(/sem cartão de crédito/i),
      ).toBeInTheDocument();
    });
  });

  describe("Features Section", () => {
    const expectedDimensions = [
      "Contexto Histórico",
      "Estudo de Palavras",
      "Teologia",
      "Referências Cruzadas",
      "Comentários",
      "Aplicação Prática",
      "Reflexão Devocional",
    ];

    it("renders the section heading", async () => {
      await renderHome();

      const heading = screen.getByRole("heading", {
        level: 2,
        name: /7 dimensões/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it("renders all 7 feature dimension cards", async () => {
      await renderHome();

      for (const title of expectedDimensions) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    });

    it("renders descriptions for each dimension", async () => {
      await renderHome();

      expect(
        screen.getByText(/cenário cultural, político e literário/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/hebraico e grego/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/temas teológicos/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/passagens relacionadas/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/perspectivas de teólogos/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ações concretas/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/meditações que convidam/i),
      ).toBeInTheDocument();
    });

    it("renders responsive grid classes", async () => {
      await renderHome();

      const grid = document.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass("sm:grid-cols-2");
      expect(grid).toHaveClass("lg:grid-cols-3");
    });
  });

  describe("generateMetadata", () => {
    it("returns correct title", () => {
      const metadata = generateMetadata();
      expect(metadata.title).toBe(
        "Verbum — Estudo Bíblico com Inteligência Artificial",
      );
    });

    it("returns correct description", () => {
      const metadata = generateMetadata();
      expect(metadata.description).toContain("7 dimensões");
      expect(metadata.description).toContain("estudos bíblicos");
    });

    it("returns openGraph with title, description, and type", () => {
      const metadata = generateMetadata();
      const og = metadata.openGraph;

      expect(og).toBeDefined();
      expect(og).toHaveProperty("title");
      expect(og).toHaveProperty("description");
      expect(og).toHaveProperty("type", "website");
      expect(og).toHaveProperty("siteName", "Verbum");
    });

    it("returns openGraph with image configuration", () => {
      const metadata = generateMetadata();
      const og = metadata.openGraph as Record<string, unknown>;
      const images = og.images as Array<Record<string, unknown>>;

      expect(images).toBeDefined();
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveProperty("width", 1200);
      expect(images[0]).toHaveProperty("height", 630);
    });

    it("includes canonical URL in alternates", () => {
      const metadata = generateMetadata();
      expect(metadata.alternates).toEqual({ canonical: "/" });
    });
  });
});
