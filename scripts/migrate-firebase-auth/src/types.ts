export interface SupabaseUser {
  id: string;
  email: string;
  identities?: Array<{ provider: string; identity_data: Record<string, unknown> }>;
}

export interface MigrationReport {
  created: number;
  identitiesInserted: number;
  profilesCreated: number;
  needsReRegister: string[];
  skipped: number;
  errors: Array<{ uid: string; error: string }>;
}

export interface FirebaseClient {
  listUsers(): Promise<import("./filter-users").FirebaseUser[]>;
}

export interface SupabaseAdminClient {
  listUsersByEmail(email: string): Promise<SupabaseUser[]>;
  createUser(params: {
    email: string;
    email_confirm: boolean;
    user_metadata?: Record<string, unknown>;
  }): Promise<SupabaseUser>;
  createIdentity(userId: string, provider: string, identityData: Record<string, unknown>): Promise<void>;
  createProfile(userId: string, firebaseUid: string, displayName?: string): Promise<void>;
}
