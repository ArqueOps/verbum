import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { ThemeToggle } from "../theme-toggle";

const mockSetTheme = vi.fn();
let mockTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockTheme = "light";
});

async function renderThemeToggle() {
  await act(async () => {
    render(<ThemeToggle />);
  });
}

describe("ThemeToggle", () => {
  it("renders without crashing", async () => {
    await renderThemeToggle();

    const button = screen.getByRole("button", { name: /alternar tema/i });
    expect(button).toBeInTheDocument();
  });

  it("has aria-label in Portuguese", async () => {
    await renderThemeToggle();

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Alternar tema");
  });

  it("displays moon icon when theme is light", async () => {
    mockTheme = "light";
    await renderThemeToggle();

    expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("sun-icon")).not.toBeInTheDocument();
  });

  it("displays sun icon when theme is dark", async () => {
    mockTheme = "dark";
    await renderThemeToggle();

    expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("moon-icon")).not.toBeInTheDocument();
  });

  it("calls setTheme with 'dark' when current theme is light", async () => {
    mockTheme = "light";
    await renderThemeToggle();

    const button = screen.getByRole("button", { name: /alternar tema/i });
    await userEvent.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });

  it("calls setTheme with 'light' when current theme is dark", async () => {
    mockTheme = "dark";
    await renderThemeToggle();

    const button = screen.getByRole("button", { name: /alternar tema/i });
    await userEvent.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });

  it("renders button with aria-label even before hydration completes", () => {
    // Verify the component always has the accessible label,
    // both in mounted and unmounted states
    const { unmount } = render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /alternar tema/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Alternar tema");

    unmount();
  });

  it("does not call setTheme when not clicked", async () => {
    await renderThemeToggle();

    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
