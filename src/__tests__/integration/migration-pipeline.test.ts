// @vitest-environment node
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  validate,
  SECTION_TYPES,
  type FirestoreStudy,
  type PostgresStudy,
  type PostgresSection,
} from "../../../scripts/validate-migration";

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

const TEST_PREFIX = `migration-integ-${Date.now()}`;

let admin: SupabaseClient;
let testUserId: string;
const createdStudyIds: string[] = [];

function makeSlug(index: number): string {
  return `${TEST_PREFIX}-study-${index}`;
}

function makeFirestoreStudy(id: string, title: string): FirestoreStudy {
  return { id, title, verseReference: "Jo 3:16" };
}

async function insertStudyWithSections(
  supabase: SupabaseClient,
  params: {
    ownerId: string;
    slug: string;
    title: string;
    migratedFromFirebase: boolean;
    sectionTypes?: readonly string[];
  },
): Promise<string> {
  const { data: study, error: studyError } = await supabase
    .from("studies")
    .upsert(
      {
        user_id: params.ownerId,
        owner_id: params.ownerId,
        slug: params.slug,
        title: params.title,
        verse_reference: "Jo 3:16",
        content: "Test migration content",
        model_used: "gpt-5.4",
        language: "pt",
        is_published: false,
        migrated_from_firebase: params.migratedFromFirebase,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (studyError) throw new Error(`Study insert failed: ${studyError.message}`);
  const studyId = study.id as string;
  createdStudyIds.push(studyId);

  const sectionTypesToInsert = params.sectionTypes ?? SECTION_TYPES;
  const sections = sectionTypesToInsert.map((type, idx) => ({
    study_id: studyId,
    section_type: type,
    title: `Section: ${type}`,
    content: `Content for ${type}`,
    display_order: idx,
  }));

  if (sections.length > 0) {
    const { error: secError } = await supabase
      .from("study_sections")
      .insert(sections);
    if (secError)
      throw new Error(`Section insert failed: ${secError.message}`);
  }

  return studyId;
}

async function fetchMigratedStudies(
  supabase: SupabaseClient,
  studyIds: string[],
): Promise<PostgresStudy[]> {
  const { data, error } = await supabase
    .from("studies")
    .select("id, title, verse_reference")
    .in("id", studyIds)
    .eq("migrated_from_firebase", true);

  if (error) throw new Error(`Fetch studies failed: ${error.message}`);
  return (data ?? []) as PostgresStudy[];
}

async function fetchSections(
  supabase: SupabaseClient,
  studyIds: string[],
): Promise<PostgresSection[]> {
  const { data, error } = await supabase
    .from("study_sections")
    .select("id, study_id, section_type")
    .in("study_id", studyIds);

  if (error) throw new Error(`Fetch sections failed: ${error.message}`);
  return (data ?? []) as PostgresSection[];
}

beforeAll(async () => {
  admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `${TEST_PREFIX}@test.verbum.app`;
  const { data: authUser, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-migration-123!",
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  testUserId = authUser.user.id;

  await admin.from("profiles").upsert({
    id: testUserId,
    email,
    display_name: "Migration Test User",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
});

afterAll(async () => {
  if (!testUserId) return;

  for (const studyId of createdStudyIds) {
    await admin.from("study_sections").delete().eq("study_id", studyId);
  }
  await admin.from("studies").delete().eq("user_id", testUserId);
  await admin.from("profiles").delete().eq("id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);
});

describe("Migration Pipeline Integration", () => {
  describe("Full migration flow: seed → migrate → validate", () => {
    const studyCount = 3;
    const migratedIds: string[] = [];

    it("should seed and migrate studies with all 7 sections", async () => {
      for (let i = 0; i < studyCount; i++) {
        const id = await insertStudyWithSections(admin, {
          ownerId: testUserId,
          slug: makeSlug(i),
          title: `Migration Study ${i}`,
          migratedFromFirebase: true,
        });
        migratedIds.push(id);
      }

      expect(migratedIds).toHaveLength(studyCount);
    });

    it("should validate zero discrepancies after migration", async () => {
      const firestoreStudies = migratedIds.map((id, i) =>
        makeFirestoreStudy(id, `Migration Study ${i}`),
      );
      const pgStudies = await fetchMigratedStudies(admin, migratedIds);
      const pgSections = await fetchSections(admin, migratedIds);

      const report = validate(firestoreStudies, pgStudies, pgSections);

      expect(report.isClean).toBe(true);
      expect(report.discrepancies).toHaveLength(0);
      expect(report.countComparison.match).toBe(true);
      expect(report.countComparison.firestoreCount).toBe(studyCount);
      expect(report.countComparison.postgresCount).toBe(studyCount);
      expect(report.integrityIssues).toHaveLength(0);
    });

    it("should confirm migrated_from_firebase=true on all records", async () => {
      const { data, error } = await admin
        .from("studies")
        .select("id, migrated_from_firebase")
        .in("id", migratedIds);

      expect(error).toBeNull();
      expect(data).toHaveLength(studyCount);

      for (const study of data!) {
        expect(study.migrated_from_firebase).toBe(true);
      }
    });
  });

  describe("Idempotency: re-running migration produces no duplicates", () => {
    const idempotencySlug = `${TEST_PREFIX}-idempotent-0`;
    let firstId: string;

    it("should insert a study on first migration run", async () => {
      firstId = await insertStudyWithSections(admin, {
        ownerId: testUserId,
        slug: idempotencySlug,
        title: "Idempotent Study",
        migratedFromFirebase: true,
      });

      expect(firstId).toBeTruthy();
    });

    it("should upsert same slug without creating duplicate on second run", async () => {
      const { data: upserted, error } = await admin
        .from("studies")
        .upsert(
          {
            user_id: testUserId,
            owner_id: testUserId,
            slug: idempotencySlug,
            title: "Idempotent Study",
            verse_reference: "Jo 3:16",
            content: "Test migration content",
            model_used: "gpt-5.4",
            language: "pt",
            is_published: false,
            migrated_from_firebase: true,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(upserted!.id).toBe(firstId);

      const { count, error: countError } = await admin
        .from("studies")
        .select("*", { count: "exact", head: true })
        .eq("slug", idempotencySlug);

      expect(countError).toBeNull();
      expect(count).toBe(1);
    });

    it("should validate cleanly after idempotent re-run", async () => {
      const firestoreStudies = [
        makeFirestoreStudy(firstId, "Idempotent Study"),
      ];
      const pgStudies = await fetchMigratedStudies(admin, [firstId]);
      const pgSections = await fetchSections(admin, [firstId]);

      const report = validate(firestoreStudies, pgStudies, pgSections);

      expect(report.isClean).toBe(true);
      expect(report.discrepancies).toHaveLength(0);
    });
  });

  describe("Validation detects intentional discrepancies", () => {
    it("should detect count mismatch when Firestore has more studies", async () => {
      const studyId = await insertStudyWithSections(admin, {
        ownerId: testUserId,
        slug: makeSlug(100),
        title: "Discrepancy Study",
        migratedFromFirebase: true,
      });

      const firestoreStudies = [
        makeFirestoreStudy(studyId, "Discrepancy Study"),
        makeFirestoreStudy("phantom-doc-1", "Missing Study"),
        makeFirestoreStudy("phantom-doc-2", "Also Missing Study"),
      ];
      const pgStudies = await fetchMigratedStudies(admin, [studyId]);
      const pgSections = await fetchSections(admin, [studyId]);

      const report = validate(firestoreStudies, pgStudies, pgSections);

      expect(report.isClean).toBe(false);
      expect(report.countComparison.match).toBe(false);
      expect(report.countComparison.firestoreCount).toBe(3);
      expect(report.countComparison.postgresCount).toBe(1);

      const missingStudies = report.discrepancies.filter(
        (d) => d.type === "missing_study",
      );
      expect(missingStudies).toHaveLength(2);
      expect(missingStudies.map((d) => d.documentId)).toContain(
        "phantom-doc-1",
      );
      expect(missingStudies.map((d) => d.documentId)).toContain(
        "phantom-doc-2",
      );
    });

    it("should detect missing sections (integrity violation)", async () => {
      const studyId = await insertStudyWithSections(admin, {
        ownerId: testUserId,
        slug: makeSlug(101),
        title: "Incomplete Sections Study",
        migratedFromFirebase: true,
        sectionTypes: ["context", "key_words", "cross_references"],
      });

      const firestoreStudies = [
        makeFirestoreStudy(studyId, "Incomplete Sections Study"),
      ];
      const pgStudies = await fetchMigratedStudies(admin, [studyId]);
      const pgSections = await fetchSections(admin, [studyId]);

      const report = validate(firestoreStudies, pgStudies, pgSections);

      expect(report.isClean).toBe(false);
      expect(report.integrityIssues).toHaveLength(1);
      expect(report.integrityIssues[0]!.sectionCount).toBe(3);
      expect(report.integrityIssues[0]!.missingSections).toContain(
        "theological_analysis",
      );
      expect(report.integrityIssues[0]!.missingSections).toContain(
        "historical_context",
      );
      expect(report.integrityIssues[0]!.missingSections).toContain(
        "practical_application",
      );
      expect(report.integrityIssues[0]!.missingSections).toContain(
        "reflection_questions",
      );

      const integrityDiscrepancies = report.discrepancies.filter(
        (d) => d.type === "integrity_violation",
      );
      expect(integrityDiscrepancies).toHaveLength(1);
    });

    it("should detect combined discrepancies (count + integrity)", async () => {
      const studyId = await insertStudyWithSections(admin, {
        ownerId: testUserId,
        slug: makeSlug(102),
        title: "Combined Issue Study",
        migratedFromFirebase: true,
        sectionTypes: ["context"],
      });

      const firestoreStudies = [
        makeFirestoreStudy(studyId, "Combined Issue Study"),
        makeFirestoreStudy("missing-doc-combined", "Ghost Study"),
      ];
      const pgStudies = await fetchMigratedStudies(admin, [studyId]);
      const pgSections = await fetchSections(admin, [studyId]);

      const report = validate(firestoreStudies, pgStudies, pgSections);

      expect(report.isClean).toBe(false);
      expect(report.countComparison.match).toBe(false);

      const countMismatch = report.discrepancies.filter(
        (d) => d.type === "count_mismatch",
      );
      const missingStudy = report.discrepancies.filter(
        (d) => d.type === "missing_study",
      );
      const integrityViolation = report.discrepancies.filter(
        (d) => d.type === "integrity_violation",
      );

      expect(countMismatch).toHaveLength(1);
      expect(missingStudy).toHaveLength(1);
      expect(integrityViolation).toHaveLength(1);
      expect(report.discrepancies.length).toBeGreaterThanOrEqual(3);
    });
  });
});
