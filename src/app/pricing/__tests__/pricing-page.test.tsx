// @vitest-environment jsdom
import { render, screen, within, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";

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

afterEach(() => {
  document.body.innerHTML = "";
});

async function renderPricingPage() {
  const PricingPage = (await import("../page")).default;
  await act(async () => {
    render(<PricingPage />);
  });
}

describe("Pricing Page", () => {
  describe("page heading", () => {
    it("renders the page title 'Planos e Preços'", async () => {
      await renderPricingPage();

      const heading = screen.getByRole("heading", {
        level: 1,
        name: /planos e preços/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it("renders the subtitle text", async () => {
      await renderPricingPage();

      expect(
        screen.getByText(
          "Escolha o plano ideal para sua jornada de estudos bíblicos."
        )
      ).toBeInTheDocument();
    });
  });

  describe("plan cards", () => {
    it("renders exactly 4 plan cards", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      expect(cards).toHaveLength(4);
    });

    it("renders 'Gratuito' plan with R$0 price", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const gratuitoCard = cards.find((card) =>
        within(card).queryByText("Gratuito")
      );
      expect(gratuitoCard).toBeDefined();
      expect(within(gratuitoCard!).getByText("R$0")).toBeInTheDocument();
    });

    it("renders 'Estudante' plan with R$9,90 price", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const estudanteCard = cards.find((card) =>
        within(card).queryByText("Estudante")
      );
      expect(estudanteCard).toBeDefined();
      expect(within(estudanteCard!).getByText("R$9,90")).toBeInTheDocument();
    });

    it("renders 'Teólogo' plan with R$39,90 price", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const teologoCard = cards.find((card) =>
        within(card).queryByText("Teólogo")
      );
      expect(teologoCard).toBeDefined();
      expect(within(teologoCard!).getByText("R$39,90")).toBeInTheDocument();
    });

    it("renders 'Comunidade' plan with R$19,90 price", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const comunidadeCard = cards.find((card) =>
        within(card).queryByText("Comunidade")
      );
      expect(comunidadeCard).toBeDefined();
      expect(within(comunidadeCard!).getByText("R$19,90")).toBeInTheDocument();
    });

    it("each plan card displays a /mês period indicator", async () => {
      await renderPricingPage();

      const periods = screen.getAllByText("/mês");
      expect(periods).toHaveLength(4);
    });
  });

  describe("CTA buttons", () => {
    it("'Começar Grátis' CTA links to /register", async () => {
      await renderPricingPage();

      const ctaLink = screen.getByRole("link", { name: /começar grátis/i });
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink).toHaveAttribute("href", "/register");
    });

    it("each plan card has a CTA link", async () => {
      await renderPricingPage();

      expect(
        screen.getByRole("link", { name: /começar grátis/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /assinar estudante/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /assinar teólogo/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /assinar comunidade/i })
      ).toBeInTheDocument();
    });
  });

  describe("highlighted/recommended plan", () => {
    it("exactly one plan card has highlighted styling", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const highlightedCards = cards.filter(
        (card) => card.getAttribute("data-highlighted") !== null
      );
      expect(highlightedCards).toHaveLength(1);
    });

    it("highlighted card displays 'Recomendado' badge", async () => {
      await renderPricingPage();

      const badge = screen.getByText("Recomendado");
      expect(badge).toBeInTheDocument();
    });

    it("'Comunidade' is the highlighted/recommended plan", async () => {
      await renderPricingPage();

      const cards = screen.getAllByRole("article");
      const highlightedCard = cards.find(
        (card) => card.getAttribute("data-highlighted") !== null
      );
      expect(highlightedCard).toBeDefined();
      expect(
        within(highlightedCard!).getByText("Comunidade")
      ).toBeInTheDocument();
    });
  });

  describe("feature comparison section", () => {
    it("renders the comparison section with correct aria-label", async () => {
      await renderPricingPage();

      const section = screen.getByRole("region", {
        name: /comparação de funcionalidades/i,
      });
      expect(section).toBeInTheDocument();
    });

    it("renders 'Compare os planos' heading", async () => {
      await renderPricingPage();

      const heading = screen.getByRole("heading", {
        name: /compare os planos/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it("renders a comparison table with plan names as column headers", async () => {
      await renderPricingPage();

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      const headers = within(table).getAllByRole("columnheader");
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts).toContain("Gratuito");
      expect(headerTexts).toContain("Estudante");
      expect(headerTexts).toContain("Teólogo");
      expect(headerTexts).toContain("Comunidade");
    });

    it("comparison table has feature rows", async () => {
      await renderPricingPage();

      const table = screen.getByRole("table");
      const rows = within(table).getAllByRole("row");
      // header row + at least 1 data row
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  describe("metadata export", () => {
    it("exports metadata with correct title", async () => {
      const { metadata } = await import("../page");
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe("Planos e Preços — Verbum");
    });

    it("exports metadata with correct description", async () => {
      const { metadata } = await import("../page");
      expect(metadata.description).toBe(
        "Escolha o plano ideal para aprofundar seus estudos bíblicos com o Verbum."
      );
    });
  });
});
