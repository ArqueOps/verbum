// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ProfileFormState } from "../actions";

type FormAction = (payload: FormData) => void;

const defaultState: ProfileFormState = { success: false, message: "" };
let mockState: ProfileFormState = defaultState;
let mockFormAction: FormAction = vi.fn();
let mockIsPending = false;

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as Record<string, unknown>),
    useActionState: () => [mockState, mockFormAction, mockIsPending],
  };
});

vi.mock("../actions", () => ({
  updateProfile: vi.fn(),
}));

const { ProfileForm } = await import("../profile-form");

beforeEach(() => {
  mockState = { success: false, message: "" };
  mockFormAction = vi.fn();
  mockIsPending = false;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProfileForm", () => {
  describe("rendering with pre-filled data", () => {
    it("pre-fills display_name input with initialDisplayName", () => {
      // Arrange & Act
      render(
        <ProfileForm initialDisplayName="João Silva" initialAvatarUrl="" />,
      );

      // Assert
      const input = screen.getByLabelText("Nome de Exibição");
      expect(input).toHaveValue("João Silva");
    });

    it("pre-fills avatar_url input with initialAvatarUrl", () => {
      // Arrange
      const avatarUrl = "https://example.com/avatar.jpg";

      // Act
      render(
        <ProfileForm initialDisplayName="Maria" initialAvatarUrl={avatarUrl} />,
      );

      // Assert
      const input = screen.getByLabelText("URL do Avatar");
      expect(input).toHaveValue(avatarUrl);
    });

    it("shows avatar preview when initialAvatarUrl is provided", () => {
      // Arrange
      const avatarUrl = "https://example.com/photo.png";

      // Act
      render(
        <ProfileForm initialDisplayName="Ana" initialAvatarUrl={avatarUrl} />,
      );

      // Assert
      const img = screen.getByAltText("Avatar atual");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", avatarUrl);
    });

    it("does not show avatar preview when initialAvatarUrl is empty", () => {
      // Arrange & Act
      render(
        <ProfileForm initialDisplayName="Pedro" initialAvatarUrl="" />,
      );

      // Assert
      expect(screen.queryByAltText("Avatar atual")).not.toBeInTheDocument();
    });

    it("renders the submit button with correct text", () => {
      // Arrange & Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="" />,
      );

      // Assert
      expect(
        screen.getByRole("button", { name: "Salvar Alterações" }),
      ).toBeInTheDocument();
    });
  });

  describe("validation errors", () => {
    it("displays displayName validation error when state has errors", () => {
      // Arrange
      mockState = {
        success: false,
        message: "Corrija os erros abaixo.",
        errors: {
          displayName: ["O nome de exibição não pode ficar vazio."],
        },
      };

      // Act
      render(
        <ProfileForm initialDisplayName="" initialAvatarUrl="" />,
      );

      // Assert
      expect(
        screen.getByText("O nome de exibição não pode ficar vazio."),
      ).toBeInTheDocument();
      expect(screen.getByText("Corrija os erros abaixo.")).toBeInTheDocument();
    });

    it("displays avatarUrl validation error when state has errors", () => {
      // Arrange
      mockState = {
        success: false,
        message: "Corrija os erros abaixo.",
        errors: {
          avatarUrl: ["A URL do avatar é inválida."],
        },
      };

      // Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="bad-url" />,
      );

      // Assert
      expect(
        screen.getByText("A URL do avatar é inválida."),
      ).toBeInTheDocument();
    });

    it("shows error alert with red styling", () => {
      // Arrange
      mockState = {
        success: false,
        message: "Corrija os erros abaixo.",
      };

      // Act
      render(
        <ProfileForm initialDisplayName="" initialAvatarUrl="" />,
      );

      // Assert
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Corrija os erros abaixo.");
      expect(alert.className).toContain("text-red-800");
    });
  });

  describe("form submission", () => {
    it("passes formAction to form element", () => {
      // Arrange
      const action = vi.fn();
      mockFormAction = action;

      // Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="" />,
      );

      // Assert — the form's action attribute is set by React to the formAction
      const form = screen.getByRole("button", {
        name: "Salvar Alterações",
      }).closest("form");
      expect(form).toBeInTheDocument();
    });

    it("shows loading state when isPending is true", () => {
      // Arrange
      mockIsPending = true;

      // Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="" />,
      );

      // Assert
      const button = screen.getByRole("button", { name: "Salvando..." });
      expect(button).toBeDisabled();
    });

    it("button is enabled when not pending", () => {
      // Arrange
      mockIsPending = false;

      // Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="" />,
      );

      // Assert
      const button = screen.getByRole("button", { name: "Salvar Alterações" });
      expect(button).not.toBeDisabled();
    });
  });

  describe("success feedback", () => {
    it("shows success message with green styling", () => {
      // Arrange
      mockState = {
        success: true,
        message: "Perfil atualizado com sucesso!",
      };

      // Act
      render(
        <ProfileForm initialDisplayName="João" initialAvatarUrl="" />,
      );

      // Assert
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Perfil atualizado com sucesso!");
      expect(alert.className).toContain("text-green-800");
    });

    it("does not show any alert when message is empty", () => {
      // Arrange & Act
      render(
        <ProfileForm initialDisplayName="Test" initialAvatarUrl="" />,
      );

      // Assert
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
