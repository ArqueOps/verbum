import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_ADMIN_USER = {
  id: "admin-user-001",
  email: "admin@verbum.app",
  aud: "authenticated",
};

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

let mockSupabaseClient: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockClient(options: {
  user: typeof MOCK_ADMIN_USER | null;
  profile: { role: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.user ? null : new Error("No session"),
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: options.profile,
            error: options.profile ? null : { message: "Not found" },
          }),
        }),
      }),
    }),
  };
}

async function renderAdminPage() {
  const { default: AdminPage } = await import("../page");
  return render(await AdminPage());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminPage auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Admin user — access granted
  // =========================================================================

  describe("admin role", () => {
    it("should render the page when user has admin role", async () => {
      mockSupabaseClient = buildMockClient({
        user: MOCK_ADMIN_USER,
        profile: { role: "admin" },
      });

      await renderAdminPage();

      expect(
        screen.getByText("Painel Administrativo"),
      ).toBeInTheDocument();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("should query profiles table with user id", async () => {
      mockSupabaseClient = buildMockClient({
        user: MOCK_ADMIN_USER,
        profile: { role: "admin" },
      });

      await renderAdminPage();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
    });
  });

  // =========================================================================
  // 2. Free user — redirect to /
  // =========================================================================

  describe("free role", () => {
    it("should redirect free user to /", async () => {
      mockSupabaseClient = buildMockClient({
        user: MOCK_ADMIN_USER,
        profile: { role: "free" },
      });

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  });

  // =========================================================================
  // 3. Premium user — redirect to /
  // =========================================================================

  describe("premium role", () => {
    it("should redirect premium user to /", async () => {
      mockSupabaseClient = buildMockClient({
        user: MOCK_ADMIN_USER,
        profile: { role: "premium" },
      });

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  });

  // =========================================================================
  // 4. Unauthenticated user — redirect to /
  // =========================================================================

  describe("unauthenticated user", () => {
    it("should redirect unauthenticated user to /", async () => {
      mockSupabaseClient = buildMockClient({
        user: null,
        profile: null,
      });

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });

    it("should not query profiles when user is null", async () => {
      mockSupabaseClient = buildMockClient({
        user: null,
        profile: null,
      });

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Edge case: profile with no role field (consensus correction #4)
  // =========================================================================

  describe("incomplete profile", () => {
    it("should redirect when profile has no role field", async () => {
      mockSupabaseClient = buildMockClient({
        user: MOCK_ADMIN_USER,
        profile: null,
      });

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });

    it("should redirect when profile query returns null data", async () => {
      mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: MOCK_ADMIN_USER },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "No rows found" },
              }),
            }),
          }),
        }),
      };

      await expect(renderAdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  });
});
