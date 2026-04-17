// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  compareCount,
  checkReferentialIntegrity,
  buildDiscrepancies,
  generateReport,
  formatReport,
  getExitCode,
  validate,
  EXPECTED_SECTION_COUNT,
  SECTION_TYPES,
  type FirestoreStudy,
  type PostgresStudy,
  type PostgresSection,
} from "./validate-migration";

function makeFirestoreStudy(id: string, title?: string): FirestoreStudy {
  return {
    id,
    title: title ?? `Study ${id}`,
    verseReference: "Jo 3:16",
  };
}

function makePostgresStudy(id: string, title?: string): PostgresStudy {
  return {
    id,
    title: title ?? `Study ${id}`,
    verse_reference: "Jo 3:16",
  };
}

function makeFullSections(studyId: string): PostgresSection[] {
  return SECTION_TYPES.map((type, i) => ({
    id: `sec-${studyId}-${i}`,
    study_id: studyId,
    section_type: type,
  }));
}

function makePartialSections(
  studyId: string,
  types: string[],
): PostgresSection[] {
  return types.map((type, i) => ({
    id: `sec-${studyId}-${i}`,
    study_id: studyId,
    section_type: type,
  }));
}

describe("compareCount", () => {
  it("should detect matching counts", () => {
    const fs = [makeFirestoreStudy("a"), makeFirestoreStudy("b")];
    const pg = [makePostgresStudy("a"), makePostgresStudy("b")];

    const result = compareCount(fs, pg);

    expect(result.firestoreCount).toBe(2);
    expect(result.postgresCount).toBe(2);
    expect(result.match).toBe(true);
  });

  it("should detect mismatch when Firestore has more", () => {
    const fs = [
      makeFirestoreStudy("a"),
      makeFirestoreStudy("b"),
      makeFirestoreStudy("c"),
    ];
    const pg = [makePostgresStudy("a")];

    const result = compareCount(fs, pg);

    expect(result.firestoreCount).toBe(3);
    expect(result.postgresCount).toBe(1);
    expect(result.match).toBe(false);
  });

  it("should detect mismatch when PostgreSQL has more", () => {
    const fs = [makeFirestoreStudy("a")];
    const pg = [makePostgresStudy("a"), makePostgresStudy("b")];

    const result = compareCount(fs, pg);

    expect(result.match).toBe(false);
  });

  it("should match when both are empty", () => {
    const result = compareCount([], []);

    expect(result.firestoreCount).toBe(0);
    expect(result.postgresCount).toBe(0);
    expect(result.match).toBe(true);
  });
});

describe("checkReferentialIntegrity", () => {
  it("should return no issues when all studies have 7 sections", () => {
    const studies = [makePostgresStudy("s1"), makePostgresStudy("s2")];
    const sections = [
      ...makeFullSections("s1"),
      ...makeFullSections("s2"),
    ];

    const issues = checkReferentialIntegrity(studies, sections);

    expect(issues).toHaveLength(0);
  });

  it("should flag study with fewer than 7 sections", () => {
    const studies = [makePostgresStudy("s1")];
    const sections = makePartialSections("s1", [
      "context",
      "key_words",
      "cross_references",
    ]);

    const issues = checkReferentialIntegrity(studies, sections);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.studyId).toBe("s1");
    expect(issues[0]!.sectionCount).toBe(3);
    expect(issues[0]!.missingSections).toContain("theological_analysis");
    expect(issues[0]!.missingSections).toContain("historical_context");
    expect(issues[0]!.missingSections).toContain("practical_application");
    expect(issues[0]!.missingSections).toContain("reflection_questions");
  });

  it("should flag study with zero sections", () => {
    const studies = [makePostgresStudy("s1")];

    const issues = checkReferentialIntegrity(studies, []);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.sectionCount).toBe(0);
    expect(issues[0]!.missingSections).toHaveLength(7);
  });

  it("should flag study with extra/unknown section types", () => {
    const studies = [makePostgresStudy("s1")];
    const sections: PostgresSection[] = [
      ...makeFullSections("s1"),
      {
        id: "sec-extra",
        study_id: "s1",
        section_type: "unknown_type",
      },
    ];

    const issues = checkReferentialIntegrity(studies, sections);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.sectionCount).toBe(8);
    expect(issues[0]!.extraSections).toContain("unknown_type");
    expect(issues[0]!.missingSections).toHaveLength(0);
  });

  it("should not cross-contaminate sections between studies", () => {
    const studies = [makePostgresStudy("s1"), makePostgresStudy("s2")];
    const sections = [
      ...makeFullSections("s1"),
      ...makePartialSections("s2", ["context"]),
    ];

    const issues = checkReferentialIntegrity(studies, sections);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.studyId).toBe("s2");
  });

  it("should handle empty studies array", () => {
    const issues = checkReferentialIntegrity([], makeFullSections("orphan"));

    expect(issues).toHaveLength(0);
  });

  it("should detect duplicate section types as extra count", () => {
    const studies = [makePostgresStudy("s1")];
    const sections: PostgresSection[] = [
      ...makeFullSections("s1"),
      { id: "dup", study_id: "s1", section_type: "context" },
    ];

    const issues = checkReferentialIntegrity(studies, sections);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.sectionCount).toBe(8);
  });
});

