import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.CRED_SUPABASE_SERVICE_ROLE_KEY ??
  "";

export const TEST_USER_EMAIL = "e2e-study-filters@test.verbum.dev";
export const TEST_USER_PASSWORD = "E2eTestPass!2026";

export function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SeededStudy {
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  created_at: string;
}

export interface SeedResult {
  userId: string;
  studies: SeededStudy[];
  bookmarkedIds: string[];
}

export async function seedTestData(): Promise<SeedResult> {
  const admin = getAdminClient();

  // Create or get test user
  let userId: string;
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users.find(
    (u) => u.email === TEST_USER_EMAIL,
  );

  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    userId = created.user.id;
  }

  // Ensure profile exists
  await admin.from("profiles").upsert(
    { id: userId, display_name: "E2E Tester", avatar_url: null },
    { onConflict: "id" },
  );

  // Clean existing test data
  await admin.from("study_bookmarks").delete().eq("user_id", userId);
  await admin.from("studies").delete().eq("owner_id", userId);

  // Look up book abbreviations for Genesis and Exodus
  const { data: booksData } = await admin
    .from("books")
    .select("id, abbr")
    .in("abbr", ["Gn", "Ex"]);

  const gnAbbr = booksData?.find((b) => b.abbr === "Gn")?.abbr ?? "Gn";
  const exAbbr = booksData?.find((b) => b.abbr === "Ex")?.abbr ?? "Ex";

  // Seed studies with different dates and books
  const studyRecords = [
    {
      owner_id: userId,
      slug: "e2e-genesis-study-1",
      title: "Estudo sobre Gênesis 1",
      verse_reference: `${gnAbbr} 1:1-3`,
      content: "Estudo E2E sobre criação.",
      model_used: "gpt-5.4",
      language: "pt",
      is_published: false,
      created_at: "2026-01-15T10:00:00Z",
    },
    {
      owner_id: userId,
      slug: "e2e-genesis-study-2",
      title: "Estudo sobre Gênesis 12",
      verse_reference: `${gnAbbr} 12:1-4`,
      content: "Estudo E2E sobre Abraão.",
      model_used: "gpt-5.4",
      language: "pt",
      is_published: false,
      created_at: "2026-02-10T10:00:00Z",
    },
    {
      owner_id: userId,
      slug: "e2e-exodus-study-1",
      title: "Estudo sobre Êxodo 3",
      verse_reference: `${exAbbr} 3:1-6`,
      content: "Estudo E2E sobre a sarça ardente.",
      model_used: "gpt-5.4",
      language: "pt",
      is_published: false,
      created_at: "2026-03-05T10:00:00Z",
    },
    {
      owner_id: userId,
      slug: "e2e-exodus-study-2",
      title: "Estudo sobre Êxodo 14",
      verse_reference: `${exAbbr} 14:21-22`,
      content: "Estudo E2E sobre travessia do Mar Vermelho.",
      model_used: "gpt-5.4",
      language: "pt",
      is_published: false,
      created_at: "2026-04-01T10:00:00Z",
    },
  ];

  const { data: inserted, error: insertError } = await admin
    .from("studies")
    .insert(studyRecords)
    .select("id, title, slug, verse_reference, created_at");

  if (insertError)
    throw new Error(`Failed to seed studies: ${insertError.message}`);

  const studies = inserted as SeededStudy[];

  // Bookmark the first Genesis study and the first Exodus study
  const bookmarkedIds = [studies[0]!.id, studies[2]!.id];
  const bookmarks = bookmarkedIds.map((studyId) => ({
    user_id: userId,
    study_id: studyId,
  }));

  const { error: bmError } = await admin
    .from("study_bookmarks")
    .insert(bookmarks);

  if (bmError)
    throw new Error(`Failed to seed bookmarks: ${bmError.message}`);

  return { userId, studies, bookmarkedIds };
}

export async function cleanupTestData(): Promise<void> {
  const admin = getAdminClient();

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users.find(
    (u) => u.email === TEST_USER_EMAIL,
  );

  if (existing) {
    await admin.from("study_bookmarks").delete().eq("user_id", existing.id);
    await admin.from("studies").delete().eq("owner_id", existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
}
