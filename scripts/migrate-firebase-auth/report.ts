import type { FirebaseUser } from "./filter-users";

export interface MigrationSuccess {
  user: FirebaseUser;
  provider: string;
}

export interface MigrationError {
  user: FirebaseUser;
  message: string;
}

export interface SkippedUser {
  user: FirebaseUser;
  reason: string;
}

export interface MigrationReport {
  total: number;
  success: {
    count: number;
    byProvider: Record<string, number>;
  };
  errors: {
    count: number;
    details: Array<{ email?: string; message: string }>;
  };
  skipped: {
    count: number;
    reasons: Record<string, number>;
  };
  needsReRegister: {
    count: number;
    emails: string[];
  };
}

export function generateReport(input: {
  total: number;
  successes: MigrationSuccess[];
  errors: MigrationError[];
  skipped: SkippedUser[];
  needsReRegister: FirebaseUser[];
}): MigrationReport {
  const byProvider: Record<string, number> = {};
  for (const s of input.successes) {
    byProvider[s.provider] = (byProvider[s.provider] ?? 0) + 1;
  }

  const reasons: Record<string, number> = {};
  for (const s of input.skipped) {
    reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;
  }

  const emails = input.needsReRegister
    .map((u) => u.email)
    .filter((e): e is string => e !== undefined);

  return {
    total: input.total,
    success: {
      count: input.successes.length,
      byProvider,
    },
    errors: {
      count: input.errors.length,
      details: input.errors.map((e) => ({
        email: e.user.email,
        message: e.message,
      })),
    },
    skipped: {
      count: input.skipped.length,
      reasons,
    },
    needsReRegister: {
      count: input.needsReRegister.length,
      emails,
    },
  };
}
