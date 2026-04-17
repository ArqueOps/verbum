import { cert, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// --- Types ---

type SupportedProvider = "password" | "google.com" | "apple.com";

const SUPPORTED_PROVIDERS = new Set<string>(["password", "google.com", "apple.com"]);

interface MigrationReport {
  totalProcessed: number;
  successByProvider: Record<string, number>;
  errors: Array<{ email: string; provider: string; message: string }>;
  skipped: {
    noEmail: number;
    anonymous: number;
    duplicate: number;
    alreadyMigrated: number;
  };
  needsReRegister: Array<{ email: string; displayName: string | undefined }>;
}

// --- Environment ---

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// --- Firebase setup ---

function initFirebase(): void {
  const serviceAccountPath = requireEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  initializeApp({ credential: cert(serviceAccount) });
}

async function fetchAllFirebaseUsers(): Promise<UserRecord[]> {
  const auth = getAuth();
  const users: UserRecord[] = [];
  let nextPageToken: string | undefined;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return users;
}

// --- Supabase setup ---

function createSupabaseAdmin(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// --- Migration logic ---

function getPrimaryProvider(user: UserRecord): string | null {
  if (!user.providerData || user.providerData.length === 0) {
    return null;
  }
  return user.providerData[0].providerId;
}

function isAnonymous(user: UserRecord): boolean {
  return (
    !user.providerData ||
    user.providerData.length === 0 ||
    (user.providerData.length === 1 && user.providerData[0].providerId === "anonymous")
  );
}

async function getAlreadyMigratedUids(supabase: SupabaseClient): Promise<Set<string>> {
  const migrated = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("firebase_uid")
      .not("firebase_uid", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to query profiles: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.firebase_uid) {
        migrated.add(row.firebase_uid as string);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return migrated;
}

function getOAuthProviderId(user: UserRecord, providerName: string): string | null {
  const providerInfo = user.providerData.find((p) => p.providerId === providerName);
  return providerInfo?.uid ?? null;
}

async function insertOAuthIdentity(
  supabase: SupabaseClient,
  supabaseUserId: string,
  provider: string,
  providerUserId: string,
  email: string,
): Promise<void> {
  const providerName = provider === "google.com" ? "google" : "apple";
  const now = new Date().toISOString();

  const { error } = await supabase.rpc("insert_oauth_identity", {
    p_id: providerUserId,
    p_user_id: supabaseUserId,
    p_provider_id: providerUserId,
    p_provider: providerName,
    p_identity_data: { sub: providerUserId, email, email_verified: true },
    p_timestamp: now,
  });

  if (error) {
    throw new Error(`Failed to insert OAuth identity (${providerName}): ${error.message}`);
  }
}

async function migrateUser(
  supabase: SupabaseClient,
  user: UserRecord,
  provider: SupportedProvider,
  report: MigrationReport,
): Promise<void> {
  const email = user.email!;
  const isDryRun = process.env.DRY_RUN === "true";

  if (isDryRun) {
    console.log(`  [DRY RUN] Would migrate: ${email} (${provider})`);
    report.successByProvider[provider] = (report.successByProvider[provider] ?? 0) + 1;
    return;
  }

  try {
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: user.displayName ?? "",
        avatar_url: user.photoURL ?? "",
        firebase_uid: user.uid,
      },
    });

    if (createError) {
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("duplicate") ||
        createError.message.includes("already exists")
      ) {
        console.log(`  [SKIP] Duplicate email in Supabase: ${email}`);
        report.skipped.duplicate++;
        return;
      }
      throw createError;
    }

    const supabaseUserId = authUser.user.id;

    // Update profile with firebase_uid (trigger auto-creates the profile row)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: user.displayName ?? null,
        avatar_url: user.photoURL ?? null,
        firebase_uid: user.uid,
      })
      .eq("id", supabaseUserId);

    if (profileError) {
      console.warn(`  [WARN] Profile update failed for ${email}: ${profileError.message}`);
    }

    // Insert OAuth identity for Google/Apple providers
    if (provider === "google.com" || provider === "apple.com") {
      const providerUid = getOAuthProviderId(user, provider);
      if (providerUid) {
        await insertOAuthIdentity(supabase, supabaseUserId, provider, providerUid, email);
      }
    }

    // Verify the user was created
    const { data: verifyData, error: verifyError } =
      await supabase.auth.admin.getUserById(supabaseUserId);

    if (verifyError || !verifyData?.user) {
      throw new Error(`Verification failed after createUser: ${verifyError?.message ?? "user not found"}`);
    }

    console.log(`  [OK] Migrated: ${email} (${provider})`);
    report.successByProvider[provider] = (report.successByProvider[provider] ?? 0) + 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] ${email} (${provider}): ${message}`);
    report.errors.push({ email, provider, message });
  }
}

async function run(): Promise<void> {
  console.log("=== Firebase Auth → Supabase Auth Migration ===\n");

  // Initialize services
  console.log("Initializing Firebase Admin SDK...");
  initFirebase();

  console.log("Initializing Supabase Admin client...\n");
  const supabase = createSupabaseAdmin();

  // Fetch all Firebase users
  console.log("Fetching all Firebase Auth users...");
  const firebaseUsers = await fetchAllFirebaseUsers();
  console.log(`Found ${firebaseUsers.length} Firebase users.\n`);

  // Load already-migrated UIDs for idempotency
  console.log("Loading already-migrated users from profiles.firebase_uid...");
  const alreadyMigrated = await getAlreadyMigratedUids(supabase);
  console.log(`Found ${alreadyMigrated.size} already-migrated users.\n`);

  // Initialize report
  const report: MigrationReport = {
    totalProcessed: firebaseUsers.length,
    successByProvider: {},
    errors: [],
    skipped: { noEmail: 0, anonymous: 0, duplicate: 0, alreadyMigrated: 0 },
    needsReRegister: [],
  };

  // Process each user
  console.log("Processing users...\n");

  for (const user of firebaseUsers) {
    // Skip anonymous users
    if (isAnonymous(user)) {
      report.skipped.anonymous++;
      continue;
    }

    // Skip users without email
    if (!user.email) {
      report.skipped.noEmail++;
      continue;
    }

    // Skip already-migrated users (idempotency)
    if (alreadyMigrated.has(user.uid)) {
      console.log(`  [SKIP] Already migrated: ${user.email}`);
      report.skipped.alreadyMigrated++;
      continue;
    }

    const provider = getPrimaryProvider(user);

    // GitHub users → needs re-register
    if (provider === "github.com") {
      console.log(`  [NEEDS RE-REGISTER] GitHub user: ${user.email}`);
      report.needsReRegister.push({
        email: user.email,
        displayName: user.displayName,
      });
      continue;
    }

    // Unsupported/unknown providers → skip
    if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
      report.skipped.noEmail++;
      continue;
    }

    await migrateUser(supabase, user, provider as SupportedProvider, report);
  }

  // Print final report
  printReport(report);
}

function printReport(report: MigrationReport): void {
  console.log("\n=== MIGRATION REPORT ===\n");
  console.log(`Total Firebase users processed: ${report.totalProcessed}`);

  console.log("\n--- Success by Provider ---");
  for (const [provider, count] of Object.entries(report.successByProvider)) {
    console.log(`  ${provider}: ${count}`);
  }
  const totalSuccess = Object.values(report.successByProvider).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL SUCCESS: ${totalSuccess}`);

  console.log("\n--- Skipped ---");
  console.log(`  No email: ${report.skipped.noEmail}`);
  console.log(`  Anonymous: ${report.skipped.anonymous}`);
  console.log(`  Duplicate in Supabase: ${report.skipped.duplicate}`);
  console.log(`  Already migrated: ${report.skipped.alreadyMigrated}`);
  const totalSkipped =
    report.skipped.noEmail +
    report.skipped.anonymous +
    report.skipped.duplicate +
    report.skipped.alreadyMigrated;
  console.log(`  TOTAL SKIPPED: ${totalSkipped}`);

  console.log("\n--- Errors ---");
  if (report.errors.length === 0) {
    console.log("  None");
  } else {
    for (const err of report.errors) {
      console.log(`  ${err.email} (${err.provider}): ${err.message}`);
    }
    console.log(`  TOTAL ERRORS: ${report.errors.length}`);
  }

  console.log("\n--- Needs Re-Register (GitHub users) ---");
  if (report.needsReRegister.length === 0) {
    console.log("  None");
  } else {
    for (const user of report.needsReRegister) {
      console.log(`  ${user.email} (${user.displayName ?? "no name"})`);
    }
    console.log(`  TOTAL NEEDS RE-REGISTER: ${report.needsReRegister.length}`);
  }

  console.log("\n=== END REPORT ===");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
