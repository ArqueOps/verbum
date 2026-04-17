import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(() => "mock-cert"),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => JSON.stringify({ project_id: "test" })),
  default: { readFileSync: vi.fn(() => JSON.stringify({ project_id: "test" })) },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import {
  getPrimaryProvider,
  isAnonymous,
  getAlreadyMigratedUids,
  getOAuthProviderId,
  insertOAuthIdentity,
  migrateUser,
  run,
  printReport,
  SUPPORTED_PROVIDERS,
  type MigrationReport,
  type SupportedProvider,
} from "./migrate.js";
import { getAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

type UserLike = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  providerData: Array<{ providerId: string; uid: string }>;
};

function makeUser(overrides: Partial<UserLike> = {}): UserLike {
  return {
    uid: "firebase-uid-1",
    email: "user@example.com",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    providerData: [{ providerId: "password", uid: "user@example.com" }],
    ...overrides,
  };
}

function makeReport(overrides: Partial<MigrationReport> = {}): MigrationReport {
  return {
    totalProcessed: 0,
    successByProvider: {},
    errors: [],
    skipped: { noEmail: 0, anonymous: 0, duplicate: 0, alreadyMigrated: 0 },
    needsReRegister: [],
    ...overrides,
  };
}

function mockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const defaultClient = {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn(),
        getUserById: vi.fn(),
      },
    },
    ...overrides,
  };
  return defaultClient;
}

