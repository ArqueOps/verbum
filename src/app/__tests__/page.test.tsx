// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import Home from "../page";

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

function renderHome() {
  return act(() => {
    render(<Home />);
  });
}

describe("Home Page", () => {
  it("renders the hero section", async () => {
    await renderHome();

    const heroSection = screen.getByRole("region", { name: /hero/i });
    expect(heroSection).toBeInTheDocument();
  });

  it("renders the tagline 'Profundidade que ilumina'", async () => {
    await renderHome();

    const tagline = screen.getByText("Profundidade que ilumina");
    expect(tagline).toBeInTheDocument();
  });

  it("renders the app title 'Verbum'", async () => {
    await renderHome();

    const title = screen.getByRole("heading", { level: 1, name: /verbum/i });
    expect(title).toBeInTheDocument();
  });

  it("renders CTA button 'Comece seu estudo' with correct role", async () => {
    await renderHome();

    const ctaButton = screen.getByRole("button", {
      name: /comece seu estudo/i,
    });
    expect(ctaButton).toBeInTheDocument();
  });

  it("CTA links to the study page", async () => {
    await renderHome();

    const ctaLink = screen.getByRole("button", {
      name: /comece seu estudo/i,
    });
    expect(ctaLink).toHaveAttribute("href", "/estudo");
  });
});
