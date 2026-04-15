import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import type { SignupState } from "../actions";

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

let mockState: SignupState = undefined;
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
  signUp: vi.fn(),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
  mockState = undefined;
  mockPending = false;
});

async function renderSignupForm() {
  const { default: SignupForm } = await import("../signup-form");
  await act(() => {
    render(<SignupForm />);
  });
}

describe("SignupForm", () => {
  it("renders all four input fields", async () => {
    await renderSignupForm();

    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha")).toBeInTheDocument();
  });

  it("renders fields with correct types and names", async () => {
    await renderSignupForm();

    const fullName = screen.getByLabelText("Nome completo");
    expect(fullName).toHaveAttribute("type", "text");
    expect(fullName).toHaveAttribute("name", "fullName");

    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("name", "email");

    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("name", "password");

    const confirmPassword = screen.getByLabelText("Confirmar senha");
    expect(confirmPassword).toHaveAttribute("type", "password");
    expect(confirmPassword).toHaveAttribute("name", "confirmPassword");
  });

  it("renders submit button with 'Criar conta' text", async () => {
    await renderSignupForm();

    const button = screen.getByRole("button", { name: /criar conta/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders login link", async () => {
    await renderSignupForm();

    const loginLink = screen.getByText("Entrar");
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("shows confirmation message on success", async () => {
    mockState = {
      success: true,
      message: "Verifique seu e-mail para confirmar o cadastro",
    };

    await renderSignupForm();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Verifique seu e-mail")).toBeInTheDocument();
    expect(
      screen.getByText("Verifique seu e-mail para confirmar o cadastro"),
    ).toBeInTheDocument();

    const backLink = screen.getByText("Voltar para o login");
    expect(backLink).toHaveAttribute("href", "/auth/login");
  });

  it("shows server error message when state has error message", async () => {
    mockState = {
      message: "Este e-mail já está cadastrado",
    };

    await renderSignupForm();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Este e-mail já está cadastrado")).toBeInTheDocument();
  });

  it("shows field-level server errors", async () => {
    mockState = {
      errors: {
        fullName: ["Nome deve ter no mínimo 2 caracteres"],
        email: ["E-mail inválido"],
      },
    };

    await renderSignupForm();

    expect(
      screen.getByText("Nome deve ter no mínimo 2 caracteres"),
    ).toBeInTheDocument();
    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

  it("shows password match validation error on blur", async () => {
    await renderSignupForm();

    const passwordInput = screen.getByLabelText("Senha");
    const confirmInput = screen.getByLabelText("Confirmar senha");

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "different123" } });
      fireEvent.blur(confirmInput);
    });

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem")).toBeInTheDocument();
    });
  });

  it("shows password min length validation error on blur", async () => {
    await renderSignupForm();

    const passwordInput = screen.getByLabelText("Senha");

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.blur(passwordInput);
    });

    await waitFor(() => {
      expect(screen.getByText("Mínimo de 8 caracteres")).toBeInTheDocument();
    });
  });

  it("shows fullName validation error on blur", async () => {
    await renderSignupForm();

    const fullNameInput = screen.getByLabelText("Nome completo");

    await act(() => {
      fireEvent.change(fullNameInput, { target: { value: "A" } });
      fireEvent.blur(fullNameInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Nome deve ter no mínimo 2 caracteres"),
      ).toBeInTheDocument();
    });
  });

  it("clears password match error when passwords become equal", async () => {
    await renderSignupForm();

    const passwordInput = screen.getByLabelText("Senha");
    const confirmInput = screen.getByLabelText("Confirmar senha");

    // Create mismatch
    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "different" } });
      fireEvent.blur(confirmInput);
    });

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem")).toBeInTheDocument();
    });

    // Fix mismatch
    await act(() => {
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.blur(confirmInput);
    });

    await waitFor(() => {
      expect(screen.queryByText("As senhas não coincidem")).not.toBeInTheDocument();
    });
  });

  it("shows loading state when pending", async () => {
    mockPending = true;

    await renderSignupForm();

    const button = screen.getByRole("button", { name: /criando conta/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(screen.getByText("Criando conta...")).toBeInTheDocument();
  });

  it("does not show form fields when in success state", async () => {
    mockState = {
      success: true,
      message: "Verifique seu e-mail para confirmar o cadastro",
    };

    await renderSignupForm();

    expect(screen.queryByLabelText("Nome completo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirmar senha")).not.toBeInTheDocument();
  });

  it("does not show errors initially", async () => {
    await renderSignupForm();

    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });
});
