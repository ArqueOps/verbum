export interface FirebaseProviderData {
  providerId: string;
  email?: string;
}

export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  providerData: FirebaseProviderData[];
}

export interface FilteredUsers {
  migratable: Array<{ user: FirebaseUser; provider: string }>;
  needsReRegister: FirebaseUser[];
  skipped: FirebaseUser[];
}

const SUPPORTED_PROVIDERS = ["password", "google.com", "apple.com"] as const;
const SKIP_PROVIDERS = ["anonymous"] as const;

export function filterUsersByProvider(users: FirebaseUser[]): FilteredUsers {
  const result: FilteredUsers = {
    migratable: [],
    needsReRegister: [],
    skipped: [],
  };

  for (const user of users) {
    if (!user.email) {
      result.skipped.push(user);
      continue;
    }

    const providers = user.providerData.map((p) => p.providerId);

    const isAnonymous = providers.some((p) =>
      (SKIP_PROVIDERS as readonly string[]).includes(p),
    );
    if (isAnonymous) {
      result.skipped.push(user);
      continue;
    }

    const supportedProvider = providers.find((p) =>
      (SUPPORTED_PROVIDERS as readonly string[]).includes(p),
    );

    if (supportedProvider) {
      result.migratable.push({ user, provider: supportedProvider });
    } else {
      result.needsReRegister.push(user);
    }
  }

  return result;
}
