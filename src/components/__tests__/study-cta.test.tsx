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

import { StudyCTA } from "../study/StudyCTA";

describe("StudyCTA", () => {
  it("renders with text 'Gere seu próprio estudo'", () => {
    render(<StudyCTA isAuthenticated={false} />);

    expect(screen.getByText("Gere seu próprio estudo")).toBeInTheDocument();
  });

  it("links to /generate when user is authenticated", () => {
    render(<StudyCTA isAuthenticated={true} />);

    const link = screen.getByRole("link", { name: "Começar agora" });
    expect(link).toHaveAttribute("href", "/generate");
  });

  it("links to /login?redirect=/generate when user is not authenticated", () => {
    render(<StudyCTA isAuthenticated={false} />);

    const link = screen.getByRole("link", { name: "Começar agora" });
    expect(link).toHaveAttribute("href", "/login?redirect=/generate");
  });

  it("renders the call-to-action link in both auth states", () => {
    const { unmount } = render(<StudyCTA isAuthenticated={true} />);
    expect(screen.getByRole("link", { name: "Começar agora" })).toBeInTheDocument();
    unmount();

    render(<StudyCTA isAuthenticated={false} />);
    expect(screen.getByRole("link", { name: "Começar agora" })).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<StudyCTA isAuthenticated={false} />);

    expect(
      screen.getByText("Crie estudos bíblicos personalizados com inteligência artificial"),
    ).toBeInTheDocument();
  });
});