describe("buildDiscrepancies", () => {
  it("should return empty array when everything matches", () => {
    const fs = [makeFirestoreStudy("a")];
    const pg = [makePostgresStudy("a")];
    const count = compareCount(fs, pg);

    const discrepancies = buildDiscrepancies(count, fs, pg, []);

    expect(discrepancies).toHaveLength(0);
  });

  it("should add count_mismatch discrepancy", () => {
    const fs = [makeFirestoreStudy("a"), makeFirestoreStudy("b")];
    const pg = [makePostgresStudy("a")];
    const count = compareCount(fs, pg);

    const discrepancies = buildDiscrepancies(count, fs, pg, []);

    const mismatch = discrepancies.find((d) => d.type === "count_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch!.details).toContain("Firestore: 2");
    expect(mismatch!.details).toContain("PostgreSQL: 1");
  });

  it("should add missing_study discrepancy with document ID", () => {
    const fs = [makeFirestoreStudy("missing-id", "Genesis Study")];
    const pg: PostgresStudy[] = [];
    const count = compareCount(fs, pg);

    const discrepancies = buildDiscrepancies(count, fs, pg, []);

    const missing = discrepancies.find((d) => d.type === "missing_study");
    expect(missing).toBeDefined();
    expect(missing!.documentId).toBe("missing-id");
    expect(missing!.details).toContain("Genesis Study");
  });

  it("should add integrity_violation discrepancy with mismatch details", () => {
    const fs = [makeFirestoreStudy("s1")];
    const pg = [makePostgresStudy("s1")];
    const count = compareCount(fs, pg);
    const issues = [
      {
        studyId: "s1",
        sectionCount: 3,
        missingSections: ["theological_analysis", "historical_context"],
        extraSections: [] as string[],
      },
    ];

    const discrepancies = buildDiscrepancies(count, fs, pg, issues);

    const violation = discrepancies.find(
      (d) => d.type === "integrity_violation",
    );
    expect(violation).toBeDefined();
    expect(violation!.documentId).toBe("s1");
    expect(violation!.details).toContain("Expected 7 sections, found 3");
    expect(violation!.details).toContain("theological_analysis");
    expect(violation!.details).toContain("historical_context");
  });

  it("should include extra sections in details", () => {
    const count = { firestoreCount: 1, postgresCount: 1, match: true };
    const issues = [
      {
        studyId: "s1",
        sectionCount: 8,
        missingSections: [] as string[],
        extraSections: ["unknown_type"],
      },
    ];

    const discrepancies = buildDiscrepancies(
      count,
      [makeFirestoreStudy("s1")],
      [makePostgresStudy("s1")],
      issues,
    );

    expect(discrepancies[0]!.details).toContain("Extra: unknown_type");
  });
});

describe("generateReport", () => {
  it("should mark report as clean when no discrepancies", () => {
    const count = { firestoreCount: 5, postgresCount: 5, match: true };

    const report = generateReport(count, [], []);

    expect(report.isClean).toBe(true);
    expect(report.discrepancies).toHaveLength(0);
  });

  it("should mark report as not clean when discrepancies exist", () => {
    const count = { firestoreCount: 5, postgresCount: 3, match: false };
    const discrepancies = [
      {
        type: "count_mismatch" as const,
        documentId: "N/A",
        details: "Firestore: 5, PostgreSQL: 3",
      },
    ];

    const report = generateReport(count, [], discrepancies);

    expect(report.isClean).toBe(false);
    expect(report.discrepancies).toHaveLength(1);
  });
});

describe("formatReport", () => {
  it("should include count comparison in output", () => {
    const report = validate(
      [makeFirestoreStudy("a")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    const output = formatReport(report);

    expect(output).toContain("Firestore studies: 1");
    expect(output).toContain("PostgreSQL studies: 1");
    expect(output).toContain("Match: YES");
  });

  it("should show NO for mismatched counts", () => {
    const report = validate(
      [makeFirestoreStudy("a"), makeFirestoreStudy("b")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    const output = formatReport(report);

    expect(output).toContain("Match: NO");
  });

  it("should include integrity issues with study IDs", () => {
    const report = validate(
      [makeFirestoreStudy("s1")],
      [makePostgresStudy("s1")],
      makePartialSections("s1", ["context", "key_words"]),
    );

    const output = formatReport(report);

    expect(output).toContain("Study s1: 2/7 sections");
    expect(output).toContain("Missing:");
  });

  it("should show clean result message when no issues", () => {
    const report = validate(
      [makeFirestoreStudy("a")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    const output = formatReport(report);

    expect(output).toContain("RESULT: CLEAN");
  });

  it("should show failed result with count when issues exist", () => {
    const report = validate([], [], []);
    report.discrepancies = [
      { type: "count_mismatch", documentId: "N/A", details: "test" },
    ];
    report.isClean = false;

    const output = formatReport(report);

    expect(output).toContain("RESULT: FAILED");
    expect(output).toContain("1 discrepancy");
  });

  it("should show 'None' for discrepancies section when clean", () => {
    const report = validate(
      [makeFirestoreStudy("a")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    const output = formatReport(report);

    expect(output).toContain("None");
  });

  it("should show TOTAL count in discrepancies section", () => {
    const report = validate(
      [makeFirestoreStudy("a"), makeFirestoreStudy("b")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    const output = formatReport(report);

    expect(output).toContain("TOTAL:");
  });
});

describe("getExitCode", () => {
  it("should return 0 for clean report", () => {
    const report = validate(
      [makeFirestoreStudy("a")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    expect(getExitCode(report)).toBe(0);
  });

  it("should return 1 for report with discrepancies", () => {
    const report = validate(
      [makeFirestoreStudy("a"), makeFirestoreStudy("b")],
      [makePostgresStudy("a")],
      makeFullSections("a"),
    );

    expect(getExitCode(report)).toBe(1);
  });

  it("should return 1 for integrity violations only", () => {
    const report = validate(
      [makeFirestoreStudy("a")],
      [makePostgresStudy("a")],
      [],
    );

    expect(getExitCode(report)).toBe(1);
  });
});

describe("validate (end-to-end)", () => {
  it("should produce clean report for perfectly migrated data", () => {
    const fsStudies = [makeFirestoreStudy("s1"), makeFirestoreStudy("s2")];
    const pgStudies = [makePostgresStudy("s1"), makePostgresStudy("s2")];
    const sections = [...makeFullSections("s1"), ...makeFullSections("s2")];

    const report = validate(fsStudies, pgStudies, sections);

    expect(report.isClean).toBe(true);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.integrityIssues).toHaveLength(0);
    expect(report.countComparison.match).toBe(true);
  });

  it("should detect all issue types simultaneously", () => {
    const fsStudies = [
      makeFirestoreStudy("s1"),
      makeFirestoreStudy("s2"),
      makeFirestoreStudy("s3"),
    ];
    const pgStudies = [makePostgresStudy("s1"), makePostgresStudy("s2")];
    const sections = [
      ...makeFullSections("s1"),
      ...makePartialSections("s2", ["context"]),
    ];

    const report = validate(fsStudies, pgStudies, sections);

    expect(report.isClean).toBe(false);

    const types = report.discrepancies.map((d) => d.type);
    expect(types).toContain("count_mismatch");
    expect(types).toContain("missing_study");
    expect(types).toContain("integrity_violation");
  });

  it("should handle empty Firestore collection", () => {
    const report = validate([], [], []);

    expect(report.isClean).toBe(true);
    expect(report.countComparison.firestoreCount).toBe(0);
    expect(report.countComparison.postgresCount).toBe(0);
    expect(report.countComparison.match).toBe(true);
  });

  it("should handle empty Firestore but populated PostgreSQL", () => {
    const pgStudies = [makePostgresStudy("s1")];

    const report = validate([], pgStudies, makeFullSections("s1"));

    expect(report.isClean).toBe(false);
    expect(report.countComparison.match).toBe(false);
  });

  it("should handle partial migration (some studies missing)", () => {
    const fsStudies = [
      makeFirestoreStudy("s1"),
      makeFirestoreStudy("s2"),
      makeFirestoreStudy("s3"),
    ];
    const pgStudies = [makePostgresStudy("s1")];
    const sections = makeFullSections("s1");

    const report = validate(fsStudies, pgStudies, sections);

    expect(report.isClean).toBe(false);
    const missingStudies = report.discrepancies.filter(
      (d) => d.type === "missing_study",
    );
    expect(missingStudies).toHaveLength(2);
    expect(missingStudies.map((d) => d.documentId)).toContain("s2");
    expect(missingStudies.map((d) => d.documentId)).toContain("s3");
  });

  it("should handle partial migration (studies present but sections incomplete)", () => {
    const fsStudies = [makeFirestoreStudy("s1")];
    const pgStudies = [makePostgresStudy("s1")];
    const sections = makePartialSections("s1", [
      "context",
      "key_words",
      "cross_references",
    ]);

    const report = validate(fsStudies, pgStudies, sections);

    expect(report.isClean).toBe(false);
    expect(report.countComparison.match).toBe(true);
    expect(report.integrityIssues).toHaveLength(1);
    expect(report.integrityIssues[0]!.missingSections).toHaveLength(4);
  });
});

describe("constants", () => {
  it("should expect exactly 7 sections per study", () => {
    expect(EXPECTED_SECTION_COUNT).toBe(7);
  });

  it("should define all 7 canonical section types", () => {
    expect(SECTION_TYPES).toHaveLength(7);
    expect(SECTION_TYPES).toContain("context");
    expect(SECTION_TYPES).toContain("key_words");
    expect(SECTION_TYPES).toContain("cross_references");
    expect(SECTION_TYPES).toContain("theological_analysis");
    expect(SECTION_TYPES).toContain("historical_context");
    expect(SECTION_TYPES).toContain("practical_application");
    expect(SECTION_TYPES).toContain("reflection_questions");
  });
});
