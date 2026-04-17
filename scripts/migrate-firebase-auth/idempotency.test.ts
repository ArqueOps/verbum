import { describe, it, expect } from "vitest";
import { checkIdempotency } from "./idempotency";
import type { FirebaseUser } from "./filter-users";

function makeUser(uid: string, email?: string): FirebaseUser {
  return {
    uid,
    email: email ?? `${uid}@example.com`,
    displayName: `User ${uid}`,
    providerData: [{ providerId: "password", email: email ?? `${uid}@example.com` }],
  };
}

describe("checkIdempotency", () => {
  it("should skip user whose firebase_uid already exists in profiles", () => {
    const users = [makeUser("fb-001"), makeUser("fb-002")];
    const existing = new Set(["fb-001"]);

    const result = checkIdempotency(users, existing);

    expect(result.alreadyMigrated).toHaveLength(1);
    expect(result.alreadyMigrated[0]!.uid).toBe("fb-001");
    expect(result.toMigrate).toHaveLength(1);
    expect(result.toMigrate[0]!.uid).toBe("fb-002");
  });

  it("should process user normally when NOT in profiles", () => {
    const users = [makeUser("fb-new")];
    const existing = new Set<string>();

    const result = checkIdempotency(users, existing);

    expect(result.toMigrate).toHaveLength(1);
    expect(result.toMigrate[0]!.uid).toBe("fb-new");
    expect(result.alreadyMigrated).toHaveLength(0);
  });

  it("should produce zero new users when all already migrated", () => {
    const users = [
      makeUser("fb-001"),
      makeUser("fb-002"),
      makeUser("fb-003"),
    ];
    const existing = new Set(["fb-001", "fb-002", "fb-003"]);

    const result = checkIdempotency(users, existing);

    expect(result.toMigrate).toHaveLength(0);
    expect(result.alreadyMigrated).toHaveLength(3);
  });

  it("should handle empty user list", () => {
    const result = checkIdempotency([], new Set(["fb-001"]));

    expect(result.toMigrate).toHaveLength(0);
    expect(result.alreadyMigrated).toHaveLength(0);
  });

  it("should handle empty existing UIDs set", () => {
    const users = [makeUser("fb-001"), makeUser("fb-002")];
    const result = checkIdempotency(users, new Set());

    expect(result.toMigrate).toHaveLength(2);
    expect(result.alreadyMigrated).toHaveLength(0);
  });

  it("should preserve user data in both result arrays", () => {
    const user = makeUser("fb-existing", "test@test.com");
    const result = checkIdempotency([user], new Set(["fb-existing"]));

    expect(result.alreadyMigrated[0]!.email).toBe("test@test.com");
    expect(result.alreadyMigrated[0]!.displayName).toBe("User fb-existing");
  });

  it("should correctly partition a large mixed set", () => {
    const users = Array.from({ length: 100 }, (_, i) => makeUser(`fb-${i}`));
    const existing = new Set(
      Array.from({ length: 50 }, (_, i) => `fb-${i * 2}`),
    );

    const result = checkIdempotency(users, existing);

    expect(result.alreadyMigrated).toHaveLength(50);
    expect(result.toMigrate).toHaveLength(50);
    expect(result.toMigrate.every((u) => !existing.has(u.uid))).toBe(true);
    expect(result.alreadyMigrated.every((u) => existing.has(u.uid))).toBe(true);
  });

  it("should not re-create users on second run of full migration", () => {
    const users = [makeUser("fb-a"), makeUser("fb-b"), makeUser("fb-c")];

    const firstRun = checkIdempotency(users, new Set());
    expect(firstRun.toMigrate).toHaveLength(3);

    const migratedUids = new Set(firstRun.toMigrate.map((u) => u.uid));
    const secondRun = checkIdempotency(users, migratedUids);

    expect(secondRun.toMigrate).toHaveLength(0);
    expect(secondRun.alreadyMigrated).toHaveLength(3);
  });
});
