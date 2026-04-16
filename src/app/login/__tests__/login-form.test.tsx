import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import type { SignInState } from "../actions";

const mockSearchParamsGet = vi.hoisted(() => vi.fn().mockReturnValue(null));

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

let mockState: SignInState = {};
let mockPending = false;
const mockFormAction = vi.fn();

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [mockState, mockFormAction, mockPending],
  };
});

vi.mock("../actions", () => ({
  signIn: vi.fn(),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
  mockState = {};
  mockPending = false;
  mockSearchParamsGet.mockReturnValue(null);
});

async function renderLoginForm() {
  const { default: LoginForm } = await import("../login-form");
  await act(() => {
    render(<LoginForm />);
  });
}

describe("LoginForm", () => {
  it("renders email input field", async () => {
    await renderLoginForm();

    const emailInput = screen.getByLabelText("E-mail");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toBeRequired();
  });

  it("renders password input field", async () => {
    await renderLoginForm();

    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("name", "password");
    expect(passwordInput).toBeRequired();
  });

  it("renders submit button with 'Entrar' text", async () => {
    await renderLoginForm();

    const submitButton = screen.getByRole("button", { name: /entrar/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it("renders navigation links", async () => {
    await renderLoginForm();

    const signupLink = screen.getByText("Criar conta");
    expect(signupLink).toHaveAttribute("href", "/auth/signup");

    const forgotLink = screen.getByText("Esqueceu a senha?");
    expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("shows error message when state has error", async () => {
    mockState = { error: "E-mail ou senha inválidos" };

    await renderLoginForm();

    expect(screen.getByText("E-mail ou senha inválidos")).toBeInTheDocument();
  });

  it("shows email field error from state", async () => {
    mockState = {
      fieldErrors: { email: ["O e-mail é obrigatório"] },
    };

    await renderLoginForm();

    expect(screen.getByText("O e-mail é obrigatório")).toBeInTheDocument();
  });

  it("shows password field error from state", async () => {
    mockState = {
      fieldErrors: { password: ["A senha é obrigatória"] },
    };

    await renderLoginForm();

    expect(screen.getByText("A senha é obrigatória")).toBeInTheDocument();
  });

  it("shows loading state when pending", async () => {
    mockPending = true;

    await renderLoginForm();

    const submitButton = screen.getByRole("button", { name: /entrando/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Entrando...")).toBeInTheDocument();
  });

  it("does not show error message when state is empty", async () => {
    await renderLoginForm();

    const errorElements = document.querySelectorAll(".text-red-700, .text-red-600");
    expect(errorElements.length).toBe(0);
  });

  it("sets form action to the formAction from useActionState", async () => {
    await renderLoginForm();

    const form = screen.getByRole("button", { name: /entrar/i }).closest("form");
    expect(form).toBeInTheDocument();
  });

  it("shows both field errors and general error simultaneously", async () => {
    mockState = {
      error: "E-mail ou senha inválidos",
      fieldErrors: {
        email: ["Formato de e-mail inválido"],
      },
    };

    await renderLoginForm();

    expect(screen.getByText("E-mail ou senha inválidos")).toBeInTheDocument();
    expect(screen.getByText("Formato de e-mail inválido")).toBeInTheDocument();
  });

  it("includes hidden redirect field when redirect search param is present", async () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "redirect" ? "/estudos/abc" : null,
    );

    await renderLoginForm();

    const hiddenInput = document.querySelector(
      'input[type="hidden"][name="redirect"]',
    ) as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput.value).toBe("/estudos/abc");
  });

  it("does not include hidden redirect field when no redirect param", async () => {
    await renderLoginForm();

    const hiddenInput = document.querySelector(
      'input[type="hidden"][name="redirect"]',
    );
    expect(hiddenInput).toBeNull();
  });
});
