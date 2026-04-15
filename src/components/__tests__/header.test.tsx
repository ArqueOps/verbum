import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "../header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("lucide-react", () => ({
  Menu: ({ size, strokeWidth }: { size: number; strokeWidth: number }) => (
    <svg data-testid="menu-icon" width={size} strokeWidth={strokeWidth} />
  ),
  X: ({ size, strokeWidth }: { size: number; strokeWidth: number }) => (
    <svg data-testid="x-icon" width={size} strokeWidth={strokeWidth} />
  ),
}));

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

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Verbum logo text", () => {
    render(<Header />);

    const logo = screen.getByLabelText("Verbum — Página inicial");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent("Verbum");
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders all 4 navigation links with correct hrefs", () => {
    render(<Header />);

    const nav = screen.getByLabelText("Navegação principal");
    const links = nav.querySelectorAll("a");

    expect(links).toHaveLength(4);

    const expectedLinks = [
      { href: "/", label: "Início" },
      { href: "/estudos", label: "Estudos" },
      { href: "/planos", label: "Planos de Leitura" },
      { href: "/biblioteca", label: "Minha Biblioteca" },
    ];

    expectedLinks.forEach(({ href, label }) => {
      const link = Array.from(links).find((a) => a.getAttribute("href") === href);
      expect(link).toBeDefined();
      expect(link).toHaveTextContent(label);
    });
  });

  it("displays Portuguese text with correct accentuation", () => {
    render(<Header />);

    expect(screen.getAllByText("Início")).toHaveLength(1);
    expect(screen.getAllByText("Planos de Leitura")).toHaveLength(1);
  });

  it("renders a mobile menu toggle button that is accessible", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "mobile-menu");
    expect(button).toHaveAttribute("type", "button");
  });

  it("uses semantic HTML with <header> and <nav> elements", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(nav).toBeInTheDocument();
  });

  it("marks the active link with aria-current='page' on home route", () => {
    render(<Header />);

    const nav = screen.getByLabelText("Navegação principal");
    const homeLink = nav.querySelector('a[href="/"]');
    expect(homeLink).toHaveAttribute("aria-current", "page");

    const estudosLink = nav.querySelector('a[href="/estudos"]');
    expect(estudosLink).not.toHaveAttribute("aria-current");
  });
});
