import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "../footer";

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

describe("Footer", () => {
  it("renders Verbum branding with tagline", () => {
    render(<Footer />);

    expect(screen.getByText("Verbum")).toBeInTheDocument();
    expect(screen.getByText("Profundidade que ilumina")).toBeInTheDocument();
  });

  it("renders navigation links with correct hrefs", () => {
    render(<Footer />);

    const nav = screen.getByLabelText("Links do rodapé");
    const links = nav.querySelectorAll("a");

    const expectedLinks = [
      { href: "/", label: "Início" },
      { href: "/estudos", label: "Estudos" },
      { href: "/planos", label: "Planos de Leitura" },
      { href: "/blog", label: "Blog" },
      { href: "/precos", label: "Preços" },
    ];

    expectedLinks.forEach(({ href, label }) => {
      const link = Array.from(links).find(
        (a) => a.getAttribute("href") === href,
      );
      expect(link).toBeDefined();
      expect(link).toHaveTextContent(label);
    });
  });

  it("renders legal links (Termos and Privacidade)", () => {
    render(<Footer />);

    const legalNav = screen.getByLabelText("Links legais");
    const links = legalNav.querySelectorAll("a");

    expect(links).toHaveLength(2);

    const termos = Array.from(links).find(
      (a) => a.getAttribute("href") === "/termos",
    );
    expect(termos).toBeDefined();
    expect(termos).toHaveTextContent("Termos de Uso");

    const privacidade = Array.from(links).find(
      (a) => a.getAttribute("href") === "/privacidade",
    );
    expect(privacidade).toBeDefined();
    expect(privacidade).toHaveTextContent("Privacidade");
  });

  it("renders copyright notice with the current year", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    const copyright = screen.getByText(
      new RegExp(`© ${currentYear} Verbum`),
    );
    expect(copyright).toBeInTheDocument();
    expect(copyright).toHaveTextContent("Todos os direitos reservados");
  });

  it("uses semantic HTML with <footer> element", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("displays Portuguese text with correct accentuation", () => {
    render(<Footer />);

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Preços")).toBeInTheDocument();
    expect(screen.getByText("Navegação")).toBeInTheDocument();
  });
});
