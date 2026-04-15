import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import ForgotPasswordForm from "../forgot-password-form";

const mockForgotPassword = vi.fn();

vi.mock("@/app/auth/actions", () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
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

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPasswordForm", () => {
  it("renders email input field", async () => {
    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toBeRequired();
  });

  it("renders submit button with correct text", async () => {
    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const submitButton = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("renders link back to login page", async () => {
    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const loginLink = screen.getByText("Voltar para o login");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("calls forgotPassword with email on form submission", async () => {
    mockForgotPassword.mockResolvedValue({ error: null });

    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    const form = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith({
        email: "user@example.com",
      });
    });
  });

  it("shows success message after successful submission", async () => {
    mockForgotPassword.mockResolvedValue({ error: null });

    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    const form = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /e-mail de recuperação enviado/i,
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Voltar para o login"),
    ).toHaveAttribute("href", "/auth/login");
  });

  it("shows error message when forgotPassword returns an error", async () => {
    mockForgotPassword.mockResolvedValue({
      error: "E-mail não encontrado",
    });

    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    const form = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "bad@example.com" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText("E-mail não encontrado")).toBeInTheDocument();
    });

    expect(screen.queryByText(/e-mail de recuperação enviado/i)).not.toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    let resolvePromise: (value: { error: null }) => void;
    mockForgotPassword.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    const form = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    });

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText("Enviando...")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button");
    expect(submitButton).toBeDisabled();

    await act(() => {
      resolvePromise!({ error: null });
    });
  });

  it("does not show error message initially", async () => {
    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const errorElements = document.querySelectorAll(".text-red-700");
    expect(errorElements.length).toBe(0);
  });

  it("clears previous error on new submission", async () => {
    mockForgotPassword
      .mockResolvedValueOnce({ error: "Primeiro erro" })
      .mockResolvedValueOnce({ error: null });

    await act(() => {
      render(<ForgotPasswordForm />);
    });

    const emailInput = screen.getByLabelText("E-mail");
    const form = screen.getByRole("button", {
      name: /enviar e-mail de recuperação/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText("Primeiro erro")).toBeInTheDocument();
    });

    await act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.queryByText("Primeiro erro")).not.toBeInTheDocument();
    });
  });
});
