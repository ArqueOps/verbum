"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { BibleVersion } from "@/types/bible";

export function useBibleVersions() {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function fetchVersions() {
      const { data, error: queryError } = await supabase
        .from("bible_versions")
        .select("abbr, name, language, description")
        .order("name");

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const mapped: BibleVersion[] = (data ?? []).map((row) => ({
        code: row.abbr as BibleVersion["code"],
        name: row.name,
        language: row.language,
        description: row.description ?? "",
      }));

      setVersions(mapped);
      setLoading(false);
    }

    fetchVersions();
  }, []);

  return { versions, loading, error };
}
