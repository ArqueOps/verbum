/**
 * Firestore → PostgreSQL (Supabase) Migration Script
 *
 * Prerequisites:
 *   1. profiles.firebase_uid column must exist (migration 20260417130000)
 *   2. studies.migrated_from_firebase column must exist (migration 20260417130001)
 *   3. Firebase Auth migration must have run first (firebase_uid populated in profiles)
 *
 * Environment variables:
 *   FIREBASE_SERVICE_ACCOUNT_PATH — path to Firebase service account JSON
 *   FIREBASE_PROJECT_ID           — Firebase project ID
 *   SUPABASE_URL                  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — Supabase service role key
 *   DRY_RUN=true                  — log actions without writing to DB
 *   FIRESTORE_COLLECTION          — Firestore collection name (default: "studies")
 *
 * Expected Firestore document structure (collection: "studies"):
 *   {
 *     userId: string           — Firebase Auth UID of the study owner
 *     title: string            — Study title
 *     verseReference: string   — e.g. "Jo 3:16", "Gn 1:1-3"
 *     content: string          — Full markdown content of the study
 *     modelUsed: string        — AI model used (e.g. "gpt-4")
 *     language: string         — Language code (default: "pt")
 *     isPublished: boolean     — Whether the study is publicly visible
 *     publishedAt: Timestamp   — When the study was published (nullable)
 *     createdAt: Timestamp     — Original creation timestamp
 *     updatedAt: Timestamp     — Last update timestamp
 *     sections: Array<{        — Inline array of study sections
 *       sectionType: string    — One of the section_type enum values
 *       title: string          — Section heading
 *       content: string        — Section markdown content
 *       displayOrder: number   — Sort order
 *     }>
 *   }
 *
 * Run: npx tsx scripts/migrate-firestore.ts
 */

import { cert, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type Firestore,
  type Timestamp,
} from "firebase-admin/firestore";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_SECTION_TYPES = new Set([
  "context",
  "key_words",
  "cross_references",
  "theological_analysis",
  "historical_context",
  "practical_application",
  "reflection_questions",
]);

interface FirestoreStudyDoc {
  userId?: string;
  title?: string;
  verseReference?: string;
  content?: string;
  modelUsed?: string;
  language?: string;
  isPublished?: boolean;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  sections?: FirestoreSectionDoc[];
}

interface FirestoreSectionDoc {
  sectionType?: string;
  title?: string;
  content?: string;
  displayOrder?: number;
}

interface MigrationReport {
  totalDocuments: number;
  inserted: number;
  skippedAlreadyMigrated: number;
  skippedMissingOwner: number;
  skippedInvalid: number;
  sectionsInserted: number;
  errors: Array<{ docId: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Firebase setup
// ---------------------------------------------------------------------------

function initFirebase(): Firestore {
  const serviceAccountPath = requireEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });

  return getFirestore();
}

// ---------------------------------------------------------------------------
// Supabase setup
// ---------------------------------------------------------------------------

