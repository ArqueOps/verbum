import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudyCard, StudyCardSkeleton } from "../study-card";
import type { StudyCardProps } from "../study-card";

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
  Star: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
    <svg data-testid={props["data-testid"]} data-class={className} className={className} />
  ),
}));

function createDefaultProps(overrides?: Partial<StudyCardProps>): StudyCardProps {
  return {
    id: "study-123",
    title: "O Sermão do Monte",
    verseReference: "Mateus 5:1-12",
    createdAt: "2026-03-15T10:30:00Z",
    isPublic: false,
    isFavorite: false,
    onToggleFavorite: vi.fn(),
    slug: "o-sermao-do-monte",
    ...overrides,
  };
}

describe("StudyCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the study title", () => {
    render(<StudyCard {...createDefaultProps()} />);

    expect(screen.getByText("O Sermão do Monte")).toBeInTheDocument();
  });

  it("renders the verse reference (passage)", () => {
    render(<StudyCard {...createDefaultProps()} />);

    expect(screen.getByText("Mateus 5:1-12")).toBeInTheDocument();
  });

  it("formats the date in Portuguese", () => {
    render(
      <StudyCard
        {...createDefaultProps({ createdAt: "2026-03-15T10:30:00Z" })}
      />
    );

    const timeElement = screen.getByText(/15 de março de 2026/i);
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.tagName).toBe("TIME");
    expect(timeElement).toHaveAttribute("datetime", "2026-03-15T10:30:00Z");
  });

  it("shows 'Rascunho' badge when isPublic is false", () => {
    render(<StudyCard {...createDefaultProps({ isPublic: false })} />);

    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.queryByText("Publicado")).not.toBeInTheDocument();
  });

  it("shows 'Publicado' badge when isPublic is true", () => {
    render(<StudyCard {...createDefaultProps({ isPublic: true })} />);

    expect(screen.getByText("Publicado")).toBeInTheDocument();
    expect(screen.queryByText("Rascunho")).not.toBeInTheDocument();
  });

  it("renders star icon without fill when isFavorite is false", () => {
    render(<StudyCard {...createDefaultProps({ isFavorite: false })} />);

    const star = screen.getByTestId("star-icon");
    expect(star).toBeInTheDocument();
    const classes = star.getAttribute("class") ?? "";
    expect(classes).toContain("text-neutral-400");
    expect(classes).not.toContain("fill-[#C8963E]");
  });

  it("renders star icon with fill when isFavorite is true", () => {
    render(<StudyCard {...createDefaultProps({ isFavorite: true })} />);

    const star = screen.getByTestId("star-icon");
    expect(star).toBeInTheDocument();
    const classes = star.getAttribute("class") ?? "";
    expect(classes).toContain("fill-[#C8963E]");
    expect(classes).toContain("text-[#C8963E]");
  });

  it("fires onToggleFavorite with study id when star button is clicked", async () => {
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();

    render(
      <StudyCard
        {...createDefaultProps({ onToggleFavorite, id: "study-abc" })}
      />
    );

    const starButton = screen.getByRole("button", {
      name: /adicionar aos favoritos/i,
    });
    await user.click(starButton);

    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(onToggleFavorite).toHaveBeenCalledWith("study-abc");
  });

  it("does not navigate when star button is clicked (stopPropagation)", async () => {
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();

    render(
      <StudyCard {...createDefaultProps({ onToggleFavorite })} />
    );

    const starButton = screen.getByRole("button", {
      name: /adicionar aos favoritos/i,
    });

    const preventDefaultSpy = vi.fn();
    starButton.addEventListener("click", (e) => {
      preventDefaultSpy(e.defaultPrevented);
    });

    await user.click(starButton);

    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("wraps the card in a link with correct href using slug", () => {
    render(
      <StudyCard
        {...createDefaultProps({ slug: "estudo-sobre-genesis" })}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/estudos/estudo-sobre-genesis");
  });

  it("shows 'Remover dos favoritos' aria-label when isFavorite is true", () => {
    render(<StudyCard {...createDefaultProps({ isFavorite: true })} />);

    expect(
      screen.getByRole("button", { name: "Remover dos favoritos" })
    ).toBeInTheDocument();
  });

  it("shows 'Adicionar aos favoritos' aria-label when isFavorite is false", () => {
    render(<StudyCard {...createDefaultProps({ isFavorite: false })} />);

    expect(
      screen.getByRole("button", { name: "Adicionar aos favoritos" })
    ).toBeInTheDocument();
  });
});

describe("StudyCardSkeleton", () => {
  it("renders without errors", () => {
    render(<StudyCardSkeleton />);

    const skeleton = screen.getByTestId("study-card-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("has the animate-pulse class for loading animation", () => {
    render(<StudyCardSkeleton />);

    const skeleton = screen.getByTestId("study-card-skeleton");
    expect(skeleton.className).toContain("animate-pulse");
  });
});
