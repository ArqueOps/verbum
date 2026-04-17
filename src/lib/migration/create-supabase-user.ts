import type { SupabaseClient } from "@supabase/supabase-js";

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  providerData: Array<{
    providerId: string;
    uid: string;
  }>;
}

export interface MigrationReport {
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export async function createSupabaseUser(
  supabase: SupabaseClient,
  firebaseUser: FirebaseUser,
  report: MigrationReport,
): Promise<string | null> {
  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: firebaseUser.email,
      email_confirm: true,
    });

  if (createError) {
    if (createError.status === 422 || createError.message?.includes("already been registered")) {
      console.log(`Skipping duplicate email: ${firebaseUser.email}`);
      report.skipped++;
      return null;
    }
    console.error(`Failed to create user ${firebaseUser.email}: ${createError.message}`);
    report.failed++;
    report.errors.push({ email: firebaseUser.email, error: createError.message });
    return null;
  }

  const userId = createData.user.id;

  for (const provider of firebaseUser.providerData) {
    if (provider.providerId === "google.com") {
      await insertOAuthIdentity(supabase, userId, "google", provider.uid, firebaseUser.email);
    } else if (provider.providerId === "apple.com") {
      await insertOAuthIdentity(supabase, userId, "apple", provider.uid, firebaseUser.email);
    }
  }

  await createProfile(supabase, userId, firebaseUser);

  report.created++;
  return userId;
}

async function insertOAuthIdentity(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  providerId: string,
  email: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("identities" as never).insert({
    id: providerId,
    user_id: userId,
    provider,
    identity_data: { sub: providerId, email },
    provider_id: providerId,
    last_sign_in_at: now,
    created_at: now,
    updated_at: now,
  } as never);

  if (error) {
    console.error(`Failed to insert ${provider} identity for ${userId}: ${error.message}`);
  }
}

async function createProfile(
  supabase: SupabaseClient,
  userId: string,
  firebaseUser: FirebaseUser,
): Promise<void> {
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    display_name: firebaseUser.displayName ?? null,
    avatar_url: firebaseUser.photoURL ?? null,
    role: "free",
    firebase_uid: firebaseUser.uid,
  } as never);

  if (error) {
    console.error(`Failed to create profile for ${userId}: ${error.message}`);
  }
}
