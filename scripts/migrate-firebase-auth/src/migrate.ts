import { filterUsersByProvider } from "./filter-users";
import type { FirebaseClient, SupabaseAdminClient, MigrationReport } from "./types";

const PROVIDER_TO_SUPABASE: Record<string, string> = {
  "google.com": "google",
  "apple.com": "apple",
};

export async function runMigration(
  firebase: FirebaseClient,
  supabase: SupabaseAdminClient,
): Promise<MigrationReport> {
  const report: MigrationReport = {
    created: 0,
    identitiesInserted: 0,
    profilesCreated: 0,
    needsReRegister: [],
    skipped: 0,
    errors: [],
  };

  const firebaseUsers = await firebase.listUsers();
  const filtered = filterUsersByProvider(firebaseUsers);

  report.skipped = filtered.skipped.length;
  report.needsReRegister = filtered.needsReRegister.map((u) => u.uid);

  for (const { user, provider } of filtered.migratable) {
    try {
      const existing = await supabase.listUsersByEmail(user.email!);
      if (existing.length > 0) {
        continue;
      }

      const created = await supabase.createUser({
        email: user.email!,
        email_confirm: true,
        user_metadata: {
          display_name: user.displayName,
          firebase_uid: user.uid,
        },
      });
      report.created++;

      const supabaseProvider = PROVIDER_TO_SUPABASE[provider];
      if (supabaseProvider) {
        await supabase.createIdentity(created.id, supabaseProvider, {
          email: user.email,
          firebase_uid: user.uid,
        });
        report.identitiesInserted++;
      }

      await supabase.createProfile(created.id, user.uid, user.displayName);
      report.profilesCreated++;
    } catch (err) {
      report.errors.push({
        uid: user.uid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}
