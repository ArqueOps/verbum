// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

const mockFormAction = vi.fn();
const mockUseActionState = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    useActionState: (...args: unknown[]) => mockUseActionState(...args),
  };
});

vi.mock("@/app/(auth)/actions", () => ({
  signIn: vi.fn(),
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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.PropsWithChildren<React.LabelHTMLAttributes<HTMLLabelElement>>) => (
    <label {...props}>{children}</label>
  ),
}));

import { LoginForm } from "../login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActionState.mockReturnValue([
      { error: null, success: false },
      mockFormAction,
      false,
    ]);
  });

  it("renders email input field", () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("E-mail");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("name", "email");
  });

  it("renders password input field", () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("name", "password");
  });

  it("renders submit button with correct text", () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole("button", { name: "Entrar" });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("renders link to signup page", () => {
    render(<LoginForm />);

    const signupLink = screen.getByRole("link", { name: /criar conta/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("displays error message when authentication fails", () => {
    mockUseActionState.mockReturnValue([
      { error: "E-mail ou senha incorretos. Tente novamente.", success: false },
      mockFormAction,
      false,
    ]);

    render(<LoginForm />);

    const errorMessage = screen.getByText(
      "E-mail ou senha incorretos. Tente novamente."
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it("does not display error message when there is no error", () => {
    render(<LoginForm />);

    const errorMessage = screen.queryByText(
      "E-mail ou senha incorretos. Tente novamente."
    );
    expect(errorMessage).not.toBeInTheDocument();
  });

  it("disables submit button when form is pending", () => {
    mockUseActionState.mockReturnValue([
      { error: null, success: false },
      mockFormAction,
      true,
    ]);

    render(<LoginForm />);

    const submitButton = screen.getByRole("button", { name: "Entrando..." });
    expect(submitButton).toBeDisabled();
  });

  it("shows loading text on submit button when pending", () => {
    mockUseActionState.mockReturnValue([
      { error: null, success: false },
      mockFormAction,
      true,
    ]);

    render(<LoginForm />);

    expect(screen.getByText("Entrando...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("submit button is enabled when not pending", () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole("button", { name: "Entrar" });
    expect(submitButton).not.toBeDisabled();
  });

  it("renders card heading and description in Portuguese", () => {
    render(<LoginForm />);

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(
      screen.getByText("Insira seu e-mail e senha para acessar sua conta.")
    ).toBeInTheDocument();
  });
});
