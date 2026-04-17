import { describe, it, expect, beforeEach } from "vitest";
import { runMigration } from "./migrate";
import type { FirebaseUser } from "./filter-users";
import type { FirebaseClient, SupabaseAdminClient, SupabaseUser } from "./types";

function makeFirebaseUser(overrides: Partial<FirebaseUser> & { providerIds: string[] }): FirebaseUser {
  const { providerIds, ...rest } = overrides;
  return {
    uid: rest.uid ?? "fb-uid-1",
    email: rest.email,
    displayName: rest.displayName,
    providerData: providerIds.map((id) => ({ providerId: id, email: rest.email })),
  };
}

const MOCK_FIREBASE_USERS: FirebaseUser[] = [
  makeFirebaseUser({
    uid: "fb-email-user",
    email: "email@example.com",
    displayName: "Email User",
    providerIds: ["password"],
  }),
  makeFirebaseUser({
    uid: "fb-google-user",
    email: "google@example.com",
    displayName: "Google User",
    providerIds: ["google.com"],
  }),
  makeFirebaseUser({
    uid: "fb-apple-user",
    email: "apple@example.com",
    displayName: "Apple User",
    providerIds: ["apple.com"],
  }),
  makeFirebaseUser({
    uid: "fb-github-user",
    email: "github@example.com",
    displayName: "Github User",
    providerIds: ["github.com"],
  }),
  makeFirebaseUser({
    uid: "fb-anon-user",
    email: "anon@example.com",
    displayName: "Anon User",
    providerIds: ["anonymous"],
  }),
  makeFirebaseUser({
    uid: "fb-noemail-user",
    email: undefined,
    displayName: "No Email",
    providerIds: ["password"],
  }),
];

function createMockFirebase(users: FirebaseUser[]): FirebaseClient {
  return {
    async listUsers() {
      return [...users];
    },
  };
}

interface StoredProfile {
  userId: string;
  firebaseUid: string;
  displayName?: string;
}

interface StoredIdentity {
  userId: string;
  provider: string;
  identityData: Record<string, unknown>;
}

function createMockSupabase() {
  const users = new Map<string, SupabaseUser>();
  const emailIndex = new Map<string, string>();
  const profiles: StoredProfile[] = [];
  const identities: StoredIdentity[] = [];
  let idCounter = 0;

  const client: SupabaseAdminClient = {
    async listUsersByEmail(email: string): Promise<SupabaseUser[]> {
      const userId = emailIndex.get(email);
      if (!userId) return [];
      const user = users.get(userId);
      return user ? [user] : [];
    },

    async createUser(params): Promise<SupabaseUser> {
      if (emailIndex.has(params.email)) {
        throw new Error(`User with email ${params.email} already exists`);
      }
      idCounter++;
      const user: SupabaseUser = {
        id: `supa-uuid-${idCounter}`,
        email: params.email,
        identities: [],
      };
      users.set(user.id, user);
      emailIndex.set(params.email, user.id);
      return user;
    },

    async createIdentity(userId, provider, identityData): Promise<void> {
      identities.push({ userId, provider, identityData });
      const user = users.get(userId);
      if (user) {
        user.identities = user.identities ?? [];
        user.identities.push({ provider, identity_data: identityData });
      }
    },

    async createProfile(userId, firebaseUid, displayName): Promise<void> {
      profiles.push({ userId, firebaseUid, displayName });
    },
  };

  return { client, users, emailIndex, profiles, identities };
}

describe("Migration flow with realistic mocks", () => {
  let firebase: FirebaseClient;
  let supabaseMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    firebase = createMockFirebase(MOCK_FIREBASE_USERS);
    supabaseMock = createMockSupabase();
  });

  it("should create exactly 3 Supabase users (email, google, apple)", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.created).toBe(3);
    expect(supabaseMock.users.size).toBe(3);

    const emails = [...supabaseMock.emailIndex.keys()].sort();
    expect(emails).toEqual(["apple@example.com", "email@example.com", "google@example.com"]);
  });

  it("should insert 2 OAuth identities (google, apple) — no github.com identity ever created", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.identitiesInserted).toBe(2);
    expect(supabaseMock.identities).toHaveLength(2);

    const providers = supabaseMock.identities.map((i) => i.provider).sort();
    expect(providers).toEqual(["apple", "google"]);

    const hasGithub = supabaseMock.identities.some(
      (i) => i.provider === "github" || i.provider === "github.com",
    );
    expect(hasGithub).toBe(false);
  });

  it("should create 3 profiles with correct firebase_uid and role implied 'free'", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.profilesCreated).toBe(3);
    expect(supabaseMock.profiles).toHaveLength(3);

    const firebaseUids = supabaseMock.profiles.map((p) => p.firebaseUid).sort();
    expect(firebaseUids).toEqual(["fb-apple-user", "fb-email-user", "fb-google-user"]);

    for (const profile of supabaseMock.profiles) {
      expect(profile.userId).toMatch(/^supa-uuid-/);
      expect(profile.firebaseUid).toBeTruthy();
    }
  });

  it("should report github user in needs_re-register and NOT migrate them", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.needsReRegister).toEqual(["fb-github-user"]);

    const githubEmail = supabaseMock.emailIndex.has("github@example.com");
    expect(githubEmail).toBe(false);
  });

  it("should skip anonymous and no-email users", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.skipped).toBe(2);

    expect(supabaseMock.emailIndex.has("anon@example.com")).toBe(false);
  });

  it("should report correct totals for the full 6-user scenario", async () => {
    const report = await runMigration(firebase, supabaseMock.client);

    expect(report.created).toBe(3);
    expect(report.identitiesInserted).toBe(2);
    expect(report.profilesCreated).toBe(3);
    expect(report.needsReRegister).toEqual(["fb-github-user"]);
    expect(report.skipped).toBe(2);
    expect(report.errors).toHaveLength(0);
  });

  it("should create zero new users on re-run (idempotency)", async () => {
    const firstReport = await runMigration(firebase, supabaseMock.client);
    expect(firstReport.created).toBe(3);

    const secondReport = await runMigration(firebase, supabaseMock.client);

    expect(secondReport.created).toBe(0);
    expect(secondReport.identitiesInserted).toBe(0);
    expect(secondReport.profilesCreated).toBe(0);
    expect(secondReport.needsReRegister).toEqual(["fb-github-user"]);
    expect(secondReport.skipped).toBe(2);
    expect(secondReport.errors).toHaveLength(0);

    expect(supabaseMock.users.size).toBe(3);
    expect(supabaseMock.profiles).toHaveLength(3);
    expect(supabaseMock.identities).toHaveLength(2);
  });

  it("should never create a github.com identity across any run", async () => {
    await runMigration(firebase, supabaseMock.client);
    await runMigration(firebase, supabaseMock.client);

    const allProviders = supabaseMock.identities.map((i) => i.provider);
    expect(allProviders).not.toContain("github");
    expect(allProviders).not.toContain("github.com");
  });
});
