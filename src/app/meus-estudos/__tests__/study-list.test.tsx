import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

// --- Mocks ---

const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock @base-ui/react/alert-dialog with simple DOM elements
// so we can test open/close behavior without portals/animations
vi.mock("@base-ui/react/alert-dialog", () => {
  const AlertDialogContext = React.createContext<{
    open: boolean;
    setOpen: (v: boolean) => void;
  }>({ open: false, setOpen: () => {} });

  function Root({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
      <AlertDialogContext.Provider value={{ open, setOpen }}>
        {children}
      </AlertDialogContext.Provider>
    );
  }

  function Trigger({
    children,
    render: renderProp,
    className: _className,
    ...rest
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
    className?: string;
  }) {
    const { setOpen } = React.useContext(AlertDialogContext);
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(true);
    };
    if (renderProp) {
      return React.cloneElement(renderProp as React.ReactElement<Record<string, unknown>>, {
        ...rest,
        onClick: handleClick,
        "data-testid": "delete-trigger",
        children,
      });
    }
    return (
      <button onClick={handleClick} {...rest}>
        {children}
      </button>
    );
  }

  function Portal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function Backdrop() {
    return null;
  }

  function Popup({
    children,
    className: _className,
    ...rest
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    const { open } = React.useContext(AlertDialogContext);
    if (!open) return null;
    return (
      <div role="alertdialog" data-testid="alert-dialog-popup" {...rest}>
        {children}
      </div>
    );
  }

  function Title({
    children,
    className: _className,
    ...rest
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    return <h2 {...rest}>{children}</h2>;
  }

  function Description({
    children,
    className: _className,
    ...rest
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    return <p {...rest}>{children}</p>;
  }

  function Close({
    children,
    render: renderProp,
    ...rest
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) {
    const { setOpen } = React.useContext(AlertDialogContext);
    const handleClick = (e: React.MouseEvent) => {
      const renderOnClick = (renderProp?.props as Record<string, unknown>)?.onClick as ((e: React.MouseEvent) => void) | undefined;
      if (renderOnClick) renderOnClick(e);
      setOpen(false);
    };
    if (renderProp) {
      return React.cloneElement(renderProp as React.ReactElement<Record<string, unknown>>, {
        ...rest,
        onClick: handleClick,
        children,
      });
    }
    return (
      <button onClick={handleClick} {...rest}>
        {children}
      </button>
    );
  }

  const AlertDialog = {
    Root,
    Trigger,
    Portal,
    Backdrop,
    Popup,
    Title,
    Description,
    Close,
  };
  return { AlertDialog };
});

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  BookOpen: ({ className }: { className?: string }) => (
    <svg data-testid="book-open-icon" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  ),
}));

// --- Helpers ---

const mockStudies = [
  {
    id: "study-1",
    title: "Estudo sobre Gênesis",
    verse_reference: "Gênesis 1:1",
    created_at: "2026-04-10T12:00:00Z",
    slug: "estudo-sobre-genesis",
  },
  {
    id: "study-2",
    title: "Salmos de Davi",
    verse_reference: "Salmo 23:1",
    created_at: "2026-04-12T14:00:00Z",
    slug: "salmos-de-davi",
  },
];

function setupSupabaseMock(response: { error: null | { message: string } }) {
  mockEq.mockResolvedValue(response);
  mockDelete.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ delete: mockDelete });
}

// --- Tests ---

describe("StudyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderStudyList(studies = mockStudies) {
    const { StudyList } = await import("../study-list");
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<StudyList studies={studies} />);
    });
    return result!;
  }

  it("renders delete button on each study card", async () => {
    await renderStudyList();

    const trashIcons = screen.getAllByTestId("trash-icon");
    expect(trashIcons).toHaveLength(2);
  });

  it("clicking delete button opens confirmation modal", async () => {
    await renderStudyList();

    // Modal should not be visible initially
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Click the first delete trigger
    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);

    // Modal should now be visible
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("modal contains 'Tem certeza? Esta ação não pode ser desfeita.'", async () => {
    await renderStudyList();

    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Excluir estudo")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Tem certeza? Esta ação não pode ser desfeita."
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Cancelar")).toBeInTheDocument();
    expect(within(dialog).getByText("Excluir")).toBeInTheDocument();
  });

  it("cancel closes modal without calling delete", async () => {
    setupSupabaseMock({ error: null });
    await renderStudyList();

    // Open modal
    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    // Modal should close
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Supabase delete should NOT have been called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("confirm triggers Supabase delete with correct study id", async () => {
    setupSupabaseMock({ error: null });
    await renderStudyList();

    // Open modal on the first study
    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);

    // Click confirm (Excluir)
    const confirmButton = screen.getByText("Excluir");
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Verify Supabase was called with correct table and id
    expect(mockFrom).toHaveBeenCalledWith("studies");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "study-1");
  });

  it("successful deletion removes card and shows success toast", async () => {
    const { toast } = await import("sonner");
    setupSupabaseMock({ error: null });
    await renderStudyList();

    // Verify both studies are present
    expect(screen.getByText("Estudo sobre Gênesis")).toBeInTheDocument();
    expect(screen.getByText("Salmos de Davi")).toBeInTheDocument();

    // Open modal and confirm delete on study-1
    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);

    const confirmButton = screen.getByText("Excluir");
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Advance past the 300ms fade-out animation
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Study should be removed from the list
    expect(
      screen.queryByText("Estudo sobre Gênesis")
    ).not.toBeInTheDocument();
    // Other study should remain
    expect(screen.getByText("Salmos de Davi")).toBeInTheDocument();

    // Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Estudo excluído com sucesso");
  });

  it("failed deletion shows error toast and keeps card", async () => {
    const { toast } = await import("sonner");
    setupSupabaseMock({ error: { message: "DB error" } });
    await renderStudyList();

    const triggers = screen.getAllByTestId("delete-trigger");
    fireEvent.click(triggers[0]!);

    const confirmButton = screen.getByText("Excluir");
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Study should still be in the list
    expect(screen.getByText("Estudo sobre Gênesis")).toBeInTheDocument();

    // Error toast shown
    expect(toast.error).toHaveBeenCalledWith("Erro ao excluir estudo.");
  });

  it("renders empty state when no studies provided", async () => {
    await renderStudyList([]);

    expect(
      screen.getByText("Nenhum estudo encontrado.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ajuste os filtros ou crie um novo estudo.")
    ).toBeInTheDocument();
  });
});
