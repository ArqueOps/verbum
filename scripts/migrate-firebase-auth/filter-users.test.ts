import { describe, it, expect } from "vitest";
import {
  filterUsersByProvider,
  type FirebaseUser,
} from "./filter-users";

function makeUser(
  overrides: Partial<FirebaseUser> & { providerIds?: string[] } = {},
): FirebaseUser {
  const { providerIds = ["password"], ...rest } = overrides;
  const hasEmail = "email" in overrides;
  const email = hasEmail ? overrides.email : "user@example.com";
  return {
    uid: rest.uid ?? "uid-1",
    email,
    displayName: rest.displayName ?? "Test User",
    providerData:
      rest.providerData ??
      providerIds.map((id) => ({ providerId: id, email })),
  };
}

describe("filterUsersByProvider", () => {
  it("should classify user with password provider as migratable", () => {
    const users = [makeUser({ providerIds: ["password"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(1);
    expect(result.migratable[0]!.provider).toBe("password");
    expect(result.needsReRegister).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("should classify user with google.com provider as migratable", () => {
    const users = [makeUser({ providerIds: ["google.com"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(1);
    expect(result.migratable[0]!.provider).toBe("google.com");
  });

  it("should classify user with apple.com provider as migratable", () => {
    const users = [makeUser({ providerIds: ["apple.com"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(1);
    expect(result.migratable[0]!.provider).toBe("apple.com");
  });

  it("should classify user with github.com provider as needs_re-register", () => {
    const users = [makeUser({ providerIds: ["github.com"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(0);
    expect(result.needsReRegister).toHaveLength(1);
    expect(result.needsReRegister[0]!.uid).toBe("uid-1");
  });

  it("should skip user with anonymous provider", () => {
    const users = [makeUser({ providerIds: ["anonymous"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(0);
    expect(result.needsReRegister).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("should skip user with no email", () => {
    const users = [makeUser({ email: undefined, providerIds: ["password"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("should identify supported provider among multiple providers", () => {
    const users = [makeUser({ providerIds: ["phone", "google.com"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(1);
    expect(result.migratable[0]!.provider).toBe("google.com");
  });

  it("should prefer first supported provider when user has github.com and google.com", () => {
    const users = [makeUser({ providerIds: ["github.com", "google.com"] })];
    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(1);
    expect(result.migratable[0]!.provider).toBe("google.com");
    expect(result.needsReRegister).toHaveLength(0);
  });

  it("should return empty results for empty user list", () => {
    const result = filterUsersByProvider([]);

    expect(result.migratable).toHaveLength(0);
    expect(result.needsReRegister).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("should correctly categorize a mixed set of users", () => {
    const users = [
      makeUser({ uid: "u1", email: "a@test.com", providerIds: ["password"] }),
      makeUser({ uid: "u2", email: "b@test.com", providerIds: ["github.com"] }),
      makeUser({ uid: "u3", email: "c@test.com", providerIds: ["anonymous"] }),
      makeUser({ uid: "u4", email: undefined, providerIds: ["password"] }),
      makeUser({ uid: "u5", email: "d@test.com", providerIds: ["apple.com"] }),
    ];

    const result = filterUsersByProvider(users);

    expect(result.migratable).toHaveLength(2);
    expect(result.migratable.map((m) => m.user.uid)).toEqual(["u1", "u5"]);
    expect(result.needsReRegister).toHaveLength(1);
    expect(result.needsReRegister[0]!.uid).toBe("u2");
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.map((s) => s.uid)).toEqual(["u3", "u4"]);
  });
});
