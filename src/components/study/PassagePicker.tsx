"use client";

import { useCallback, useId, useMemo, useRef, useState, useEffect } from "react";
import { useBibleVersions } from "@/hooks/use-bible-versions";
import { useBibleBooks, type BibleBookWithId } from "@/hooks/use-bible-books";
import { useBibleChapters } from "@/hooks/use-bible-chapters";
import type { BibleReference, BibleVersion } from "@/types/bible";
import { cn } from "@/lib/utils";

// --- Extended reference with version for the callback ---

export interface PassageSelection extends BibleReference {
  version: string;
}

interface PassagePickerProps {
  onPassageSelect?: (selection: PassageSelection) => void;
  className?: string;
}

// --- Filterable Dropdown ---

interface FilterableDropdownProps<T> {
  label: string;
  placeholder: string;
  items: T[];
  value: T | null;
  onSelect: (item: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSearchText: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
  groupBy?: (item: T) => string;
  groupOrder?: string[];
  disabled?: boolean;
  loading?: boolean;
}

function FilterableDropdown<T>({
  label,
  placeholder,
  items,
  value,
  onSelect,
  getKey,
  getLabel,
  getSearchText,
  renderItem,
  groupBy,
  groupOrder,
  disabled,
  loading,
}: FilterableDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    if (!filter) return items;
    const lower = filter.toLowerCase();
    return items.filter((item) =>
      getSearchText(item).toLowerCase().includes(lower)
    );
  }, [items, filter, getSearchText]);

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, T[]>();
    for (const item of filtered) {
      const group = groupBy(item);
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    }
    if (groupOrder) {
      const ordered = new Map<string, T[]>();
      for (const key of groupOrder) {
        if (map.has(key)) ordered.set(key, map.get(key)!);
      }
      return ordered;
    }
    return map;
  }, [filtered, groupBy, groupOrder]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: T) {
    onSelect(item);
    setFilter("");
    setOpen(false);
  }

  const displayValue = value ? getLabel(value) : "";

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-sm leading-none font-medium select-none">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={disabled ? "—" : placeholder}
          value={open ? filter : displayValue}
          disabled={disabled || loading}
          onFocus={() => {
            setOpen(true);
            setFilter("");
          }}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!open) setOpen(true);
          }}
          className={cn(
            "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            "dark:bg-input/30"
          )}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            ...
          </span>
        )}
        {!loading && value && !open && (
          <button
            type="button"
            onClick={() => {
              onSelect(null as unknown as T);
              setFilter("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Limpar seleção"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      {open && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute top-[calc(100%+4px)] left-0 z-50 max-h-60 w-full overflow-y-auto rounded-lg border border-input bg-popover shadow-md",
            "scrollbar-thin"
          )}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </li>
          )}
          {groups
            ? Array.from(groups.entries()).map(([group, groupItems]) => (
                <li key={group}>
                  <div className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                    {group}
                  </div>
                  <ul>
                    {groupItems.map((item) => (
                      <li
                        key={getKey(item)}
                        role="option"
                        aria-selected={
                          value ? getKey(value) === getKey(item) : false
                        }
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-accent/10",
                          value && getKey(value) === getKey(item) &&
                            "bg-accent/15 font-medium"
                        )}
                      >
                        {renderItem ? renderItem(item) : getLabel(item)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            : filtered.map((item) => (
                <li
                  key={getKey(item)}
                  role="option"
                  aria-selected={
                    value ? getKey(value) === getKey(item) : false
                  }
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-accent/10",
                    value && getKey(value) === getKey(item) &&
                      "bg-accent/15 font-medium"
                  )}
                >
                  {renderItem ? renderItem(item) : getLabel(item)}
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

// --- VersionSelect ---

function VersionSelect({
  value,
  onSelect,
}: {
  value: BibleVersion | null;
  onSelect: (v: BibleVersion | null) => void;
}) {
  const { versions, loading } = useBibleVersions();

  return (
    <FilterableDropdown
      label="Versão"
      placeholder="Selecione a versão"
      items={versions}
      value={value}
      onSelect={onSelect}
      getKey={(v) => v.code}
      getLabel={(v) => `${v.name} (${v.code.toUpperCase()})`}
      getSearchText={(v) => `${v.name} ${v.code}`}
      renderItem={(v) => (
        <span>
          {v.name}{" "}
          <span className="text-muted-foreground">
            ({v.code.toUpperCase()})
          </span>
        </span>
      )}
      loading={loading}
    />
  );
}

// --- BookSelect ---

function BookSelect({
  value,
  onSelect,
}: {
  value: BibleBookWithId | null;
  onSelect: (b: BibleBookWithId | null) => void;
}) {
  const { booksByTestament, loading } = useBibleBooks();

  const allBooks = useMemo(() => {
    return [
      ...booksByTestament.old,
      ...booksByTestament.new,
    ] as BibleBookWithId[];
  }, [booksByTestament]);

  return (
    <FilterableDropdown
      label="Livro"
      placeholder="Selecione o livro"
      items={allBooks}
      value={value}
      onSelect={onSelect}
      getKey={(b) => b.id}
      getLabel={(b) => b.name}
      getSearchText={(b) => `${b.name} ${b.abbreviation}`}
      groupBy={(b) =>
        b.testament === "old" ? "Antigo Testamento" : "Novo Testamento"
      }
      groupOrder={["Antigo Testamento", "Novo Testamento"]}
      loading={loading}
    />
  );
}

// --- ChapterSelect ---

function ChapterSelect({
  bookId,
  value,
  onSelect,
}: {
  bookId: string | null;
  value: number | null;
  onSelect: (chapter: number | null) => void;
}) {
  const { chapters, loading } = useBibleChapters(bookId);

  const items = useMemo(
    () => chapters.map((n) => ({ value: n, label: String(n) })),
    [chapters]
  );

  const selected = useMemo(
    () => items.find((i) => i.value === value) ?? null,
    [items, value]
  );

  if (!bookId) return null;

  return (
    <FilterableDropdown
      label="Capítulo"
      placeholder="Selecione"
      items={items}
      value={selected}
      onSelect={(item) =>
        onSelect(item ? item.value : null)
      }
      getKey={(i) => String(i.value)}
      getLabel={(i) => i.label}
      getSearchText={(i) => i.label}
      loading={loading}
    />
  );
}

// --- VerseRangePicker ---

function VerseRangePicker({
  verseStart,
  verseEnd,
  onVerseStartChange,
  onVerseEndChange,
  disabled,
}: {
  verseStart: string;
  verseEnd: string;
  onVerseStartChange: (v: string) => void;
  onVerseEndChange: (v: string) => void;
  disabled: boolean;
}) {
  const startNum = verseStart ? parseInt(verseStart, 10) : null;
  const endNum = verseEnd ? parseInt(verseEnd, 10) : null;
  const hasError =
    startNum !== null &&
    endNum !== null &&
    !isNaN(startNum) &&
    !isNaN(endNum) &&
    endNum < startNum;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm leading-none font-medium select-none">
        Versículos <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          placeholder="Início"
          value={verseStart}
          onChange={(e) => onVerseStartChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-9 w-20 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            "dark:bg-input/30",
            hasError && "border-destructive ring-destructive/20"
          )}
          aria-invalid={hasError}
        />
        <span className="text-sm text-muted-foreground">até</span>
        <input
          type="number"
          min={1}
          placeholder="Fim"
          value={verseEnd}
          onChange={(e) => onVerseEndChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-9 w-20 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            "dark:bg-input/30",
            hasError && "border-destructive ring-destructive/20"
          )}
          aria-invalid={hasError}
        />
      </div>
      {hasError && (
        <p className="text-xs text-destructive" role="alert">
          O versículo final deve ser maior ou igual ao inicial
        </p>
      )}
    </div>
  );
}

// --- PassagePreview ---

function PassagePreview({
  book,
  chapter,
  verseStart,
  verseEnd,
  versionCode,
}: {
  book: string | null;
  chapter: number | null;
  verseStart: string;
  verseEnd: string;
  versionCode: string | null;
}) {
  if (!book || !chapter || !versionCode) return null;

  const startNum = verseStart ? parseInt(verseStart, 10) : null;
  const endNum = verseEnd ? parseInt(verseEnd, 10) : null;

  let reference = `${book} ${chapter}`;

  if (startNum && !isNaN(startNum)) {
    reference += `:${startNum}`;
    if (endNum && !isNaN(endNum) && endNum >= startNum) {
      reference += `-${endNum}`;
    }
  }

  reference += ` (${versionCode.toUpperCase()})`;

  return (
    <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Passagem selecionada
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-foreground">
        {reference}
      </p>
    </div>
  );
}

// --- Main PassagePicker ---

export function PassagePicker({ onPassageSelect, className }: PassagePickerProps) {
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion | null>(null);
  const [selectedBook, setSelectedBook] = useState<BibleBookWithId | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");

  const handleVersionChange = useCallback((v: BibleVersion | null) => {
    setSelectedVersion(v);
  }, []);

  const handleBookChange = useCallback((b: BibleBookWithId | null) => {
    setSelectedBook(b);
    setSelectedChapter(null);
    setVerseStart("");
    setVerseEnd("");
  }, []);

  const handleChapterChange = useCallback((ch: number | null) => {
    setSelectedChapter(ch);
    setVerseStart("");
    setVerseEnd("");
  }, []);

  // Fire callback when a valid selection is made
  const startNum = verseStart ? parseInt(verseStart, 10) : null;
  const endNum = verseEnd ? parseInt(verseEnd, 10) : null;
  const hasVerseError =
    startNum !== null &&
    endNum !== null &&
    !isNaN(startNum) &&
    !isNaN(endNum) &&
    endNum < startNum;

  useEffect(() => {
    if (
      !onPassageSelect ||
      !selectedVersion ||
      !selectedBook ||
      !selectedChapter ||
      hasVerseError
    ) {
      return;
    }

    const selection: PassageSelection = {
      book: selectedBook.name,
      chapter: selectedChapter,
      verseStart: startNum && !isNaN(startNum) ? startNum : 0,
      verseEnd: endNum && !isNaN(endNum) ? endNum : undefined,
      version: selectedVersion.code,
    };

    onPassageSelect(selection);
  }, [
    selectedVersion,
    selectedBook,
    selectedChapter,
    startNum,
    endNum,
    hasVerseError,
    onPassageSelect,
  ]);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Selectors row: stacks on mobile, horizontal on desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VersionSelect
          value={selectedVersion}
          onSelect={handleVersionChange}
        />
        <BookSelect
          value={selectedBook}
          onSelect={handleBookChange}
        />
        <ChapterSelect
          bookId={selectedBook?.id ?? null}
          value={selectedChapter}
          onSelect={handleChapterChange}
        />
        <VerseRangePicker
          verseStart={verseStart}
          verseEnd={verseEnd}
          onVerseStartChange={setVerseStart}
          onVerseEndChange={setVerseEnd}
          disabled={!selectedChapter}
        />
      </div>

      {/* Preview */}
      <PassagePreview
        book={selectedBook?.name ?? null}
        chapter={selectedChapter}
        verseStart={verseStart}
        verseEnd={verseEnd}
        versionCode={selectedVersion?.code ?? null}
      />
    </div>
  );
}
