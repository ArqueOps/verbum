export const EXPECTED_SECTION_COUNT = 7;

export const SECTION_TYPES = [
  "context",
  "key_words",
  "cross_references",
  "theological_analysis",
  "historical_context",
  "practical_application",
  "reflection_questions",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface FirestoreStudy {
  id: string;
  title: string;
  verseReference: string;
}

export interface PostgresStudy {
  id: string;
  title: string;
  verse_reference: string;
}

export interface PostgresSection {
  id: string;
  study_id: string;
  section_type: string;
}

export interface CountComparison {
  firestoreCount: number;
  postgresCount: number;
  match: boolean;
}

export interface IntegrityIssue {
  studyId: string;
  sectionCount: number;
  missingSections: string[];
  extraSections: string[];
}

export interface Discrepancy {
  type: "count_mismatch" | "missing_study" | "integrity_violation";
  documentId: string;
  details: string;
}

export interface ValidationReport {
  countComparison: CountComparison;
  integrityIssues: IntegrityIssue[];
  discrepancies: Discrepancy[];
  isClean: boolean;
}

export function compareCount(
  firestoreStudies: FirestoreStudy[],
  postgresStudies: PostgresStudy[],
): CountComparison {
  return {
    firestoreCount: firestoreStudies.length,
    postgresCount: postgresStudies.length,
    match: firestoreStudies.length === postgresStudies.length,
  };
}

export function checkReferentialIntegrity(
  studies: PostgresStudy[],
  sections: PostgresSection[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const study of studies) {
    const studySections = sections.filter((s) => s.study_id === study.id);
    const sectionTypes = studySections.map((s) => s.section_type);

    const missingSections = SECTION_TYPES.filter(
      (t) => !sectionTypes.includes(t),
    );
    const extraSections = sectionTypes.filter(
      (t) => !(SECTION_TYPES as readonly string[]).includes(t),
    );

    if (
      studySections.length !== EXPECTED_SECTION_COUNT ||
      missingSections.length > 0 ||
      extraSections.length > 0
    ) {
      issues.push({
        studyId: study.id,
        sectionCount: studySections.length,
        missingSections,
        extraSections,
      });
    }
  }

  return issues;
}

export function buildDiscrepancies(
  countComparison: CountComparison,
  firestoreStudies: FirestoreStudy[],
  postgresStudies: PostgresStudy[],
  integrityIssues: IntegrityIssue[],
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  if (!countComparison.match) {
    discrepancies.push({
      type: "count_mismatch",
      documentId: "N/A",
      details: `Firestore: ${countComparison.firestoreCount}, PostgreSQL: ${countComparison.postgresCount}`,
    });
  }

  const postgresIds = new Set(postgresStudies.map((s) => s.id));
  for (const fsStudy of firestoreStudies) {
    if (!postgresIds.has(fsStudy.id)) {
      discrepancies.push({
        type: "missing_study",
        documentId: fsStudy.id,
        details: `Study "${fsStudy.title}" (${fsStudy.verseReference}) not found in PostgreSQL`,
      });
    }
  }

  for (const issue of integrityIssues) {
    const parts: string[] = [
      `Expected ${EXPECTED_SECTION_COUNT} sections, found ${issue.sectionCount}`,
    ];
    if (issue.missingSections.length > 0) {
      parts.push(`Missing: ${issue.missingSections.join(", ")}`);
    }
    if (issue.extraSections.length > 0) {
      parts.push(`Extra: ${issue.extraSections.join(", ")}`);
    }
    discrepancies.push({
      type: "integrity_violation",
      documentId: issue.studyId,
      details: parts.join(". "),
    });
  }

  return discrepancies;
}

export function generateReport(
  countComparison: CountComparison,
  integrityIssues: IntegrityIssue[],
  discrepancies: Discrepancy[],
): ValidationReport {
  return {
    countComparison,
    integrityIssues,
    discrepancies,
    isClean: discrepancies.length === 0,
  };
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push("=== MIGRATION VALIDATION REPORT ===");
  lines.push("");
  lines.push("--- Count Comparison ---");
  lines.push(`  Firestore studies: ${report.countComparison.firestoreCount}`);
  lines.push(`  PostgreSQL studies: ${report.countComparison.postgresCount}`);
  lines.push(`  Match: ${report.countComparison.match ? "YES" : "NO"}`);

  lines.push("");
  lines.push("--- Referential Integrity ---");
  if (report.integrityIssues.length === 0) {
    lines.push("  All studies have 7 valid sections.");
  } else {
    for (const issue of report.integrityIssues) {
      lines.push(`  Study ${issue.studyId}: ${issue.sectionCount}/7 sections`);
      if (issue.missingSections.length > 0) {
        lines.push(`    Missing: ${issue.missingSections.join(", ")}`);
      }
      if (issue.extraSections.length > 0) {
        lines.push(`    Extra: ${issue.extraSections.join(", ")}`);
      }
    }
  }

  lines.push("");
  lines.push("--- Discrepancies ---");
  if (report.discrepancies.length === 0) {
    lines.push("  None");
  } else {
    for (const d of report.discrepancies) {
      lines.push(`  [${d.type}] ${d.documentId}: ${d.details}`);
    }
    lines.push(`  TOTAL: ${report.discrepancies.length}`);
  }

  lines.push("");
  lines.push(
    report.isClean
      ? "RESULT: CLEAN — Migration validated successfully."
      : `RESULT: FAILED — ${report.discrepancies.length} discrepancy(ies) found.`,
  );
  lines.push("=== END REPORT ===");

  return lines.join("\n");
}

export function getExitCode(report: ValidationReport): number {
  return report.isClean ? 0 : 1;
}

export function validate(
  firestoreStudies: FirestoreStudy[],
  postgresStudies: PostgresStudy[],
  postgresSections: PostgresSection[],
): ValidationReport {
  const countComparison = compareCount(firestoreStudies, postgresStudies);
  const integrityIssues = checkReferentialIntegrity(
    postgresStudies,
    postgresSections,
  );
  const discrepancies = buildDiscrepancies(
    countComparison,
    firestoreStudies,
    postgresStudies,
    integrityIssues,
  );
  return generateReport(countComparison, integrityIssues, discrepancies);
}