describe("migrate-firebase-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("getPrimaryProvider", () => {
    it("should return the first provider id", () => {
      const user = makeUser({
        providerData: [
          { providerId: "google.com", uid: "g-123" },
          { providerId: "password", uid: "p-456" },
        ],
      });
      expect(getPrimaryProvider(user as never)).toBe("google.com");
    });

    it("should return null when providerData is empty", () => {
      const user = makeUser({ providerData: [] });
      expect(getPrimaryProvider(user as never)).toBeNull();
    });

    it("should return null when providerData is undefined", () => {
      const user = { uid: "x", email: "x@x.com" } as never;
      expect(getPrimaryProvider(user)).toBeNull();
    });
  });

  describe("isAnonymous", () => {
    it("should return true for empty providerData", () => {
      expect(isAnonymous(makeUser({ providerData: [] }) as never)).toBe(true);
    });

    it("should return true for single anonymous provider", () => {
      const user = makeUser({
        providerData: [{ providerId: "anonymous", uid: "anon-1" }],
      });
      expect(isAnonymous(user as never)).toBe(true);
    });

    it("should return false for password provider", () => {
      const user = makeUser({
        providerData: [{ providerId: "password", uid: "p-1" }],
      });
      expect(isAnonymous(user as never)).toBe(false);
    });

    it("should return false for multiple providers including anonymous", () => {
      const user = makeUser({
        providerData: [
          { providerId: "anonymous", uid: "a-1" },
          { providerId: "password", uid: "p-1" },
        ],
      });
      expect(isAnonymous(user as never)).toBe(false);
    });

    it("should return true when providerData is undefined", () => {
      const user = { uid: "x" } as never;
      expect(isAnonymous(user)).toBe(true);
    });
  });

  describe("getOAuthProviderId", () => {
    it("should return uid for matching provider", () => {
      const user = makeUser({
        providerData: [{ providerId: "google.com", uid: "google-uid-123" }],
      });
      expect(getOAuthProviderId(user as never, "google.com")).toBe("google-uid-123");
    });

    it("should return null when provider not found", () => {
      const user = makeUser({
        providerData: [{ providerId: "password", uid: "pw-1" }],
      });
      expect(getOAuthProviderId(user as never, "google.com")).toBeNull();
    });

    it("should find correct provider among multiple", () => {
      const user = makeUser({
        providerData: [
          { providerId: "password", uid: "pw-1" },
          { providerId: "apple.com", uid: "apple-uid-789" },
        ],
      });
      expect(getOAuthProviderId(user as never, "apple.com")).toBe("apple-uid-789");
    });
  });

  describe("document transformation (Firebase → PostgreSQL row format)", () => {
    it("should map display_name, avatar_url, and firebase_uid to createUser metadata", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({
        uid: "fb-123",
        displayName: "João Silva",
        photoURL: "https://example.com/joao.jpg",
      });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-1" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-1" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: "user@example.com",
        email_confirm: true,
        user_metadata: {
          display_name: "João Silva",
          avatar_url: "https://example.com/joao.jpg",
          firebase_uid: "fb-123",
        },
      });
    });

    it("should set empty strings for missing displayName and photoURL in metadata", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ displayName: undefined, photoURL: undefined });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-2" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-2" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            display_name: "",
            avatar_url: "",
          }),
        }),
      );
    });

    it("should update profile with display_name, avatar_url, and firebase_uid", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({
        uid: "fb-456",
        displayName: "Maria Santos",
        photoURL: "https://example.com/maria.jpg",
      });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-uuid-789" } },
        error: null,
      });
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue({ update: updateMock });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-uuid-789" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(updateMock).toHaveBeenCalledWith({
        display_name: "Maria Santos",
        avatar_url: "https://example.com/maria.jpg",
        firebase_uid: "fb-456",
      });
      expect(eqMock).toHaveBeenCalledWith("id", "supa-uuid-789");
    });

    it("should set null for missing displayName/photoURL in profile update", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ uid: "fb-null", displayName: undefined, photoURL: undefined });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-null" } },
        error: null,
      });
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      supabase.from.mockReturnValue({ update: updateMock });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-null" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(updateMock).toHaveBeenCalledWith({
        display_name: null,
        avatar_url: null,
        firebase_uid: "fb-null",
      });
    });

    it("should insert OAuth identity for Google provider", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({
        uid: "fb-g1",
        providerData: [{ providerId: "google.com", uid: "google-oauth-123" }],
      });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-g1" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-g1" } },
        error: null,
      });
      supabase.rpc.mockResolvedValue({ error: null });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "google.com", report);

      expect(supabase.rpc).toHaveBeenCalledWith("insert_oauth_identity", {
        p_id: "google-oauth-123",
        p_user_id: "supa-g1",
        p_provider_id: "google-oauth-123",
        p_provider: "google",
        p_identity_data: {
          sub: "google-oauth-123",
          email: "user@example.com",
          email_verified: true,
        },
        p_timestamp: expect.any(String),
      });
    });

    it("should insert OAuth identity for Apple provider with correct provider name", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({
        providerData: [{ providerId: "apple.com", uid: "apple-uid-456" }],
      });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-a1" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-a1" } },
        error: null,
      });
      supabase.rpc.mockResolvedValue({ error: null });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "apple.com", report);

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_oauth_identity",
        expect.objectContaining({ p_provider: "apple" }),
      );
    });

    it("should not insert OAuth identity for password provider", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-pw" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-pw" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe("timestamp preservation", () => {
    it("should not set created_at or updated_at in profile update", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-ts" } },
        error: null,
      });
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      supabase.from.mockReturnValue({ update: updateMock });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-ts" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      const payload = updateMock.mock.calls[0]![0];
      expect(payload).not.toHaveProperty("created_at");
      expect(payload).not.toHaveProperty("updated_at");
    });

    it("should only update display_name, avatar_url, and firebase_uid fields", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-fields" } },
        error: null,
      });
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      supabase.from.mockReturnValue({ update: updateMock });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-fields" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      const payload = updateMock.mock.calls[0]![0];
      expect(Object.keys(payload).sort()).toEqual(
        ["avatar_url", "display_name", "firebase_uid"].sort(),
      );
    });
  });

  describe("user_id mapping (firebase_uid → supabase uuid)", () => {
    it("should store firebase_uid in user_metadata during createUser", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ uid: "fb-map-1" });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-map-1" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-map-1" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            firebase_uid: "fb-map-1",
          }),
        }),
      );
    });

    it("should link supabase user id to firebase_uid via profile update", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ uid: "fb-map-2" });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-linked" } },
        error: null,
      });
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue({ update: updateMock });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-linked" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ firebase_uid: "fb-map-2" }),
      );
      expect(eqMock).toHaveBeenCalledWith("id", "supa-linked");
    });

    it("should verify user creation via getUserById", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-verify" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-verify" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.auth.admin.getUserById).toHaveBeenCalledWith("supa-verify");
    });
  });

  describe("idempotency (skip already-migrated records)", () => {
    it("should load already-migrated UIDs from profiles table", async () => {
      const supabase = mockSupabaseClient();
      const rangeMock = vi.fn().mockResolvedValue({
        data: [{ firebase_uid: "uid-1" }, { firebase_uid: "uid-2" }],
        error: null,
      });
      const notMock = vi.fn().mockReturnValue({ range: rangeMock });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });
      supabase.from.mockReturnValue({ select: selectMock });

      const result = await getAlreadyMigratedUids(supabase as never);

      expect(selectMock).toHaveBeenCalledWith("firebase_uid");
      expect(notMock).toHaveBeenCalledWith("firebase_uid", "is", null);
      expect(result.has("uid-1")).toBe(true);
      expect(result.has("uid-2")).toBe(true);
      expect(result.size).toBe(2);
    });

    it("should paginate when results equal page size", async () => {
      const supabase = mockSupabaseClient();
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        firebase_uid: `uid-${i}`,
      }));
      const page2 = [{ firebase_uid: "uid-1000" }];

      let callCount = 0;
      const rangeMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: page1, error: null });
        }
        return Promise.resolve({ data: page2, error: null });
      });
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({ range: rangeMock }),
        }),
      });

      const result = await getAlreadyMigratedUids(supabase as never);

      expect(rangeMock).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(1001);
    });

    it("should throw when profiles query fails", async () => {
      const supabase = mockSupabaseClient();
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection refused" },
            }),
          }),
        }),
      });

      await expect(getAlreadyMigratedUids(supabase as never)).rejects.toThrow(
        "Failed to query profiles: Connection refused",
      );
    });

    it("should skip duplicate emails detected by Supabase createUser", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: "User already been registered" },
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.skipped.duplicate).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[SKIP] Duplicate email"),
      );
    });

    it("should handle 'already exists' duplicate variant", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: "A user with this email already exists" },
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.skipped.duplicate).toBe(1);
      expect(supabase.auth.admin.getUserById).not.toHaveBeenCalled();
    });

    it("should handle 'duplicate' variant", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: "duplicate key value" },
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.skipped.duplicate).toBe(1);
    });

    it("should track success by provider in report", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser();

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "s-1" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "s-1" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.successByProvider["password"]).toBe(1);
    });
  });

  describe("malformed/missing documents handling", () => {
    it("should log error and record in report when createUser throws unexpected error", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ email: "fail@example.com" });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: new Error("Internal server error"),
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toEqual({
        email: "fail@example.com",
        provider: "password",
        message: "Internal server error",
      });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR] fail@example.com"),
      );
    });

    it("should log error when verification fails after creation", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ email: "verify-fail@example.com" });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-vf" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: null,
        error: { message: "User not found" },
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]!.message).toContain("Verification failed");
    });

    it("should warn but continue when profile update fails", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({ email: "profile-fail@example.com" });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-pf" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: "Constraint violation" },
          }),
        }),
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-pf" } },
        error: null,
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[WARN] Profile update failed"),
      );
      expect(report.successByProvider["password"]).toBe(1);
    });

    it("should handle OAuth identity insertion failure", async () => {
      const supabase = mockSupabaseClient();
      const user = makeUser({
        providerData: [{ providerId: "google.com", uid: "g-fail" }],
      });

      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-oauth-fail" } },
        error: null,
      });
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.rpc.mockResolvedValue({
        error: { message: "RPC failed" },
      });

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "google.com", report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]!.message).toContain("Failed to insert OAuth identity");
    });
  });

  describe("dry run mode", () => {
    it("should not call createUser when DRY_RUN=true", async () => {
      const originalDryRun = process.env.DRY_RUN;
      process.env.DRY_RUN = "true";

      const supabase = mockSupabaseClient();
      const user = makeUser();

      const report = makeReport();
      await migrateUser(supabase as never, user as never, "password", report);

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[DRY RUN]"),
      );
      expect(report.successByProvider["password"]).toBe(1);

      process.env.DRY_RUN = originalDryRun;
    });
  });

  describe("run() orchestration", () => {
    beforeEach(() => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = "/fake/service-account.json";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ project_id: "test" }),
      );
    });

    it("should skip anonymous users in the main loop", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers.mockResolvedValueOnce({
        users: [makeUser({ uid: "anon", providerData: [] })],
        pageToken: undefined,
      });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await run();

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("should skip users without email", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers.mockResolvedValueOnce({
        users: [
          makeUser({
            uid: "no-email",
            email: undefined,
            providerData: [{ providerId: "password", uid: "p1" }],
          }),
        ],
        pageToken: undefined,
      });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await run();

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("should skip already-migrated users", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers.mockResolvedValueOnce({
        users: [makeUser({ uid: "already-done" })],
        pageToken: undefined,
      });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [{ firebase_uid: "already-done" }],
              error: null,
            }),
          }),
        }),
      });

      await run();

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[SKIP] Already migrated"),
      );
    });

    it("should mark GitHub users for re-registration", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers.mockResolvedValueOnce({
        users: [
          makeUser({
            uid: "gh-user",
            email: "dev@github.com",
            displayName: "GH Dev",
            providerData: [{ providerId: "github.com", uid: "gh-123" }],
          }),
        ],
        pageToken: undefined,
      });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await run();

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[NEEDS RE-REGISTER]"),
      );
    });

    it("should skip unsupported providers", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers.mockResolvedValueOnce({
        users: [
          makeUser({
            providerData: [{ providerId: "facebook.com", uid: "fb-123" }],
          }),
        ],
        pageToken: undefined,
      });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await run();

      expect(supabase.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("should paginate Firebase users using pageToken", async () => {
      const mockAuth = { listUsers: vi.fn() };
      vi.mocked(getAuth).mockReturnValue(mockAuth as never);
      mockAuth.listUsers
        .mockResolvedValueOnce({
          users: [makeUser({ uid: "p1-user" })],
          pageToken: "next-token",
        })
        .mockResolvedValueOnce({
          users: [makeUser({ uid: "p2-user", email: "p2@test.com" })],
          pageToken: undefined,
        });

      const supabase = mockSupabaseClient();
      vi.mocked(createClient).mockReturnValue(supabase as never);

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "supa-p" } },
        error: null,
      });
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "supa-p" } },
        error: null,
      });

      await run();

      expect(mockAuth.listUsers).toHaveBeenCalledTimes(2);
      expect(mockAuth.listUsers).toHaveBeenCalledWith(1000, undefined);
      expect(mockAuth.listUsers).toHaveBeenCalledWith(1000, "next-token");
    });
  });

  describe("printReport", () => {
    it("should log all report sections", () => {
      const report = makeReport({
        totalProcessed: 10,
        successByProvider: { password: 3, "google.com": 2 },
        errors: [{ email: "err@x.com", provider: "password", message: "fail" }],
        skipped: { noEmail: 1, anonymous: 2, duplicate: 0, alreadyMigrated: 1 },
        needsReRegister: [{ email: "gh@x.com", displayName: "GH" }],
      });

      printReport(report);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("MIGRATION REPORT"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Total Firebase users processed: 10"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("TOTAL SUCCESS: 5"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("TOTAL SKIPPED: 4"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("TOTAL ERRORS: 1"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("TOTAL NEEDS RE-REGISTER: 1"),
      );
    });

    it("should log 'None' when no errors", () => {
      printReport(makeReport());

      expect(console.log).toHaveBeenCalledWith("  None");
    });
  });

  describe("insertOAuthIdentity", () => {
    it("should throw when RPC fails", async () => {
      const supabase = mockSupabaseClient();
      supabase.rpc.mockResolvedValue({
        error: { message: "RPC error" },
      });

      await expect(
        insertOAuthIdentity(supabase as never, "supa-1", "google.com", "g-1", "a@b.com"),
      ).rejects.toThrow("Failed to insert OAuth identity (google): RPC error");
    });

    it("should map google.com to 'google' provider name", async () => {
      const supabase = mockSupabaseClient();
      supabase.rpc.mockResolvedValue({ error: null });

      await insertOAuthIdentity(supabase as never, "supa-1", "google.com", "g-1", "a@b.com");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_oauth_identity",
        expect.objectContaining({ p_provider: "google" }),
      );
    });

    it("should map apple.com to 'apple' provider name", async () => {
      const supabase = mockSupabaseClient();
      supabase.rpc.mockResolvedValue({ error: null });

      await insertOAuthIdentity(supabase as never, "supa-1", "apple.com", "a-1", "a@b.com");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_oauth_identity",
        expect.objectContaining({ p_provider: "apple" }),
      );
    });
  });

  describe("SUPPORTED_PROVIDERS", () => {
    it("should contain password, google.com, and apple.com", () => {
      expect(SUPPORTED_PROVIDERS.has("password")).toBe(true);
      expect(SUPPORTED_PROVIDERS.has("google.com")).toBe(true);
      expect(SUPPORTED_PROVIDERS.has("apple.com")).toBe(true);
    });

    it("should not contain github.com or facebook.com", () => {
      expect(SUPPORTED_PROVIDERS.has("github.com")).toBe(false);
      expect(SUPPORTED_PROVIDERS.has("facebook.com")).toBe(false);
    });
  });
});
