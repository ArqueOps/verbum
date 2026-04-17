// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_ADMIN_USER = {
  id: "admin-user-001",
  email: "admin@verbum.app",
  aud: "authenticated",
};

const MOCK_REGULAR_USER = {
  id: "regular-user-002",
  email: "user@verbum.app",
  aud: "authenticated",
};

const MOCK_STUDY_ID = "study-abc-123";

const MOCK_STUDIES = [
  {
    id: "study-001",
    title: "Estudo sobre João 3:16",
    verse_reference: "João 3:16",
    slug: "estudo-joao-3-16",
    is_published: true,
    created_at: "2026-04-10T10:00:00.000Z",
    owner_id: "user-100",
    profiles: { display_name: "Maria Silva" },
  },
  {
    id: "study-002",
    title: "Reflexão em Salmos 23",
    verse_reference: "Salmos 23:1-6",
    slug: "reflexao-salmos-23",
    is_published: false,
    created_at: "2026-04-11T14:00:00.000Z",
    owner_id: "user-200",
    profiles: { display_name: "João Santos" },
  },
];

// ---------------------------------------------------------------------------
// Mock setup: Supabase admin client
// ---------------------------------------------------------------------------

const mockRange = vi.fn();
const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
const mockGte = vi.fn().mockReturnValue({ order: mockOrder, lte: mockLte });
const mockIlike = vi.fn().mockReturnValue({ order: mockOrder, gte: mockGte });
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

function buildAdminQueryChain() {
  mockEq.mockImplementation(() => ({
    order: mockOrder,
    gte: mockGte,
    ilike: mockIlike,
    lte: mockLte,
  }));

  mockSelect.mockImplementation(() => ({
    eq: mockEq,
    ilike: mockIlike,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
  }));

  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  return {
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    })),
  };
}

let mockAdminClient: ReturnType<typeof buildAdminQueryChain>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// ---------------------------------------------------------------------------
// Mock setup: Supabase server client (for auth)
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockProfileEq = vi.fn();
const mockProfileSingle = vi.fn();

function buildServerClient(options: {
  user: typeof MOCK_ADMIN_USER | null;
  authError: Error | null;
  profile: { role: string } | null;
  profileError: { message: string } | null;
}) {
  mockGetUser.mockResolvedValue({
    data: { user: options.user },
    error: options.authError,
  });

  mockProfileSingle.mockResolvedValue({
    data: options.profile,
    error: options.profileError,
  });

  mockProfileEq.mockReturnValue({ single: mockProfileSingle });
  mockProfileSelect.mockReturnValue({ eq: mockProfileEq });

  return {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return { select: mockProfileSelect };
      }
      return { select: vi.fn() };
    }),
  };
}

