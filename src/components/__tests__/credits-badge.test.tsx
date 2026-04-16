import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Polyfill Element.animate for jsdom (Web Animations API not available)
if (typeof Element.prototype.animate !== "function") {
  Element.prototype.animate = vi.fn().mockReturnValue({ finished: Promise.resolve() });
}

// --- Mock setup (hoisted above imports) ---

const mockUseCredits = vi.fn<() => {
    creditsRemaining: number | null;
    isLoading: boolean;
    isUnlimited: boolean;
    decrementCredits: () => void;
    refreshCredits: () => Promise<void>;
  }>();

vi.mock("@/hooks/use-credits", () => ({
  useCredits: () => mockUseCredits(),
}));

vi.mock("lucide-react", () => ({
  Coins: (props: Record<string, unknown>) => (
    <svg data-testid="coins-icon" {...props} />
  ),
}));

import { CreditsBadge } from "../layout/CreditsBadge";

// --- Helpers ---

function setupCredits(overrides: Partial<ReturnType<typeof mockUseCredits>> = {}) {
  const defaults = {
    creditsRemaining: 3,
    isLoading: false,
    isUnlimited: false,
    decrementCredits: vi.fn(),
    refreshCredits: vi.fn().mockResolvedValue(undefined),
  };
  const merged = { ...defaults, ...overrides };
  mockUseCredits.mockReturnValue(merged);
  return merged;
}

// --- Tests ---

