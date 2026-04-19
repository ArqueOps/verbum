"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

function computeCredits(creditsRemaining: number, role: UserRole): number {
  if (role === "premium" || role === "admin") {
    return Infinity;
  }
  return Math.max(0, creditsRemaining);
}

interface CreditsState {
  creditsRemaining: number | null;
  isLoading: boolean;
}

type CreditsAction =
  | { type: "LOADED"; credits: number }
  | { type: "UNAUTHENTICATED" }
  | { type: "LOADING" }
  | { type: "DECREMENT" };

function creditsReducer(state: CreditsState, action: CreditsAction): CreditsState {
  switch (action.type) {
    case "LOADED":
      return { creditsRemaining: action.credits, isLoading: false };
    case "UNAUTHENTICATED":
      return { creditsRemaining: null, isLoading: false };
    case "LOADING":
      return { ...state, isLoading: true };
    case "DECREMENT": {
      if (state.creditsRemaining === null || state.creditsRemaining === Infinity) {
        return state;
      }
      return { ...state, creditsRemaining: Math.max(0, state.creditsRemaining - 1) };
    }
  }
}

interface UseCreditsReturn {
  creditsRemaining: number | null;
  isLoading: boolean;
  isUnlimited: boolean;
  decrementCredits: () => void;
  refreshCredits: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const [state, dispatch] = useReducer(creditsReducer, {
    creditsRemaining: null,
    isLoading: true,
  });
  const userIdRef = useRef<string | null>(null);
  // Lazy init: avoid running createBrowserClient during SSR prerender where
  // NEXT_PUBLIC_SUPABASE_* env vars may be absent (Vercel preview builds).
  // The client is only constructed in the browser, on first render there.
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  if (supabaseRef.current === null && typeof window !== "undefined") {
    supabaseRef.current = createBrowserClient();
  }

  const fetchCredits = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      userIdRef.current = null;
      dispatch({ type: "UNAUTHENTICATED" });
      return;
    }

    userIdRef.current = user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_remaining, role")
      .eq("id", user.id)
      .single();

    if (profile) {
      dispatch({
        type: "LOADED",
        credits: computeCredits(profile.credits_remaining, profile.role),
      });
    } else {
      dispatch({ type: "UNAUTHENTICATED" });
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("credits-sync")
        .on<Pick<Profile, "credits_remaining" | "role">>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
          },
          (payload) => {
            if (
              userIdRef.current &&
              (payload.new as Profile).id === userIdRef.current
            ) {
              const updated = payload.new as Pick<Profile, "credits_remaining" | "role">;
              dispatch({
                type: "LOADED",
                credits: computeCredits(updated.credits_remaining, updated.role),
              });
            }
          }
        )
        .subscribe();
    } catch {
      // Realtime subscription may fail (e.g. strict-mode double-render).
      // Credits still work via REST fetch — realtime sync is best-effort.
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const decrementCredits = useCallback(() => {
    dispatch({ type: "DECREMENT" });
  }, []);

  const refreshCredits = useCallback(async () => {
    dispatch({ type: "LOADING" });
    await fetchCredits();
  }, [fetchCredits]);

  const isUnlimited = state.creditsRemaining === Infinity;

  return {
    creditsRemaining: state.creditsRemaining,
    isLoading: state.isLoading,
    isUnlimited,
    decrementCredits,
    refreshCredits,
  };
}
