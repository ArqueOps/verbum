"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

const FREE_CREDITS_LIMIT = 3;

interface CreditsState {
  creditsRemaining: number;
  isLoading: boolean;
  isUnlimited: boolean;
}

export function useCredits(): CreditsState {
  const [state, setState] = useState<CreditsState>({
    creditsRemaining: 0,
    isLoading: true,
    isUnlimited: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchCredits() {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) setState({ creditsRemaining: 0, isLoading: false, isUnlimited: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, study_count")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!profile) {
        setState({ creditsRemaining: 0, isLoading: false, isUnlimited: false });
        return;
      }

      const isUnlimited = profile.role === "premium" || profile.role === "admin";
      const creditsRemaining = isUnlimited
        ? Infinity
        : Math.max(0, FREE_CREDITS_LIMIT - profile.study_count);

      setState({ creditsRemaining, isLoading: false, isUnlimited });
    }

    fetchCredits();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
