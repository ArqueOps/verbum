// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { CancellationForm } = await import("../cancellation-form");

const defaultSubscription = {
  planId: "monthly",
  status: "active",
  currentPeriodEnd: "2026-05-16T00:00:00.000Z",
};

beforeEach(() => {
  mockPush.mockClear();
  vi.restoreAllMocks();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CancellationForm", () => {
  describe("step 1 — plan details", () => {
    it("renders plan name, status and expiration date on mount", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      expect(screen.getByText("Mensal")).toBeInTheDocument();
      expect(screen.getByText("Ativo")).toBeInTheDocument();
      expect(screen.getByText(/\d{2} de maio de 2026/)).toBeInTheDocument();
    });

    it("renders yearly plan name correctly", () => {
      render(
        <CancellationForm
          subscription={{ ...defaultSubscription, planId: "yearly" }}
        />,
      );

      expect(screen.getByText("Anual")).toBeInTheDocument();
    });

    it("renders all five benefits the user will lose", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      expect(
        screen.getByText("Acesso ilimitado aos estudos bíblicos"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Geração ilimitada de novos estudos"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Salvamento de progresso e anotações"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Acesso a conteúdo exclusivo"),
      ).toBeInTheDocument();
      expect(screen.getByText("Suporte prioritário")).toBeInTheDocument();
    });

    it("shows cancelled status in Portuguese", () => {
      render(
        <CancellationForm
          subscription={{ ...defaultSubscription, status: "cancelled" }}
        />,
      );

      expect(screen.getByText("Cancelado")).toBeInTheDocument();
    });
  });

  describe("step navigation", () => {
    it("navigates forward from step 1 to step 2", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getByText("Motivo do cancelamento")).toBeInTheDocument();
    });

    it("navigates backward from step 2 to step 1", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      expect(screen.getByText("Motivo do cancelamento")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(screen.getByText("Dados da sua assinatura")).toBeInTheDocument();
    });

    it("navigates forward from step 2 to step 3 when reason is selected", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Preço alto demais" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getByText("Feedback adicional")).toBeInTheDocument();
    });

    it("navigates backward from step 3 to step 2", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Preço alto demais" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(screen.getByText("Motivo do cancelamento")).toBeInTheDocument();
    });

    it("navigates from step 3 to step 4", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Preço alto demais" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getByText("Confirmação")).toBeInTheDocument();
    });

    it("step 1 Voltar ao perfil navigates to /perfil", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Voltar ao perfil" }),
      );

      expect(mockPush).toHaveBeenCalledWith("/perfil");
    });
  });

  describe("step 2 — reason selection", () => {
    function renderAtStep2() {
      render(<CancellationForm subscription={defaultSubscription} />);
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }

    it("renders all 10 cancellation reason options", () => {
      renderAtStep2();

      const select = screen.getByLabelText(
        "Selecione o motivo",
      ) as HTMLSelectElement;
      const options = Array.from(select.options).filter(
        (o) => !o.disabled,
      );

      expect(options).toHaveLength(10);
      expect(options.map((o) => o.text)).toEqual([
        "Preço alto demais",
        "Não uso com frequência suficiente",
        "Problemas técnicos recorrentes",
        "Encontrei uma alternativa melhor",
        "Conteúdo insuficiente para minha necessidade",
        "Dificuldade de uso da plataforma",
        "Mudança na situação financeira",
        "Não atendeu minhas expectativas",
        "Falta de recursos que preciso",
        "Outro motivo",
      ]);
    });

    it("disables Continuar button when no reason is selected", () => {
      renderAtStep2();

      expect(
        screen.getByRole("button", { name: "Continuar" }),
      ).toBeDisabled();
    });

    it("enables Continuar button after selecting a reason", () => {
      renderAtStep2();

      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Outro motivo" },
      });

      expect(
        screen.getByRole("button", { name: "Continuar" }),
      ).not.toBeDisabled();
    });
  });

  describe("step 3 — optional feedback", () => {
    function renderAtStep3() {
      render(<CancellationForm subscription={defaultSubscription} />);
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Preço alto demais" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }

    it("can proceed to step 4 without filling textarea", () => {
      renderAtStep3();

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getByText("Confirmação")).toBeInTheDocument();
    });

    it("renders textarea with optional label", () => {
      renderAtStep3();

      expect(
        screen.getByLabelText(
          "Conte-nos mais sobre sua experiência (opcional)",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("step 4 — confirmation", () => {
    function renderAtStep4(feedbackText = "") {
      render(<CancellationForm subscription={defaultSubscription} />);
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.change(screen.getByLabelText("Selecione o motivo"), {
        target: { value: "Preço alto demais" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      if (feedbackText) {
        fireEvent.change(
          screen.getByLabelText(
            "Conte-nos mais sobre sua experiência (opcional)",
          ),
          { target: { value: feedbackText } },
        );
      }
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }

    it("renders both buttons with equal visual weight (same CSS classes)", () => {
      renderAtStep4();

      const cancelBtn = screen.getByRole("button", {
        name: "Quero cancelar",
      });
      const keepBtn = screen.getByRole("button", { name: "Mudei de ideia" });

      expect(cancelBtn.className).toBe(keepBtn.className);
    });

    it("Mudei de ideia navigates to /perfil without calling cancel API", () => {
      renderAtStep4();

      fireEvent.click(screen.getByRole("button", { name: "Mudei de ideia" }));

      expect(mockPush).toHaveBeenCalledWith("/perfil");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("Quero cancelar triggers POST to /api/subscription/cancel with correct payload", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderAtStep4("Muito caro para mim");

      fireEvent.click(
        screen.getByRole("button", { name: "Quero cancelar" }),
      );

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/subscription/cancel",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Preço alto demais",
              feedback: "Muito caro para mim",
            }),
          },
        );
      });
    });

    it("sends undefined feedback when textarea is empty", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderAtStep4();

      fireEvent.click(
        screen.getByRole("button", { name: "Quero cancelar" }),
      );

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/subscription/cancel",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Preço alto demais",
            }),
          },
        );
      });
    });

    it("navigates to /perfil on successful cancellation", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderAtStep4();

      fireEvent.click(
        screen.getByRole("button", { name: "Quero cancelar" }),
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/perfil");
      });
    });

    it("shows error toast when API returns error", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: "Assinatura não encontrada" }),
      });

      const { toast } = await import("sonner");

      renderAtStep4();

      fireEvent.click(
        screen.getByRole("button", { name: "Quero cancelar" }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Assinatura não encontrada",
        );
      });
    });

    it("shows loading state while submitting", async () => {
      let resolveResponse!: (value: unknown) => void;
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
      );

      renderAtStep4();

      fireEvent.click(
        screen.getByRole("button", { name: "Quero cancelar" }),
      );

      await waitFor(() => {
        expect(screen.getByText("Cancelando...")).toBeInTheDocument();
      });

      resolveResponse({ ok: true, json: () => Promise.resolve({}) });
    });

    it("displays selected reason in the summary", () => {
      renderAtStep4();

      expect(screen.getByText("Preço alto demais")).toBeInTheDocument();
    });

    it("displays feedback in the summary when provided", () => {
      renderAtStep4("Muito caro para mim");

      expect(screen.getByText("Muito caro para mim")).toBeInTheDocument();
    });
  });

  describe("reason is required before step 4", () => {
    it("cannot reach step 3 without selecting a reason (button disabled)", () => {
      render(<CancellationForm subscription={defaultSubscription} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      const continueBtn = screen.getByRole("button", { name: "Continuar" });
      expect(continueBtn).toBeDisabled();
    });
  });

  describe("step indicator", () => {
    it("renders 4 step dots", () => {
      const { container } = render(
        <CancellationForm subscription={defaultSubscription} />,
      );

      const dots = container.querySelectorAll(".rounded-full");
      expect(dots).toHaveLength(4);
    });

    it("highlights only the first dot on step 1", () => {
      const { container } = render(
        <CancellationForm subscription={defaultSubscription} />,
      );

      const dots = container.querySelectorAll(".rounded-full");
      expect(dots[0]!.className).toContain("bg-primary");
      expect(dots[1]!.className).toContain("bg-foreground/20");
    });
  });
});
