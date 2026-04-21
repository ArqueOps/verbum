import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("lucide-react", () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
}));

import { SearchBar } from "../search-bar";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders input with default placeholder 'Buscar estudos...'", () => {
    render(<SearchBar />);

    const input = screen.getByTestId("search-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Buscar estudos...");
  });

  it("renders search icon", () => {
    render(<SearchBar />);
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("accepts a custom placeholder", () => {
    render(<SearchBar placeholder="Pesquisar..." />);
    expect(screen.getByTestId("search-input")).toHaveAttribute(
      "placeholder",
      "Pesquisar...",
    );
  });

  it("fires onChange only after 300ms debounce", () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "gênesis" } });

    // Not called immediately
    expect(onChange).not.toHaveBeenCalled();

    // Advance 299ms — still not called
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onChange).not.toHaveBeenCalled();

    // Advance to 300ms — now called
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("gênesis");
  });

  it("resets debounce timer on subsequent typing", () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);

    const input = screen.getByTestId("search-input");

    fireEvent.change(input, { target: { value: "gên" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Type more before debounce fires
    fireEvent.change(input, { target: { value: "gênesis" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // First debounce was cancelled, not yet fired
    expect(onChange).not.toHaveBeenCalled();

    // Complete the second debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("gênesis");
  });

  it("does not show clear button when input is empty", () => {
    render(<SearchBar />);
    expect(
      screen.queryByRole("button", { name: "Limpar busca" }),
    ).not.toBeInTheDocument();
  });

  it("shows clear button when input has text (uncontrolled)", () => {
    render(<SearchBar />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "salmos" } });

    expect(
      screen.getByRole("button", { name: "Limpar busca" }),
    ).toBeInTheDocument();
  });

  it("shows clear button when controlled value is non-empty", () => {
    render(<SearchBar value="salmos" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Limpar busca" }),
    ).toBeInTheDocument();
  });

  it("clears input and calls onChange immediately on clear click", () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "salmos" } });

    const clearButton = screen.getByRole("button", { name: "Limpar busca" });
    fireEvent.click(clearButton);

    // onChange called immediately with empty string (no debounce)
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("works as controlled component with value prop", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchBar value="inicial" onChange={onChange} />,
    );

    const input = screen.getByTestId("search-input");
    expect(input).toHaveValue("inicial");

    // Rerender with new value
    rerender(<SearchBar value="atualizado" onChange={onChange} />);
    expect(input).toHaveValue("atualizado");
  });

  it("applies additional className via className prop", () => {
    const { container } = render(<SearchBar className="max-w-md" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("max-w-md")).toBe(true);
  });

  it("has proper aria-label for accessibility", () => {
    render(<SearchBar />);

    const input = screen.getByTestId("search-input");
    expect(input).toHaveAttribute("aria-label", "Buscar estudos...");
  });

  it("cleans up debounce timer on unmount", () => {
    const onChange = vi.fn();
    const { unmount } = render(<SearchBar onChange={onChange} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "test" } });

    unmount();

    // Advance past debounce — onChange should NOT fire after unmount
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
