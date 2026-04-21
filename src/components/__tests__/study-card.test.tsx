import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lucide-react", () => ({
  Eye: ({ className }: { className?: string }) => (
    <svg data-testid="eye-icon" className={className} />
  ),
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
  GlobeLock: ({ className }: { className?: string }) => (
    <svg data-testid="globe-lock-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
  Star: ({ className }: { className?: string }) => (
    <svg data-testid="star-icon" className={className} />
  ),
}));

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

import { StudyCard } from "../study-card";

const baseProps = {
  title: "Estudo sobre Gênesis",
  verseReference: "Gênesis 1:1-3",
  createdAt: "2026-04-10T12:00:00Z",
  href: "/estudos/estudo-1",
};

describe("StudyCard — publish/unpublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Publicar' button when isPublic=false", () => {
    const onTogglePublish = vi.fn();

    render(
      <StudyCard
        {...baseProps}
        isPublic={false}
        onTogglePublish={onTogglePublish}
      />,
    );

    const button = screen.getByRole("button", { name: "Publicar estudo" });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("globe-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("globe-lock-icon")).not.toBeInTheDocument();
  });

  it("renders 'Despublicar' button when isPublic=true", () => {
    const onTogglePublish = vi.fn();

    render(
      <StudyCard
        {...baseProps}
        isPublic={true}
        onTogglePublish={onTogglePublish}
      />,
    );

    const button = screen.getByRole("button", { name: "Despublicar estudo" });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("globe-lock-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("globe-icon")).not.toBeInTheDocument();
  });

  it("shows badge 'Rascunho' when isPublic=false", () => {
    render(<StudyCard {...baseProps} isPublic={false} />);

    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.queryByText("Publicado")).not.toBeInTheDocument();
  });

  it("shows badge 'Publicado' when isPublic=true", () => {
    render(<StudyCard {...baseProps} isPublic={true} />);

    expect(screen.getByText("Publicado")).toBeInTheDocument();
    expect(screen.queryByText("Rascunho")).not.toBeInTheDocument();
  });

  it("shows loading state when publishLoading=true (button disabled with spinner)", () => {
    const onTogglePublish = vi.fn();

    render(
      <StudyCard
        {...baseProps}
        isPublic={false}
        onTogglePublish={onTogglePublish}
        publishLoading={true}
      />,
    );

    const button = screen.getByRole("button", { name: "Publicar estudo" });
    expect(button).toBeDisabled();
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("globe-icon")).not.toBeInTheDocument();
  });

  it("calls onTogglePublish when publish button is clicked", () => {
    const onTogglePublish = vi.fn();

    render(
      <StudyCard
        {...baseProps}
        isPublic={false}
        onTogglePublish={onTogglePublish}
      />,
    );

    const button = screen.getByRole("button", { name: "Publicar estudo" });
    fireEvent.click(button);

    expect(onTogglePublish).toHaveBeenCalledOnce();
  });

  it("does not render publish button when onTogglePublish is not provided", () => {
    render(<StudyCard {...baseProps} isPublic={false} />);

    expect(
      screen.queryByRole("button", { name: "Publicar estudo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Despublicar estudo" }),
    ).not.toBeInTheDocument();
  });

  it("does not call onTogglePublish when button is disabled (loading)", () => {
    const onTogglePublish = vi.fn();

    render(
      <StudyCard
        {...baseProps}
        isPublic={false}
        onTogglePublish={onTogglePublish}
        publishLoading={true}
      />,
    );

    const button = screen.getByRole("button", { name: "Publicar estudo" });
    fireEvent.click(button);

    expect(onTogglePublish).not.toHaveBeenCalled();
  });
});
