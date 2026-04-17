import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EXPECTED_SECTIONS_PER_STUDY = 7;
const TIMESTAMP_SAMPLE_SIZE = 20;
const TIMESTAMP_TOLERANCE_MS = 1000;

interface Discrepancy {
  check: string;
  severity: "error" | "warning";
  message: string;
  documentIds?: string[];
}

interface ValidationReport {
  timestamp: string;
  firestoreCount: number;
  postgresCount: number;
  discrepancies: Discrepancy[];
  checks: {
    countComparison: "pass" | "fail";
    sectionsIntegrity: "pass" | "fail";
    userIdMappings: "pass" | "fail";
    timestampPreservation: "pass" | "fail";
  };
  summary: string;
}

function loadEnvironment(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  firebaseServiceAccount: ServiceAccount;
} {
  const supabaseUrl =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    "";
  const supabaseServiceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["CRED_SUPABASE_SERVICE_ROLE_KEY"] ??
    "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const firebaseCredPath = process.env["FIREBASE_SERVICE_ACCOUNT_PATH"];
  const firebaseCredJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

  let firebaseServiceAccount: ServiceAccount;

  if (firebaseCredJson) {
    firebaseServiceAccount = JSON.parse(firebaseCredJson) as ServiceAccount;
  } else if (firebaseCredPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    firebaseServiceAccount = require(firebaseCredPath) as ServiceAccount;
  } else {
    throw new Error(
      "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey, firebaseServiceAccount };
}

function initFirestore(serviceAccount: ServiceAccount) {
  const app = initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

function initSupabase(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getFirestoreStudies(
  firestore: FirebaseFirestore.Firestore
): Promise<Map<string, DocumentData>> {
  const snapshot = await firestore.collection("studies").get();
  const studies = new Map<string, DocumentData>();
  for (const doc of snapshot.docs) {
    studies.set(doc.id, { ...doc.data(), _id: doc.id });
  }
  return studies;
}

async function getPostgresStudyCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("studies")
    .select("*", { count: "exact", head: true })
    .eq("migrated_from_firebase", true);

  if (error) throw new Error(`Failed to count PostgreSQL studies: ${error.message}`);
  return count ?? 0;
}

async function getMigratedStudyIds(
  supabase: SupabaseClient
): Promise<string[]> {
  const allIds: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("studies")
      .select("id")
      .eq("migrated_from_firebase", true)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Failed to fetch study IDs: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      allIds.push(row.id as string);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allIds;
}

async function validateCountComparison(
  firestoreCount: number,
  postgresCount: number
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  if (firestoreCount !== postgresCount) {
    discrepancies.push({
      check: "count_comparison",
      severity: "error",
      message: `Document count mismatch: Firestore has ${firestoreCount} studies, PostgreSQL has ${postgresCount} migrated studies. Difference: ${Math.abs(firestoreCount - postgresCount)}.`,
    });
  }

  return discrepancies;
}

async function validateSectionsIntegrity(
  supabase: SupabaseClient,
  studyIds: string[]
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];
  const missingStudyIds: string[] = [];
  const wrongCountStudyIds: string[] = [];

  for (let i = 0; i < studyIds.length; i += 100) {
    const batch = studyIds.slice(i, i + 100);
    const { data, error } = await supabase
      .from("study_sections")
      .select("study_id")
      .in("study_id", batch);

    if (error) {
      discrepancies.push({
        check: "sections_integrity",
        severity: "error",
        message: `Failed to query study_sections: ${error.message}`,
      });
      continue;
    }

    const countsByStudy = new Map<string, number>();
    for (const row of data ?? []) {
      const studyId = row.study_id as string;
      countsByStudy.set(studyId, (countsByStudy.get(studyId) ?? 0) + 1);
    }

    for (const studyId of batch) {
      const sectionCount = countsByStudy.get(studyId);
      if (sectionCount === undefined) {
        missingStudyIds.push(studyId);
      } else if (sectionCount !== EXPECTED_SECTIONS_PER_STUDY) {
        wrongCountStudyIds.push(studyId);
      }
    }
  }

  if (missingStudyIds.length > 0) {
    discrepancies.push({
      check: "sections_integrity",
      severity: "error",
      message: `${missingStudyIds.length} migrated studies have NO sections in study_sections.`,
      documentIds: missingStudyIds,
    });
  }

  if (wrongCountStudyIds.length > 0) {
    discrepancies.push({
      check: "sections_integrity",
      severity: "error",
      message: `${wrongCountStudyIds.length} migrated studies do not have exactly ${EXPECTED_SECTIONS_PER_STUDY} sections.`,
      documentIds: wrongCountStudyIds,
    });
  }

  return discrepancies;
}

async function validateUserIdMappings(
  supabase: SupabaseClient
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];
  const nullUserIds: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("studies")
      .select("id")
      .eq("migrated_from_firebase", true)
      .is("owner_id", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      discrepancies.push({
        check: "user_id_mappings",
        severity: "error",
        message: `Failed to query NULL owner_id studies: ${error.message}`,
      });
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      nullUserIds.push(row.id as string);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  if (nullUserIds.length > 0) {
    discrepancies.push({
      check: "user_id_mappings",
      severity: "error",
      message: `${nullUserIds.length} migrated studies have NULL owner_id (user_id mapping failed).`,
      documentIds: nullUserIds,
    });
  }

  return discrepancies;
}

async function validateTimestampPreservation(
  supabase: SupabaseClient,
  firestoreStudies: Map<string, DocumentData>,
  studyIds: string[]
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  const sampleSize = Math.min(TIMESTAMP_SAMPLE_SIZE, studyIds.length);
  if (sampleSize === 0) return discrepancies;

  const sampleIds = studyIds
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize);

  const { data, error } = await supabase
    .from("studies")
    .select("id, created_at, updated_at")
    .in("id", sampleIds);

  if (error) {
    discrepancies.push({
      check: "timestamp_preservation",
      severity: "error",
      message: `Failed to fetch timestamps from PostgreSQL: ${error.message}`,
    });
    return discrepancies;
  }

  const mismatchedIds: string[] = [];

  for (const pgRow of data ?? []) {
    const pgId = pgRow.id as string;
    const firestoreDoc = firestoreStudies.get(pgId);

    if (!firestoreDoc) {
      mismatchedIds.push(pgId);
      continue;
    }

    const fsCreatedAt = firestoreDoc["createdAt"] ?? firestoreDoc["created_at"];
    if (!fsCreatedAt) continue;

    const fsTimestamp =
      typeof fsCreatedAt.toDate === "function"
        ? (fsCreatedAt.toDate() as Date).getTime()
        : new Date(fsCreatedAt as string).getTime();

    const pgTimestamp = new Date(pgRow.created_at as string).getTime();
    const diff = Math.abs(fsTimestamp - pgTimestamp);

    if (diff > TIMESTAMP_TOLERANCE_MS) {
      mismatchedIds.push(pgId);
    }
  }

  if (mismatchedIds.length > 0) {
    discrepancies.push({
      check: "timestamp_preservation",
      severity: "error",
      message: `${mismatchedIds.length}/${sampleSize} sampled studies have timestamp mismatches (tolerance: ${TIMESTAMP_TOLERANCE_MS}ms).`,
      documentIds: mismatchedIds,
    });
  }

  return discrepancies;
}

function generateReport(
  firestoreCount: number,
  postgresCount: number,
  discrepancies: Discrepancy[]
): ValidationReport {
  const hasCountIssue = discrepancies.some(
    (d) => d.check === "count_comparison"
  );
  const hasSectionIssue = discrepancies.some(
    (d) => d.check === "sections_integrity"
  );
  const hasUserIdIssue = discrepancies.some(
    (d) => d.check === "user_id_mappings"
  );
  const hasTimestampIssue = discrepancies.some(
    (d) => d.check === "timestamp_preservation"
  );

  const totalDiscrepancies = discrepancies.length;

  return {
    timestamp: new Date().toISOString(),
    firestoreCount,
    postgresCount,
    discrepancies,
    checks: {
      countComparison: hasCountIssue ? "fail" : "pass",
      sectionsIntegrity: hasSectionIssue ? "fail" : "pass",
      userIdMappings: hasUserIdIssue ? "fail" : "pass",
      timestampPreservation: hasTimestampIssue ? "fail" : "pass",
    },
    summary:
      totalDiscrepancies === 0
        ? "All validation checks passed. Migration data is consistent."
        : `${totalDiscrepancies} discrepancy(ies) found. Review details above.`,
  };
}

function printReport(report: ValidationReport): void {
  console.log("=".repeat(72));
  console.log("  MIGRATION VALIDATION REPORT");
  console.log("=".repeat(72));
  console.log(`  Timestamp:        ${report.timestamp}`);
  console.log(`  Firestore count:  ${report.firestoreCount}`);
  console.log(`  PostgreSQL count: ${report.postgresCount}`);
  console.log("-".repeat(72));

  console.log("\n  CHECK RESULTS:");
  console.log(
    `    Count comparison:       ${report.checks.countComparison.toUpperCase()}`
  );
  console.log(
    `    Sections integrity:     ${report.checks.sectionsIntegrity.toUpperCase()}`
  );
  console.log(
    `    User ID mappings:       ${report.checks.userIdMappings.toUpperCase()}`
  );
  console.log(
    `    Timestamp preservation: ${report.checks.timestampPreservation.toUpperCase()}`
  );

  if (report.discrepancies.length > 0) {
    console.log("\n" + "-".repeat(72));
    console.log("  DISCREPANCIES:");

    for (const d of report.discrepancies) {
      console.log(
        `\n  [${d.severity.toUpperCase()}] ${d.check}`
      );
      console.log(`    ${d.message}`);
      if (d.documentIds && d.documentIds.length > 0) {
        const displayIds = d.documentIds.slice(0, 50);
        console.log(`    Document IDs (${d.documentIds.length} total):`);
        for (const id of displayIds) {
          console.log(`      - ${id}`);
        }
        if (d.documentIds.length > 50) {
          console.log(
            `      ... and ${d.documentIds.length - 50} more`
          );
        }
      }
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(`  ${report.summary}`);
  console.log("=".repeat(72));
}

async function main(): Promise<void> {
  console.log("Starting migration validation...\n");

  const env = loadEnvironment();
  const firestore = initFirestore(env.firebaseServiceAccount);
  const supabase = initSupabase(env.supabaseUrl, env.supabaseServiceRoleKey);

  console.log("Fetching Firestore studies...");
  const firestoreStudies = await getFirestoreStudies(firestore);
  const firestoreCount = firestoreStudies.size;
  console.log(`  Found ${firestoreCount} Firestore documents.\n`);

  console.log("Counting PostgreSQL migrated studies...");
  const postgresCount = await getPostgresStudyCount(supabase);
  console.log(`  Found ${postgresCount} migrated PostgreSQL rows.\n`);

  console.log("Fetching migrated study IDs...");
  const studyIds = await getMigratedStudyIds(supabase);
  console.log(`  Retrieved ${studyIds.length} study IDs.\n`);

  const allDiscrepancies: Discrepancy[] = [];

  console.log("Running check: count comparison...");
  const countDisc = await validateCountComparison(firestoreCount, postgresCount);
  allDiscrepancies.push(...countDisc);

  console.log("Running check: sections integrity...");
  const sectionDisc = await validateSectionsIntegrity(supabase, studyIds);
  allDiscrepancies.push(...sectionDisc);

  console.log("Running check: user ID mappings...");
  const userIdDisc = await validateUserIdMappings(supabase);
  allDiscrepancies.push(...userIdDisc);

  console.log("Running check: timestamp preservation...");
  const tsDisc = await validateTimestampPreservation(
    supabase,
    firestoreStudies,
    studyIds
  );
  allDiscrepancies.push(...tsDisc);

  console.log("");

  const report = generateReport(firestoreCount, postgresCount, allDiscrepancies);
  printReport(report);

  console.log("\nJSON Report:");
  console.log(JSON.stringify(report, null, 2));

  if (allDiscrepancies.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err: unknown) => {
  console.error("Migration validation failed with error:", err);
  process.exit(1);
});
