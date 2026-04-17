import { describe, it, expect } from "vitest";
import { generateReport } from "./report";
import type { MigrationSuccess, MigrationError, SkippedUser } from "./report";
import type { FirebaseUser } from "./filter-users";

function makeUser(uid: string, email?: string): FirebaseUser {
  return {
    uid,
    email,
    displayName: `User ${uid}`,
    providerData: [{ providerId: "password", email }],
  };
}

describe("generateReport", () => {
  it("should include correct total count", () => {
    const report = generateReport({
      total: 42,
      successes: [],
      errors: [],
      skipped: [],
      needsReRegister: [],
    });

    expect(report.total).toBe(42);
  });

  it("should include success breakdown by provider", () => {
    const successes: MigrationSuccess[] = [
      { user: makeUser("u1", "a@test.com"), provider: "password" },
      { user: makeUser("u2", "b@test.com"), provider: "password" },
      { user: makeUser("u3", "c@test.com"), provider: "google.com" },
      { user: makeUser("u4", "d@test.com"), provider: "apple.com" },
      { user: makeUser("u5", "e@test.com"), provider: "google.com" },
    ];

    const report = generateReport({
      total: 5,
      successes,
      errors: [],
      skipped: [],
      needsReRegister: [],
    });

    expect(report.success.count).toBe(5);
    expect(report.success.byProvider).toEqual({
      password: 2,
      "google.com": 2,
      "apple.com": 1,
    });
  });

  it("should include error count with messages", () => {
    const errors: MigrationError[] = [
      { user: makeUser("u1", "a@test.com"), message: "Email already registered" },
      { user: makeUser("u2", "b@test.com"), message: "Invalid password hash" },
    ];

    const report = generateReport({
      total: 5,
      successes: [],
      errors,
      skipped: [],
      needsReRegister: [],
    });

    expect(report.errors.count).toBe(2);
    expect(report.errors.details).toEqual([
      { email: "a@test.com", message: "Email already registered" },
      { email: "b@test.com", message: "Invalid password hash" },
    ]);
  });

  it("should include skipped count with reasons", () => {
    const skipped: SkippedUser[] = [
      { user: makeUser("u1"), reason: "no email" },
      { user: makeUser("u2"), reason: "anonymous" },
      { user: makeUser("u3"), reason: "no email" },
      { user: makeUser("u4"), reason: "duplicate" },
      { user: makeUser("u5"), reason: "anonymous" },
      { user: makeUser("u6"), reason: "no email" },
    ];

    const report = generateReport({
      total: 10,
      successes: [],
      errors: [],
      skipped,
      needsReRegister: [],
    });

    expect(report.skipped.count).toBe(6);
    expect(report.skipped.reasons).toEqual({
      "no email": 3,
      anonymous: 2,
      duplicate: 1,
    });
  });

  it("should include needs_re_register list with github user emails", () => {
    const needsReRegister: FirebaseUser[] = [
      makeUser("u1", "dev1@github.com"),
      makeUser("u2", "dev2@github.com"),
      makeUser("u3", "dev3@github.com"),
    ];

    const report = generateReport({
      total: 10,
      successes: [],
      errors: [],
      skipped: [],
      needsReRegister,
    });

    expect(report.needsReRegister.count).toBe(3);
    expect(report.needsReRegister.emails).toEqual([
      "dev1@github.com",
      "dev2@github.com",
      "dev3@github.com",
    ]);
  });

  it("should filter out undefined emails from needs_re_register list", () => {
    const needsReRegister: FirebaseUser[] = [
      makeUser("u1", "dev@github.com"),
      makeUser("u2", undefined),
    ];

    const report = generateReport({
      total: 2,
      successes: [],
      errors: [],
      skipped: [],
      needsReRegister,
    });

    expect(report.needsReRegister.count).toBe(2);
    expect(report.needsReRegister.emails).toEqual(["dev@github.com"]);
  });

  it("should produce report with all zeros for empty migration", () => {
    const report = generateReport({
      total: 0,
      successes: [],
      errors: [],
      skipped: [],
      needsReRegister: [],
    });

    expect(report.total).toBe(0);
    expect(report.success.count).toBe(0);
    expect(report.success.byProvider).toEqual({});
    expect(report.errors.count).toBe(0);
    expect(report.errors.details).toEqual([]);
    expect(report.skipped.count).toBe(0);
    expect(report.skipped.reasons).toEqual({});
    expect(report.needsReRegister.count).toBe(0);
    expect(report.needsReRegister.emails).toEqual([]);
  });

  it("should produce correct report for a full realistic migration", () => {
    const successes: MigrationSuccess[] = [
      { user: makeUser("u1", "alice@mail.com"), provider: "password" },
      { user: makeUser("u2", "bob@mail.com"), provider: "google.com" },
      { user: makeUser("u3", "carol@mail.com"), provider: "apple.com" },
    ];
    const errors: MigrationError[] = [
      { user: makeUser("u4", "dave@mail.com"), message: "Duplicate email" },
    ];
    const skipped: SkippedUser[] = [
      { user: makeUser("u5"), reason: "no email" },
      { user: makeUser("u6", "anon@mail.com"), reason: "anonymous" },
      { user: makeUser("u7", "dup@mail.com"), reason: "duplicate" },
    ];
    const needsReRegister: FirebaseUser[] = [
      makeUser("u8", "ghuser@github.com"),
    ];

    const report = generateReport({
      total: 8,
      successes,
      errors,
      skipped,
      needsReRegister,
    });

    expect(report.total).toBe(8);
    expect(report.success.count).toBe(3);
    expect(report.success.byProvider["password"]).toBe(1);
    expect(report.success.byProvider["google.com"]).toBe(1);
    expect(report.success.byProvider["apple.com"]).toBe(1);
    expect(report.errors.count).toBe(1);
    expect(report.errors.details[0]!.message).toBe("Duplicate email");
    expect(report.skipped.count).toBe(3);
    expect(report.skipped.reasons["no email"]).toBe(1);
    expect(report.skipped.reasons["anonymous"]).toBe(1);
    expect(report.skipped.reasons["duplicate"]).toBe(1);
    expect(report.needsReRegister.count).toBe(1);
    expect(report.needsReRegister.emails).toEqual(["ghuser@github.com"]);
  });
});
