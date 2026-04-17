import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupabaseUser,
  type FirebaseUser,
  type MigrationReport,
} from "../create-supabase-user";

function createMockReport(): MigrationReport {
  return { created: 0, skipped: 0, failed: 0, errors: [] };
}

function createMockSupabase(overrides?: {
  createUserResult?: { data: unknown; error: unknown };
  identityInsertResult?: { error: unknown };
  profileInsertResult?: { error: unknown };
}) {
  const identityInsertFn = vi
    .fn()
    .mockReturnValue({
      error: overrides?.identityInsertResult?.error ?? null,
    });
  const profileInsertFn = vi
    .fn()
    .mockReturnValue({
      error: overrides?.profileInsertResult?.error ?? null,
    });

  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          overrides?.createUserResult ?? {
            data: { user: { id: "supabase-uuid-123" } },
            error: null,
          },
        ),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "identities") {
        return { insert: identityInsertFn };
      }
      if (table === "profiles") {
        return { insert: profileInsertFn };
      }
      return { insert: vi.fn().mockReturnValue({ error: null }) };
    }),
    _identityInsert: identityInsertFn,
    _profileInsert: profileInsertFn,
  };
}

const emailPasswordUser: FirebaseUser = {
  uid: "firebase-uid-001",
  email: "user@example.com",
  displayName: "João da Silva",
  photoURL: "https://example.com/photo.jpg",
  providerData: [{ providerId: "password", uid: "user@example.com" }],
};

const googleOAuthUser: FirebaseUser = {
  uid: "firebase-uid-002",
  email: "google@example.com",
  displayName: "Maria Santos",
  photoURL: "https://lh3.googleusercontent.com/photo",
  providerData: [
    { providerId: "google.com", uid: "google-provider-id-12345" },
  ],
};

const appleOAuthUser: FirebaseUser = {
  uid: "firebase-uid-003",
  email: "apple@example.com",
  displayName: "Pedro Oliveira",
  providerData: [
    { providerId: "apple.com", uid: "apple-provider-id-67890" },
  ],
};

