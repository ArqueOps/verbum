import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg data-testid="check-icon" className={className} />
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

import { PricingCard } from "../pricing-card";

const baseProps = {
  planName: "Plano Básico",
  price: "R$ 19,90/mês",
  features: ["Estudos ilimitados", "Planos de leitura", "Suporte por email"],
  ctaText: "Começar agora",
  ctaHref: "/assinar/basico",
};

describe("PricingCard", () => {
  it("renders plan name correctly", () => {
    render(<PricingCard {...baseProps} />);

    expect(screen.getByText("Plano Básico")).toBeInTheDocument();
  });

  it("renders price correctly", () => {
    render(<PricingCard {...baseProps} />);

    expect(screen.getByText("R$ 19,90/mês")).toBeInTheDocument();
  });

  it("renders all features with checkmarks", () => {
    render(<PricingCard {...baseProps} />);

    const list = screen.getByRole("list");
    const items = screen.getAllByRole("listitem");

    expect(list).toBeInTheDocument();
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Estudos ilimitados");
    expect(items[1]).toHaveTextContent("Planos de leitura");
    expect(items[2]).toHaveTextContent("Suporte por email");

    const checkIcons = screen.getAllByTestId("check-icon");
    expect(checkIcons).toHaveLength(3);
  });

  it("renders 'Mais Popular' badge when isHighlighted=true", () => {
    render(<PricingCard {...baseProps} isHighlighted={true} />);

    expect(screen.getByText("Mais Popular")).toBeInTheDocument();
  });

  it("does NOT render 'Mais Popular' badge when isHighlighted=false", () => {
    render(<PricingCard {...baseProps} isHighlighted={false} />);

    expect(screen.queryByText("Mais Popular")).not.toBeInTheDocument();
  });

  it("does NOT render 'Mais Popular' badge by default (isHighlighted omitted)", () => {
    render(<PricingCard {...baseProps} />);

    expect(screen.queryByText("Mais Popular")).not.toBeInTheDocument();
  });

  it("renders CTA button with correct text", () => {
    render(<PricingCard {...baseProps} />);

    const cta = screen.getByText("Começar agora");
    expect(cta).toBeInTheDocument();
  });

  it("renders CTA button with correct href", () => {
    render(<PricingCard {...baseProps} />);

    const cta = screen.getByText("Começar agora");
    expect(cta).toHaveAttribute("href", "/assinar/basico");
  });

  it("renders with different plan data", () => {
    render(
      <PricingCard
        planName="Plano Premium"
        price="R$ 49,90/mês"
        features={["Tudo do Básico", "Comentários bíblicos", "Acesso offline", "Suporte prioritário"]}
        ctaText="Assinar Premium"
        ctaHref="/assinar/premium"
        isHighlighted={true}
      />,
    );

    expect(screen.getByText("Plano Premium")).toBeInTheDocument();
    expect(screen.getByText("R$ 49,90/mês")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Mais Popular")).toBeInTheDocument();

    const cta = screen.getByText("Assinar Premium");
    expect(cta).toHaveAttribute("href", "/assinar/premium");
  });

  it("renders with empty features list", () => {
    render(<PricingCard {...baseProps} features={[]} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
  });
});
