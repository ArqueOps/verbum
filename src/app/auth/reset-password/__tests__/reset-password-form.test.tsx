import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import ResetPasswordForm from "../reset-password-form";

const mockResetPassword = vi.fn();

vi.mock("@/app/auth/actions", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordForm", () => {
  it("renders password and confirm password fields", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");

    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("name", "password");

    expect(confirmInput).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("name", "confirmPassword");
  });

  it("renders submit button with correct text", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    const submitButton = screen.getByRole("button", {
      name: /redefinir senha/i,
    });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
    expect(submitButton).not.toBeDisabled();
  });

  it("shows validation error when password is too short", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.change(confirmInput, { target: { value: "short" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/a senha deve ter no mínimo 8 caracteres/i),
      ).toBeInTheDocument();
    });

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "differentpassword" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/as senhas não coincidem/i),
      ).toBeInTheDocument();
    });

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("shows both errors when password is short and does not match", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.change(confirmInput, { target: { value: "other" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/a senha deve ter no mínimo 8 caracteres/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/as senhas não coincidem/i),
      ).toBeInTheDocument();
    });
  });

  it("calls resetPassword with valid matching passwords", async () => {
    mockResetPassword.mockResolvedValue({ error: null });

    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
      fireEvent.change(confirmInput, { target: { value: "newpassword123" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        password: "newpassword123",
      });
    });
  });

  it("shows error message when resetPassword returns an error", async () => {
    mockResetPassword.mockResolvedValue({
      error: "Token expirado. Solicite nova recuperação de senha.",
    });

    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
      fireEvent.change(confirmInput, { target: { value: "newpassword123" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Token expirado. Solicite nova recuperação de senha."),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state during submission", async () => {
    let resolvePromise: (value: { error: null }) => void;
    mockResetPassword.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
      fireEvent.change(confirmInput, { target: { value: "newpassword123" } });
    });

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText("Redefinindo...")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button");
    expect(submitButton).toBeDisabled();

    await act(() => {
      resolvePromise!({ error: null });
    });
  });

  it("does not show validation errors initially", async () => {
    await act(() => {
      render(<ResetPasswordForm />);
    });

    expect(screen.queryByText(/a senha deve ter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/as senhas não coincidem/i)).not.toBeInTheDocument();
  });

  it("clears field errors on new submission attempt", async () => {
    mockResetPassword.mockResolvedValue({ error: null });

    await act(() => {
      render(<ResetPasswordForm />);
    });

    const passwordInput = screen.getByLabelText("Nova senha");
    const confirmInput = screen.getByLabelText("Confirmar nova senha");
    const form = screen.getByRole("button", {
      name: /redefinir senha/i,
    }).closest("form")!;

    // First submission with mismatched passwords
    await act(() => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "different123" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });

    // Second submission with matching passwords
    await act(() => {
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.queryByText(/as senhas não coincidem/i)).not.toBeInTheDocument();
    });
  });
});