describe("createSupabaseUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("email/password user", () => {
    it("should call createUser without password for email/password users", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, emailPasswordUser, report);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: "user@example.com",
        email_confirm: true,
      });
      expect(supabase.auth.admin.createUser).toHaveBeenCalledTimes(1);

      const callArgs = supabase.auth.admin.createUser.mock.calls[0]![0];
      expect(callArgs).not.toHaveProperty("password");
    });

    it("should not insert any OAuth identity for email/password users", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, emailPasswordUser, report);

      const identityCalls = supabase.from.mock.calls.filter(
        (c: string[]) => c[0] === "identities",
      );
      expect(identityCalls).toHaveLength(0);
    });

    it("should increment report.created on success", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      const userId = await createSupabaseUser(
        supabase as never,
        emailPasswordUser,
        report,
      );

      expect(userId).toBe("supabase-uuid-123");
      expect(report.created).toBe(1);
      expect(report.skipped).toBe(0);
      expect(report.failed).toBe(0);
    });
  });

  describe("Google OAuth user", () => {
    it("should call createUser with correct email", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: "google@example.com",
        email_confirm: true,
      });
    });

    it("should INSERT into identities with provider='google' and correct provider_id", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase.from).toHaveBeenCalledWith("identities");
      expect(supabase._identityInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "google-provider-id-12345",
          user_id: "supabase-uuid-123",
          provider: "google",
          provider_id: "google-provider-id-12345",
          identity_data: expect.objectContaining({
            sub: "google-provider-id-12345",
            email: "google@example.com",
          }),
        }),
      );
    });

    it("should include timestamp fields in identity insert", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      const insertArg = supabase._identityInsert.mock.calls[0]![0];
      expect(insertArg).toHaveProperty("last_sign_in_at");
      expect(insertArg).toHaveProperty("created_at");
      expect(insertArg).toHaveProperty("updated_at");
      expect(new Date(insertArg.created_at).getTime()).not.toBeNaN();
    });
  });

  describe("Apple OAuth user", () => {
    it("should INSERT into identities with provider='apple' and correct provider_id", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, appleOAuthUser, report);

      expect(supabase.from).toHaveBeenCalledWith("identities");
      expect(supabase._identityInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "apple-provider-id-67890",
          user_id: "supabase-uuid-123",
          provider: "apple",
          provider_id: "apple-provider-id-67890",
          identity_data: expect.objectContaining({
            sub: "apple-provider-id-67890",
            email: "apple@example.com",
          }),
        }),
      );
    });

    it("should call createUser before inserting identity", async () => {
      const callOrder: string[] = [];
      const supabase = createMockSupabase();
      supabase.auth.admin.createUser = vi.fn().mockImplementation(async () => {
        callOrder.push("createUser");
        return { data: { user: { id: "uuid-apple" } }, error: null };
      });
      supabase._identityInsert.mockImplementation(() => {
        callOrder.push("insertIdentity");
        return { error: null };
      });

      const report = createMockReport();
      await createSupabaseUser(supabase as never, appleOAuthUser, report);

      expect(callOrder[0]).toBe("createUser");
      expect(callOrder[1]).toBe("insertIdentity");
    });
  });

  describe("duplicate email handling", () => {
    it("should not throw on 422 duplicate email error", async () => {
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: {
            status: 422,
            message: "A user with this email address has already been registered",
          },
        },
      });
      const report = createMockReport();

      const result = await createSupabaseUser(
        supabase as never,
        emailPasswordUser,
        report,
      );

      expect(result).toBeNull();
      expect(report.skipped).toBe(1);
      expect(report.created).toBe(0);
      expect(report.failed).toBe(0);
    });

    it("should log skip message for duplicate email", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: {
            status: 422,
            message: "A user with this email address has already been registered",
          },
        },
      });
      const report = createMockReport();

      await createSupabaseUser(supabase as never, emailPasswordUser, report);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping duplicate email"),
      );
    });

    it("should not insert identity or profile for duplicate email", async () => {
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: {
            status: 422,
            message: "already been registered",
          },
        },
      });
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase._identityInsert).not.toHaveBeenCalled();
      expect(supabase._profileInsert).not.toHaveBeenCalled();
    });
  });

  describe("profile creation", () => {
    it("should create profile with role='free' and firebase_uid mapped", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, emailPasswordUser, report);

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(supabase._profileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "supabase-uuid-123",
          display_name: "João da Silva",
          avatar_url: "https://example.com/photo.jpg",
          role: "free",
          firebase_uid: "firebase-uid-001",
        }),
      );
    });

    it("should set display_name to null when not provided", async () => {
      const userWithoutName: FirebaseUser = {
        uid: "firebase-uid-004",
        email: "noname@example.com",
        providerData: [{ providerId: "password", uid: "noname@example.com" }],
      };
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, userWithoutName, report);

      expect(supabase._profileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: null,
          avatar_url: null,
        }),
      );
    });

    it("should map photo_url from Firebase photoURL", async () => {
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase._profileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_url: "https://lh3.googleusercontent.com/photo",
        }),
      );
    });
  });

  describe("failed createUser", () => {
    it("should log error and increment failed count without throwing", async () => {
      const consoleSpy = vi.spyOn(console, "error");
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: { status: 500, message: "Internal server error" },
        },
      });
      const report = createMockReport();

      const result = await createSupabaseUser(
        supabase as never,
        emailPasswordUser,
        report,
      );

      expect(result).toBeNull();
      expect(report.failed).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toEqual({
        email: "user@example.com",
        error: "Internal server error",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create user"),
      );
    });

    it("should not halt batch processing (no throw)", async () => {
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: { status: 503, message: "Service unavailable" },
        },
      });
      const report = createMockReport();

      await expect(
        createSupabaseUser(supabase as never, emailPasswordUser, report),
      ).resolves.toBeNull();
    });

    it("should not insert identity or profile when createUser fails", async () => {
      const supabase = createMockSupabase({
        createUserResult: {
          data: null,
          error: { status: 500, message: "Server error" },
        },
      });
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase._identityInsert).not.toHaveBeenCalled();
      expect(supabase._profileInsert).not.toHaveBeenCalled();
    });
  });

  describe("multi-provider user", () => {
    it("should insert identities for all OAuth providers", async () => {
      const multiProviderUser: FirebaseUser = {
        uid: "firebase-uid-005",
        email: "multi@example.com",
        displayName: "Multi User",
        providerData: [
          { providerId: "google.com", uid: "google-id-multi" },
          { providerId: "apple.com", uid: "apple-id-multi" },
        ],
      };
      const supabase = createMockSupabase();
      const report = createMockReport();

      await createSupabaseUser(supabase as never, multiProviderUser, report);

      const identityCalls = supabase.from.mock.calls.filter(
        (c: string[]) => c[0] === "identities",
      );
      expect(identityCalls).toHaveLength(2);

      expect(supabase._identityInsert).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" }),
      );
      expect(supabase._identityInsert).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "apple" }),
      );
    });
  });

  describe("identity insert failure resilience", () => {
    it("should still create profile even if identity insert fails", async () => {
      const supabase = createMockSupabase({
        identityInsertResult: { error: { message: "constraint violation" } },
      });
      const report = createMockReport();

      await createSupabaseUser(supabase as never, googleOAuthUser, report);

      expect(supabase._profileInsert).toHaveBeenCalled();
      expect(report.created).toBe(1);
    });
  });
});
