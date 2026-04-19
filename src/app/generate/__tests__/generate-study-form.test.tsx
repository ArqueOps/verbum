import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

const mockPush = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

let capturedOnPassageSelect: ((sel: unknown) => void) | undefined;

vi.mock("@/components/study/PassagePicker", () => ({
  PassagePicker: ({
    onPassageSelect,
    className,
  }: {
    onPassageSelect?: (sel: unknown) => void;
    className?: string;
  }) => {
    capturedOnPassageSelect = onPassageSelect;
    return <div data-testid="passage-picker" className={className} />;
  },
}));

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnPassageSelect = undefined;
  vi.restoreAllMocks();
});

const validSelection = {
  book: "genesis",
  chapter: 1,
  verseStart: 1,
  verseEnd: 5,
  version: "nvi",
};

function createSSEReader(events: Array<{ event: string; data: string }>) {
  const lines = events
    .map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`)
    .join("");
  const encoder = new TextEncoder();
  const encoded = encoder.encode(lines);
  let consumed = false;

  return {
    read: vi.fn().mockImplementation(() => {
      if (consumed) {
        return Promise.resolve({ done: true, value: undefined });
      }
      consumed = true;
      return Promise.resolve({ done: false, value: encoded });
    }),
  };
}

function mockFetchWithSSE(
  events: Array<{ event: string; data: string }>,
  status = 200,
) {
  const reader = createSSEReader(events);
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: { getReader: () => reader },
    json: vi.fn(),
    headers: new Headers(),
  } as unknown as Response);
}

function mockFetchWithPendingReader() {
  let resolveRead!: (
    value: { done: boolean; value: Uint8Array | undefined },
  ) => void;
  const reader = {
    read: () =>
      new Promise<{ done: boolean; value: Uint8Array | undefined }>(
        (resolve) => {
          resolveRead = resolve;
        },
      ),
  };
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    body: { getReader: () => reader },
    json: vi.fn(),
    headers: new Headers(),
  } as unknown as Response);
  return { fetchSpy, resolveRead: () => resolveRead({ done: true, value: undefined }) };
}

async function renderForm() {
  const { GenerateStudyForm } = await import("../generate-study-form");
  await act(() => {
    render(<GenerateStudyForm />);
  });
}

function selectPassage(sel = validSelection) {
  act(() => {
    capturedOnPassageSelect?.(sel);
  });
}

describe("GenerateStudyForm", () => {
  it("renders PassagePicker and generate button", async () => {
    await renderForm();

    expect(screen.getByTestId("passage-picker")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /gerar estudo/i });
    expect(button).toBeInTheDocument();
  });

  it("disables button when no passage is selected", async () => {
    await renderForm();

    const button = screen.getByRole("button", { name: /gerar estudo/i });
    expect(button).toBeDisabled();
  });

  it("enables button after a valid passage selection", async () => {
    await renderForm();
    selectPassage();

    const button = screen.getByRole("button", { name: /gerar estudo/i });
    expect(button).not.toBeDisabled();
  });

  it("disables button when verseStart is 0", async () => {
    await renderForm();
    selectPassage({ ...validSelection, verseStart: 0 });

    const button = screen.getByRole("button", { name: /gerar estudo/i });
    expect(button).toBeDisabled();
  });

  it("sends correct payload to /api/generate-study", async () => {
    const fetchSpy = mockFetchWithSSE([
      { event: "done", data: "study-123" },
    ]);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/generate-study",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_id: "genesis",
            chapter: 1,
            verse_start: 1,
            verse_end: 5,
            version_id: "nvi",
          }),
        }),
      );
    });
  });

  it("shows loading state and disables button during generation", async () => {
    const { resolveRead } = mockFetchWithPendingReader();

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Gerando...")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /gerando/i });
    expect(button).toBeDisabled();

    expect(screen.getByText("Gerando estudo com IA...")).toBeInTheDocument();

    await act(async () => {
      resolveRead();
    });
  });

  it("redirects on SSE done event with correct study ID", async () => {
    mockFetchWithSSE([{ event: "done", data: "abc-study-456" }]);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/estudos/abc-study-456");
    });
  });

  it("shows error toast on SSE error event", async () => {
    mockFetchWithSSE([
      { event: "error", data: "Créditos insuficientes." },
    ]);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Créditos insuficientes.");
    });
  });

  it("shows error toast when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ error: "Sem permissão." }),
      headers: new Headers(),
    } as unknown as Response);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Sem permissão.");
    });
  });

  it("shows generic error when non-ok response has no JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("not json")),
      headers: new Headers(),
    } as unknown as Response);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Erro ao iniciar geração do estudo.",
      );
    });
  });

  it("shows error toast when response body is null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      json: vi.fn(),
      headers: new Headers(),
    } as unknown as Response);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Resposta do servidor sem conteúdo.",
      );
    });
  });

  it("shows connection error toast on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Erro de conexão. Verifique sua internet e tente novamente.",
      );
    });
  });

  it("shows cancellation toast on abort", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Geração cancelada.");
    });
  });

  it("does not submit when already generating", async () => {
    const { fetchSpy, resolveRead } = mockFetchWithPendingReader();

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerando/i }));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRead();
    });
  });

  it("ignores passage selection changes while generating", async () => {
    const { resolveRead } = mockFetchWithPendingReader();

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Gerando...")).toBeInTheDocument();
    });

    act(() => {
      capturedOnPassageSelect?.({
        ...validSelection,
        book: "exodus",
        chapter: 2,
      });
    });

    await act(async () => {
      resolveRead();
    });
  });

  it("resets to idle status after stream ends without done/error events", async () => {
    mockFetchWithSSE([{ event: "progress", data: "50" }]);

    await renderForm();
    selectPassage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /gerar estudo/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /gerar estudo/i }),
      ).toBeInTheDocument();
    });
  });
});
