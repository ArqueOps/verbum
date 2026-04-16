import { describe, it, expect } from "vitest";
import {
  parseStudyResponse,
  buildUserPrompt,
  studySectionSchema,
  studyResponseSchema,
  StudyParseError,
  STUDY_SECTION_TYPES,
} from "../openai";
import type { StudySection, GenerateStudyParams } from "../openai";

// --- Helpers ---

function makeValidSections(): StudySection[] {
  return STUDY_SECTION_TYPES.map((type, index) => ({
    section_type: type,
    title: `Title for ${type}`,
    content: `Content for ${type}`,
    order_index: index,
  }));
}

function makeValidJson(): string {
  return JSON.stringify(makeValidSections());
}

// --- parseStudyResponse ---

describe("parseStudyResponse", () => {
  it("should return StudySection[] for valid JSON with 7 correct sections", () => {
    // Arrange
    const json = makeValidJson();

    // Act
    const result = parseStudyResponse(json);

    // Assert
    expect(result).toHaveLength(7);
    expect(result[0]!.section_type).toBe("context");
    expect(result[6]!.section_type).toBe("reflection");
    result.forEach((section, i) => {
      expect(section.order_index).toBe(i);
      expect(section.title).toBeTruthy();
      expect(section.content).toBeTruthy();
    });
  });

  it("should handle JSON with leading/trailing whitespace", () => {
    // Arrange
    const json = `  \n${makeValidJson()}\n  `;

    // Act
    const result = parseStudyResponse(json);

    // Assert
    expect(result).toHaveLength(7);
  });

  it("should throw StudyParseError for invalid JSON string", () => {
    // Arrange
    const invalidJson = "this is not json {[}";

    // Act & Assert
    expect(() => parseStudyResponse(invalidJson)).toThrow(StudyParseError);
    expect(() => parseStudyResponse(invalidJson)).toThrow(
      "Failed to parse study response as JSON",
    );
  });

  it("should preserve rawText on StudyParseError for invalid JSON", () => {
    // Arrange
    const invalidJson = "broken json";

    // Act & Assert
    try {
      parseStudyResponse(invalidJson);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(StudyParseError);
      expect((error as StudyParseError).rawText).toBe(invalidJson);
      expect((error as StudyParseError).name).toBe("StudyParseError");
    }
  });

  it("should throw StudyParseError when JSON has only 5 sections", () => {
    // Arrange
    const fiveSections = STUDY_SECTION_TYPES.slice(0, 5).map((type, i) => ({
      section_type: type,
      title: `Title ${type}`,
      content: `Content ${type}`,
      order_index: i,
    }));
    const json = JSON.stringify(fiveSections);

    // Act & Assert
    expect(() => parseStudyResponse(json)).toThrow(StudyParseError);
    expect(() => parseStudyResponse(json)).toThrow(
      "Study response validation failed",
    );
  });

  it("should throw StudyParseError when 7 sections have wrong section_type", () => {
    // Arrange
    const wrongTypes = makeValidSections().map((s, i) => ({
      ...s,
      section_type: `wrong_type_${i}`,
    }));
    const json = JSON.stringify(wrongTypes);

    // Act & Assert
    expect(() => parseStudyResponse(json)).toThrow(StudyParseError);
    expect(() => parseStudyResponse(json)).toThrow(
      "Study response validation failed",
    );
  });

  it("should throw StudyParseError when sections have duplicate types", () => {
    // Arrange
    const sections = makeValidSections();
    sections[6] = { ...sections[0]!, order_index: 6 }; // duplicate "context"
    const json = JSON.stringify(sections);

    // Act & Assert
    expect(() => parseStudyResponse(json)).toThrow(StudyParseError);
  });

  it("should throw StudyParseError when order_index is not sequential", () => {
    // Arrange
    const sections = makeValidSections();
    sections[3] = { ...sections[3]!, order_index: 5 }; // skip index 3, duplicate 5
    const json = JSON.stringify(sections);

    // Act & Assert
    expect(() => parseStudyResponse(json)).toThrow(StudyParseError);
  });

  it("should throw StudyParseError for empty string", () => {
    expect(() => parseStudyResponse("")).toThrow(StudyParseError);
  });

  it("should throw StudyParseError for valid JSON but wrong structure (object instead of array)", () => {
    // Arrange
    const json = JSON.stringify({ sections: makeValidSections() });

    // Act & Assert
    expect(() => parseStudyResponse(json)).toThrow(StudyParseError);
  });
});

// --- buildUserPrompt ---

