import type { FirebaseUser } from "./filter-users";

export interface IdempotencyResult {
  toMigrate: FirebaseUser[];
  alreadyMigrated: FirebaseUser[];
}

export function checkIdempotency(
  users: FirebaseUser[],
  existingFirebaseUids: Set<string>,
): IdempotencyResult {
  const toMigrate: FirebaseUser[] = [];
  const alreadyMigrated: FirebaseUser[] = [];

  for (const user of users) {
    if (existingFirebaseUids.has(user.uid)) {
      alreadyMigrated.push(user);
    } else {
      toMigrate.push(user);
    }
  }

  return { toMigrate, alreadyMigrated };
}