let mockServerClient: ReturnType<typeof buildServerClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  listStudies,
  unpublishStudy,
  deleteStudy,
  requireAdmin,
  AdminAuthError,
} from "../admin-studies";

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("admin-studies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminClient = buildAdminQueryChain();
  });

  // =========================================================================
  // listStudies
  // =========================================================================

  describe("listStudies", () => {
    beforeEach(() => {
      mockRange.mockResolvedValue({
        data: MOCK_STUDIES,
        count: 42,
        error: null,
      });
    });

    it("should return paginated results with correct structure", async () => {
      const result = await listStudies({ page: 1, pageSize: 20 });

      expect(result).toEqual({
        data: MOCK_STUDIES,
        total: 42,
        page: 1,
        pageSize: 20,
      });
    });

    it("should use default page=1 and pageSize=20 when not provided", async () => {
      await listStudies();

      expect(mockRange).toHaveBeenCalledWith(0, 19);
    });

    it("should calculate correct offset for page 3 with pageSize 10", async () => {
      await listStudies({ page: 3, pageSize: 10 });

      expect(mockRange).toHaveBeenCalledWith(20, 29);
    });

    it("should select with count:exact and correct columns", async () => {
      await listStudies();

      expect(mockSelect).toHaveBeenCalledWith(
        "id, title, verse_reference, slug, is_published, created_at, owner_id, profiles(display_name)",
        { count: "exact" },
      );
    });

    it("should order by created_at descending", async () => {
      await listStudies();

      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should apply userId filter with eq on owner_id", async () => {
      await listStudies({ userId: "user-100" });

      expect(mockEq).toHaveBeenCalledWith("owner_id", "user-100");
    });

    it("should apply ILIKE search on title", async () => {
      await listStudies({ search: "João" });

      expect(mockIlike).toHaveBeenCalledWith("title", "%João%");
    });

    it("should apply dateFrom filter with gte on created_at", async () => {
      await listStudies({ dateFrom: "2026-04-01T00:00:00.000Z" });

      expect(mockGte).toHaveBeenCalledWith("created_at", "2026-04-01T00:00:00.000Z");
    });

    it("should apply dateTo filter with lte on created_at", async () => {
      await listStudies({ dateTo: "2026-04-15T23:59:59.999Z" });

      expect(mockLte).toHaveBeenCalledWith("created_at", "2026-04-15T23:59:59.999Z");
    });

    it("should apply date range filters together", async () => {
      await listStudies({
        dateFrom: "2026-04-01T00:00:00.000Z",
        dateTo: "2026-04-15T23:59:59.999Z",
      });

      expect(mockGte).toHaveBeenCalledWith("created_at", "2026-04-01T00:00:00.000Z");
      expect(mockLte).toHaveBeenCalledWith("created_at", "2026-04-15T23:59:59.999Z");
    });

    it("should return empty data array when no studies match", async () => {
      mockRange.mockResolvedValue({ data: [], count: 0, error: null });

      const result = await listStudies({ search: "nonexistent" });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should handle null data from Supabase gracefully", async () => {
      mockRange.mockResolvedValue({ data: null, count: 0, error: null });

      const result = await listStudies();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should throw when Supabase returns an error", async () => {
      mockRange.mockResolvedValue({
        data: null,
        count: null,
        error: { message: "relation does not exist" },
      });

      await expect(listStudies()).rejects.toThrow("Failed to list studies: relation does not exist");
    });
  });

  // =========================================================================
  // unpublishStudy
  // =========================================================================

  describe("unpublishStudy", () => {
    it("should update is_published=false and store reason", async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      await unpublishStudy(MOCK_STUDY_ID, "Conteúdo inadequado");

      expect(mockAdminClient.from).toHaveBeenCalledWith("studies");
      expect(mockUpdate).toHaveBeenCalledWith({
        is_published: false,
        unpublish_reason: "Conteúdo inadequado",
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", MOCK_STUDY_ID);
    });

    it("should trim the reason string before storing", async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      await unpublishStudy(MOCK_STUDY_ID, "  Conteúdo com espaços  ");

      expect(mockUpdate).toHaveBeenCalledWith({
        is_published: false,
        unpublish_reason: "Conteúdo com espaços",
      });
    });

    it("should reject empty reason string", async () => {
      await expect(unpublishStudy(MOCK_STUDY_ID, "")).rejects.toThrow(
        "Unpublish reason is required",
      );
    });

    it("should reject whitespace-only reason string", async () => {
      await expect(unpublishStudy(MOCK_STUDY_ID, "   ")).rejects.toThrow(
        "Unpublish reason is required",
      );
    });

    it("should throw when Supabase update fails", async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: { message: "row not found" },
      });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      await expect(unpublishStudy(MOCK_STUDY_ID, "Motivo válido")).rejects.toThrow(
        "Failed to unpublish study: row not found",
      );
    });
  });

  // =========================================================================
  // deleteStudy
  // =========================================================================

  describe("deleteStudy", () => {
    it("should call delete on the correct study ID", async () => {
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      await deleteStudy(MOCK_STUDY_ID);

      expect(mockAdminClient.from).toHaveBeenCalledWith("studies");
      expect(mockDeleteEq).toHaveBeenCalledWith("id", MOCK_STUDY_ID);
    });

    it("should throw when Supabase delete fails", async () => {
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: { message: "foreign key violation" },
      });
      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      await expect(deleteStudy(MOCK_STUDY_ID)).rejects.toThrow(
        "Failed to delete study: foreign key violation",
      );
    });

    it("should not throw when delete succeeds with no error", async () => {
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      await expect(deleteStudy("any-study-id")).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // requireAdmin (auth guard)
  // =========================================================================

  describe("requireAdmin", () => {
    it("should return user ID when user is admin", async () => {
      mockServerClient = buildServerClient({
        user: MOCK_ADMIN_USER,
        authError: null,
        profile: { role: "admin" },
        profileError: null,
      });

      const userId = await requireAdmin();

      expect(userId).toBe(MOCK_ADMIN_USER.id);
    });

    it("should throw 401 AdminAuthError when no session exists", async () => {
      mockServerClient = buildServerClient({
        user: null,
        authError: new Error("No session"),
        profile: null,
        profileError: null,
      });

      await expect(requireAdmin()).rejects.toThrow(AdminAuthError);
      await expect(requireAdmin()).rejects.toMatchObject({
        message: "Unauthorized",
        statusCode: 401,
      });
    });

    it("should throw 401 AdminAuthError when auth returns no user", async () => {
      mockServerClient = buildServerClient({
        user: null,
        authError: null,
        profile: null,
        profileError: null,
      });

      await expect(requireAdmin()).rejects.toThrow(AdminAuthError);
      await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 401 });
    });

    it("should throw 403 AdminAuthError for non-admin users", async () => {
      mockServerClient = buildServerClient({
        user: MOCK_REGULAR_USER,
        authError: null,
        profile: { role: "free" },
        profileError: null,
      });

      await expect(requireAdmin()).rejects.toThrow(AdminAuthError);
      await expect(requireAdmin()).rejects.toMatchObject({
        message: "Forbidden",
        statusCode: 403,
      });
    });

    it("should throw 403 AdminAuthError for premium users", async () => {
      mockServerClient = buildServerClient({
        user: MOCK_REGULAR_USER,
        authError: null,
        profile: { role: "premium" },
        profileError: null,
      });

      await expect(requireAdmin()).rejects.toThrow(AdminAuthError);
      await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 403 });
    });

    it("should throw 403 when profile query fails", async () => {
      mockServerClient = buildServerClient({
        user: MOCK_ADMIN_USER,
        authError: null,
        profile: null,
        profileError: { message: "relation not found" },
      });

      await expect(requireAdmin()).rejects.toThrow(AdminAuthError);
      await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 403 });
    });

    it("should query profiles table with correct user ID", async () => {
      mockServerClient = buildServerClient({
        user: MOCK_ADMIN_USER,
        authError: null,
        profile: { role: "admin" },
        profileError: null,
      });

      await requireAdmin();

      expect(mockProfileSelect).toHaveBeenCalledWith("role");
      expect(mockProfileEq).toHaveBeenCalledWith("id", MOCK_ADMIN_USER.id);
      expect(mockProfileSingle).toHaveBeenCalled();
    });
  });
});
