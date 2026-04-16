"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

interface UseCreditsReturn {
  creditsRemaining: number | null;
  isLoading: boolean;
  decrementCredits: () => void;
}

export function useCredits(): UseCreditsReturn {
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    let subscriptionCleanup: (() => void) | null = null;

    async function fetchCredits() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCreditsRemaining(null);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("study_count")
        .eq("id", user.id)
        .single();

      if (data) {
        setCreditsRemaining(data.study_count);
      }
      setIsLoading(false);

      const channel = supabase
        .channel(`profiles:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const newCount = (payload.new as { study_count: number })
              .study_count;
            setCreditsRemaining(newCount);
          },
        )
        .subscribe();

      subscriptionCleanup = () => {
        supabase.removeChannel(channel);
      };
    }

    fetchCredits();

    return () => {
      subscriptionCleanup?.();
    };
  }, []);

  const decrementCredits = useCallback(() => {
    setCreditsRemaining((prev) => (prev !== null ? prev - 1 : prev));
  }, []);

  return { creditsRemaining, isLoading, decrementCredits };
}