describe("buildUserPrompt", () => {
  const baseParams: GenerateStudyParams = {
    book: "Genesis",
    chapter: 1,
    verseStart: 1,
    versionId: "nvi",
  };

  it("should include passage text when provided", () => {
    // Arrange
    const params: GenerateStudyParams = {
      ...baseParams,
      passageText: "No principio Deus criou os ceus e a terra.",
    };

    // Act
    const prompt = buildUserPrompt(params);

    // Assert
    expect(prompt).toContain("Texto da passagem:");
    expect(prompt).toContain(
      "No principio Deus criou os ceus e a terra.",
    );
    expect(prompt).toContain("Genesis 1:1");
    expect(prompt).toContain("nvi");
  });

  it("should work without passage text (fallback)", () => {
    // Arrange
    const params: GenerateStudyParams = { ...baseParams };

    // Act
    const prompt = buildUserPrompt(params);

    // Assert
    expect(prompt).not.toContain("Texto da passagem:");
    expect(prompt).toContain("Genesis 1:1");
    expect(prompt).toContain("nvi");
    expect(prompt).toContain("7 secoes do estudo");
  });

  it("should format verse range when verseEnd is provided", () => {
    // Arrange
    const params: GenerateStudyParams = {
      ...baseParams,
      verseEnd: 5,
    };

    // Act
    const prompt = buildUserPrompt(params);

    // Assert
    expect(prompt).toContain("Genesis 1:1-5");
  });

  it("should format single verse when verseEnd is not provided", () => {
    // Act
    const prompt = buildUserPrompt(baseParams);

    // Assert
    expect(prompt).toContain("Genesis 1:1");
    expect(prompt).not.toContain("Genesis 1:1-");
  });

  it("should include versionId in the prompt", () => {
    // Arrange
    const params: GenerateStudyParams = {
      ...baseParams,
      versionId: "ara",
    };

    // Act
    const prompt = buildUserPrompt(params);

    // Assert
    expect(prompt).toContain("versao: ara");
  });
});

// --- Zod Schemas ---

describe("studySectionSchema", () => {
  it("should validate a correct study section", () => {
    // Arrange
    const section = {
      section_type: "context",
      title: "Contexto Historico",
      content: "O livro de Genesis...",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject section with missing title", () => {
    // Arrange
    const section = {
      section_type: "context",
      content: "Content here",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject section with missing content", () => {
    // Arrange
    const section = {
      section_type: "context",
      title: "Title",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject section with empty title", () => {
    // Arrange
    const section = {
      section_type: "context",
      title: "",
      content: "Content",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject section with empty content", () => {
    // Arrange
    const section = {
      section_type: "context",
      title: "Title",
      content: "",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject section with invalid section_type", () => {
    // Arrange
    const section = {
      section_type: "invalid_type",
      title: "Title",
      content: "Content",
      order_index: 0,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject section with order_index out of range", () => {
    // Arrange
    const sectionTooHigh = {
      section_type: "context",
      title: "Title",
      content: "Content",
      order_index: 7,
    };
    const sectionNegative = {
      section_type: "context",
      title: "Title",
      content: "Content",
      order_index: -1,
    };

    // Act & Assert
    expect(studySectionSchema.safeParse(sectionTooHigh).success).toBe(false);
    expect(studySectionSchema.safeParse(sectionNegative).success).toBe(false);
  });

  it("should reject section with non-integer order_index", () => {
    // Arrange
    const section = {
      section_type: "context",
      title: "Title",
      content: "Content",
      order_index: 1.5,
    };

    // Act
    const result = studySectionSchema.safeParse(section);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("studyResponseSchema", () => {
  it("should validate a correct array of 7 sections", () => {
    // Arrange
    const sections = makeValidSections();

    // Act
    const result = studyResponseSchema.safeParse(sections);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject when not all section_types are present", () => {
    // Arrange — 7 sections but with duplicate "context" instead of "reflection"
    const sections = makeValidSections();
    sections[6] = {
      section_type: "context",
      title: "Duplicate",
      content: "Duplicate",
      order_index: 6,
    };

    // Act
    const result = studyResponseSchema.safeParse(sections);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject when order_index is not sequential 0-6", () => {
    // Arrange
    const sections = makeValidSections();
    sections[0] = { ...sections[0]!, order_index: 1 };
    sections[1] = { ...sections[1]!, order_index: 0 };
    // Now indexes are: 1,0,2,3,4,5,6 — after sorting: 0,1,2,3,4,5,6 which is sequential
    // Actually let me make a truly non-sequential case
    const badSections = makeValidSections();
    badSections[3] = { ...badSections[3]!, order_index: 4 };
    badSections[4] = { ...badSections[4]!, order_index: 4 }; // duplicate index

    // Act
    const result = studyResponseSchema.safeParse(badSections);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject fewer than 7 sections", () => {
    // Arrange
    const sections = makeValidSections().slice(0, 5);

    // Act
    const result = studyResponseSchema.safeParse(sections);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject more than 7 sections", () => {
    // Arrange
    const sections = [
      ...makeValidSections(),
      {
        section_type: "context" as const,
        title: "Extra",
        content: "Extra",
        order_index: 0,
      },
    ];

    // Act
    const result = studyResponseSchema.safeParse(sections);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject non-array input", () => {
    // Act
    const result = studyResponseSchema.safeParse("not an array");

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject empty array", () => {
    // Act
    const result = studyResponseSchema.safeParse([]);

    // Assert
    expect(result.success).toBe(false);
  });
});

// --- StudyParseError ---

describe("StudyParseError", () => {
  it("should have correct name and properties", () => {
    // Arrange & Act
    const error = new StudyParseError("test message", "raw text");

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StudyParseError);
    expect(error.name).toBe("StudyParseError");
    expect(error.message).toBe("test message");
    expect(error.rawText).toBe("raw text");
  });
});

// --- STUDY_SECTION_TYPES ---

describe("STUDY_SECTION_TYPES", () => {
  it("should contain exactly 7 section types", () => {
    expect(STUDY_SECTION_TYPES).toHaveLength(7);
  });

  it("should contain all expected types", () => {
    const expected = [
      "context",
      "word_study",
      "theology",
      "cross_references",
      "commentaries",
      "application",
      "reflection",
    ];
    expect([...STUDY_SECTION_TYPES]).toEqual(expected);
  });
});