function createSupabaseAdmin(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// UID mapping: firebase_uid → supabase profile id
// ---------------------------------------------------------------------------

async function buildUidMap(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, firebase_uid")
      .not("firebase_uid", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to query profiles: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.firebase_uid) {
        map.set(row.firebase_uid as string, row.id as string);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return map;
}

// ---------------------------------------------------------------------------
// Already-migrated studies (for idempotency)
// ---------------------------------------------------------------------------

async function getAlreadyMigratedFirestoreIds(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("studies")
      .select("slug")
      .eq("migrated_from_firebase", true)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to query migrated studies: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.slug) {
        const firestoreId = extractFirestoreId(row.slug as string);
        if (firestoreId) ids.add(firestoreId);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return ids;
}

function extractFirestoreId(slug: string): string | null {
  const match = slug.match(/-fs-([a-zA-Z0-9]+)$/);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function generateSlug(title: string, firestoreDocId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${base}-fs-${firestoreDocId}`;
}

// ---------------------------------------------------------------------------
// Timestamp conversion
// ---------------------------------------------------------------------------

function toIsoString(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") {
    return ts.toDate().toISOString();
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  // Firestore REST format: { _seconds, _nanoseconds }
  const raw = ts as unknown as { _seconds?: number; seconds?: number };
  const seconds = raw._seconds ?? raw.seconds;
  if (typeof seconds === "number") {
    return new Date(seconds * 1000).toISOString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateStudyDoc(
  docId: string,
  data: FirestoreStudyDoc,
): string | null {
  if (!data.userId) return `Document ${docId}: missing userId`;
  if (!data.title) return `Document ${docId}: missing title`;
  if (!data.verseReference) return `Document ${docId}: missing verseReference`;
  if (!data.content) return `Document ${docId}: missing content`;
  return null;
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  console.log("=== Firestore → PostgreSQL Study Migration ===\n");

  const isDryRun = process.env.DRY_RUN === "true";
  if (isDryRun) {
    console.log("[DRY RUN MODE] No data will be written.\n");
  }

  const collectionName = process.env.FIRESTORE_COLLECTION ?? "studies";

  console.log("Initializing Firebase Admin SDK...");
  const firestore = initFirebase();

  console.log("Initializing Supabase Admin client...");
  const supabase = createSupabaseAdmin();

  console.log("Building Firebase UID → Supabase UUID mapping...");
  const uidMap = await buildUidMap(supabase);
  console.log(`  Found ${uidMap.size} mapped profiles.\n`);

  if (uidMap.size === 0) {
    console.error(
      "ERROR: No profiles with firebase_uid found. " +
        "Run the Firebase Auth migration first.",
    );
    process.exit(1);
  }

  console.log("Loading already-migrated Firestore document IDs...");
  const alreadyMigrated = await getAlreadyMigratedFirestoreIds(supabase);
  console.log(`  Found ${alreadyMigrated.size} already-migrated studies.\n`);

  console.log(`Reading Firestore collection: "${collectionName}"...`);
  const snapshot = await firestore.collection(collectionName).get();
  console.log(`  Found ${snapshot.size} documents.\n`);

  const report: MigrationReport = {
    totalDocuments: snapshot.size,
    inserted: 0,
    skippedAlreadyMigrated: 0,
    skippedMissingOwner: 0,
    skippedInvalid: 0,
    sectionsInserted: 0,
    errors: [],
  };

  console.log("Processing documents...\n");

  for (const doc of snapshot.docs) {
    const docId = doc.id;
    const data = doc.data() as FirestoreStudyDoc;

    // Idempotency: skip if already migrated
    if (alreadyMigrated.has(docId)) {
      console.log(`  [SKIP] Already migrated: ${docId}`);
      report.skippedAlreadyMigrated++;
      continue;
    }

    // Validate required fields
    const validationError = validateStudyDoc(docId, data);
    if (validationError) {
      console.log(`  [SKIP] Invalid: ${validationError}`);
      report.skippedInvalid++;
      continue;
    }

    // Map Firebase UID → Supabase owner_id
    const ownerId = uidMap.get(data.userId!);
    if (!ownerId) {
      console.log(
        `  [SKIP] No Supabase profile for Firebase UID: ${data.userId} (doc: ${docId})`,
      );
      report.skippedMissingOwner++;
      continue;
    }

    const slug = generateSlug(data.title!, docId);
    const createdAt = toIsoString(data.createdAt) ?? new Date().toISOString();
    const updatedAt = toIsoString(data.updatedAt) ?? createdAt;
    const publishedAt = data.isPublished ? toIsoString(data.publishedAt) : null;

    if (isDryRun) {
      console.log(
        `  [DRY RUN] Would insert study: "${data.title}" (${docId}) → owner ${ownerId}`,
      );
      report.inserted++;
      const sectionCount = Array.isArray(data.sections)
        ? data.sections.length
        : 0;
      report.sectionsInserted += sectionCount;
      continue;
    }

    try {
      // Insert study with ON CONFLICT on slug for extra idempotency safety
      const { data: insertedStudy, error: studyError } = await supabase
        .from("studies")
        .upsert(
          {
            owner_id: ownerId,
            slug,
            title: data.title!,
            verse_reference: data.verseReference!,
            content: data.content!,
            model_used: data.modelUsed ?? "unknown",
            language: data.language ?? "pt",
            is_published: data.isPublished ?? false,
            published_at: publishedAt,
            migrated_from_firebase: true,
            created_at: createdAt,
            updated_at: updatedAt,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();

      if (studyError) {
        throw new Error(`Study insert failed: ${studyError.message}`);
      }

      const studyId = insertedStudy.id as string;
      report.inserted++;

      // Insert sections
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        const validSections = data.sections
          .filter((s) => {
            if (!s.sectionType || !VALID_SECTION_TYPES.has(s.sectionType)) {
              console.warn(
                `  [WARN] Skipping invalid section type "${s.sectionType}" in doc ${docId}`,
              );
              return false;
            }
            return s.title && s.content;
          })
          .map((s, idx) => ({
            study_id: studyId,
            section_type: s.sectionType!,
            title: s.title!,
            content: s.content!,
            display_order: s.displayOrder ?? idx,
            created_at: createdAt,
          }));

        if (validSections.length > 0) {
          // Delete existing sections for this study before inserting (idempotent re-run)
          await supabase
            .from("study_sections")
            .delete()
            .eq("study_id", studyId);

          const { error: sectionsError } = await supabase
            .from("study_sections")
            .insert(validSections);

          if (sectionsError) {
            throw new Error(
              `Sections insert failed: ${sectionsError.message}`,
            );
          }

          report.sectionsInserted += validSections.length;
        }
      }

      console.log(
        `  [OK] Migrated: "${data.title}" (${docId}) → ${studyId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] ${docId}: ${message}`);
      report.errors.push({ docId, message });
    }
  }

  printReport(report);

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(report: MigrationReport): void {
  console.log("\n=== MIGRATION REPORT ===\n");
  console.log(`Total Firestore documents: ${report.totalDocuments}`);
  console.log(`Studies inserted/upserted: ${report.inserted}`);
  console.log(`Sections inserted:         ${report.sectionsInserted}`);

  console.log("\n--- Skipped ---");
  console.log(`  Already migrated:   ${report.skippedAlreadyMigrated}`);
  console.log(`  Missing owner:      ${report.skippedMissingOwner}`);
  console.log(`  Invalid document:   ${report.skippedInvalid}`);
  const totalSkipped =
    report.skippedAlreadyMigrated +
    report.skippedMissingOwner +
    report.skippedInvalid;
  console.log(`  TOTAL SKIPPED:      ${totalSkipped}`);

  console.log("\n--- Errors ---");
  if (report.errors.length === 0) {
    console.log("  None");
  } else {
    for (const err of report.errors) {
      console.log(`  ${err.docId}: ${err.message}`);
    }
    console.log(`  TOTAL ERRORS: ${report.errors.length}`);
  }

  console.log("\n=== END REPORT ===");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
