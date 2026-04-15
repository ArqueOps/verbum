import type { Tables } from "./database";

// --- Database-derived row types ---

export type BibleVerseRow = Tables<"bible_verses">;

// --- Domain enums & literals ---

export type Testament = "old" | "new";

export type BibleVersionCode = "nvi" | "acf" | "ara" | "naa" | "kjv" | "nlt" | "esv";

// --- Domain types ---

export interface BibleVersion {
  code: BibleVersionCode;
  name: string;
  language: string;
  description: string;
}

export interface BibleBook {
  name: string;
  abbreviation: string;
  testament: Testament;
  chapters: number;
  order: number;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  versesCount: number;
}

export interface BibleVerse {
  id: number;
  book: string;
  chapter: number;
  verseNumber: number;
  text: string;
  version: string;
}

// --- Utility / composite types ---

export interface BibleBookWithVersion extends BibleBook {
  version: BibleVersion;
}

export interface BiblePassage {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: BibleVerse[];
  version: string;
}

export interface BibleReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}