describe("CreditsBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering credit count ──────────────────────────────────

  it("renders the numeric credit count when credits are available", () => {
    // Arrange
    setupCredits({ creditsRemaining: 5 });

    // Act
    render(<CreditsBadge />);

    // Assert
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders 0 when user has zero credits remaining", () => {
    // Arrange
    setupCredits({ creditsRemaining: 0 });

    // Act
    render(<CreditsBadge />);

    // Assert
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders the infinity symbol for unlimited (subscriber) users", () => {
    // Arrange
    setupCredits({ creditsRemaining: Infinity, isUnlimited: true });

    // Act
    render(<CreditsBadge />);

    // Assert — ∞ is U+221E
    expect(screen.getByText("\u221E")).toBeInTheDocument();
  });

  // ── Title / tooltip attribute ───────────────────────────────

  it("displays tooltip with remaining credit count", () => {
    // Arrange
    setupCredits({ creditsRemaining: 5 });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: 5");
    expect(badge).toBeInTheDocument();
  });

  it("displays tooltip with 'ilimitados' for unlimited users", () => {
    // Arrange
    setupCredits({ creditsRemaining: Infinity, isUnlimited: true });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: ilimitados");
    expect(badge).toBeInTheDocument();
  });

  it("displays tooltip showing 0 when no credits remain", () => {
    // Arrange
    setupCredits({ creditsRemaining: 0 });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: 0");
    expect(badge).toBeInTheDocument();
  });

  // ── Loading state ───────────────────────────────────────────

  it("renders a loading skeleton when credits are being fetched", () => {
    // Arrange
    setupCredits({ isLoading: true, creditsRemaining: null });

    // Act
    const { container } = render(<CreditsBadge />);

    // Assert — skeleton has animate-pulse class and no credit text
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("coins-icon")).not.toBeInTheDocument();
  });

  it("does not render skeleton after loading completes", () => {
    // Arrange
    setupCredits({ isLoading: false, creditsRemaining: 3 });

    // Act
    const { container } = render(<CreditsBadge />);

    // Assert
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // ── Color coding (badge state) ─────────────────────────────

  it("applies emerald color when credits > 2", () => {
    // Arrange
    setupCredits({ creditsRemaining: 3 });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: 3");
    expect(badge.className).toContain("bg-emerald-100");
    expect(badge.className).toContain("text-emerald-700");
  });

  it("applies emerald color for unlimited users", () => {
    // Arrange
    setupCredits({ creditsRemaining: Infinity, isUnlimited: true });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: ilimitados");
    expect(badge.className).toContain("bg-emerald-100");
  });

  it("applies amber color when credits are 1 or 2", () => {
    // Arrange
    setupCredits({ creditsRemaining: 2 });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: 2");
    expect(badge.className).toContain("bg-amber-100");
    expect(badge.className).toContain("text-amber-700");
  });

  it("applies amber color when exactly 1 credit remains", () => {
    // Arrange
    setupCredits({ creditsRemaining: 1 });

    // Act
    render(<CreditsBadge />);

    // Assert
    const badge = screen.getByTitle("Créditos restantes: 1");
    expect(badge.className).toContain("bg-amber-100");
  });

  it("applies red color when credits are 0 (no credits, no subscription)", () => {
    // Arrange
    setupCredits({ creditsRemaining: 0, isUnlimited: false });

    // Act
    render(<CreditsBadge />);

    // Assert — red badge signals disabled/blocked state
    const badge = screen.getByTitle("Créditos restantes: 0");
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-700");
  });

  // ── Icon ────────────────────────────────────────────────────

  it("renders the Coins icon inside the badge", () => {
    // Arrange
    setupCredits({ creditsRemaining: 5 });

    // Act
    render(<CreditsBadge />);

    // Assert
    expect(screen.getByTestId("coins-icon")).toBeInTheDocument();
  });

  it("does not render the Coins icon during loading", () => {
    // Arrange
    setupCredits({ isLoading: true, creditsRemaining: null });

    // Act
    render(<CreditsBadge />);

    // Assert
    expect(screen.queryByTestId("coins-icon")).not.toBeInTheDocument();
  });

  // ── Credit count updates (re-render simulation) ────────────

  it("updates displayed count when credits decrement after generation", () => {
    // Arrange — start with 3 credits
    const hookValues = setupCredits({ creditsRemaining: 3 });

    // Act — initial render
    const { rerender } = render(<CreditsBadge />);
    expect(screen.getByText("3")).toBeInTheDocument();

    // Simulate credit decrement (as happens after study generation)
    mockUseCredits.mockReturnValue({
      ...hookValues,
      creditsRemaining: 2,
    });

    // Act — re-render with updated credits
    rerender(<CreditsBadge />);

    // Assert — count decremented
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    const badge = screen.getByTitle("Créditos restantes: 2");
    expect(badge.className).toContain("bg-amber-100");
  });

  it("transitions from emerald to red when credits deplete fully", () => {
    // Arrange — start with 1 credit
    const hookValues = setupCredits({ creditsRemaining: 1 });

    const { rerender } = render(<CreditsBadge />);
    expect(screen.getByTitle("Créditos restantes: 1").className).toContain("bg-amber-100");

    // Act — credits reach 0
    mockUseCredits.mockReturnValue({
      ...hookValues,
      creditsRemaining: 0,
    });
    rerender(<CreditsBadge />);

    // Assert
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByTitle("Créditos restantes: 0").className).toContain("bg-red-100");
  });

  it("transitions from loading to displaying credits", () => {
    // Arrange — start loading
    const hookValues = setupCredits({ isLoading: true, creditsRemaining: null });

    const { container, rerender } = render(<CreditsBadge />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();

    // Act — loading finishes
    mockUseCredits.mockReturnValue({
      ...hookValues,
      isLoading: false,
      creditsRemaining: 5,
    });
    rerender(<CreditsBadge />);

    // Assert
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // ── Null creditsRemaining edge case ─────────────────────────

  it("handles null creditsRemaining gracefully (fallback to 0 for color)", () => {
    // Arrange — creditsRemaining is null (e.g., unauthenticated but not loading)
    setupCredits({ creditsRemaining: null, isLoading: false });

    // Act
    render(<CreditsBadge />);

    // Assert — should render without crashing; badgeColor falls back to 0
    const badge = screen.getByTitle(/Créditos restantes/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-red-100");
  });
});
