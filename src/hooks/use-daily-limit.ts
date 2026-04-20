"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

interface DailyLimitState {
  isLoading: boolean;
  hasActiveSubscription: boolean | null;
  studiesToday: number | null;
  dailyLimit: number;
}

type DailyLimitAction =
  | {
      type: "LOADED";
      hasActiveSubscription: boolean;
      studiesToday: number;
      dailyLimit: number;
    }
  | { type: "UNAUTHENTICATED" }
  | { type: "LOADING" }
  | { type: "INCREMENT_TODAY" };

const INITIAL_STATE: DailyLimitState = {
  isLoading: true,
  hasActiveSubscription: null,
  studiesToday: null,
  dailyLimit: 1,
};

function reducer(state: DailyLimitState, action: DailyLimitAction): DailyLimitState {
  switch (action.type) {
    case "LOADED":
      return {
        isLoading: false,
        hasActiveSubscription: action.hasActiveSubscription,
        studiesToday: action.studiesToday,
        dailyLimit: action.dailyLimit,
      };
    case "UNAUTHENTICATED":
      return { ...INITIAL_STATE, isLoading: false, hasActiveSubscription: null };
    case "LOADING":
      return { ...state, isLoading: true };
    case "INCREMENT_TODAY":
      if (state.studiesToday === null) return state;
      return { ...state, studiesToday: state.studiesToday + 1 };
  }
}

interface UseDailyLimitReturn {
  isLoading: boolean;
  hasActiveSubscription: boolean | null;
  studiesToday: number | null;
  dailyLimit: number;
  remaining: number | null;
  canGenerate: boolean;
  isUnlimited: boolean;
  incrementToday: () => void;
  refresh: () => Promise<void>;
}

export function useDailyLimit(): UseDailyLimitReturn {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const userIdRef = useRef<string | null>(null);

  // Lazy init — avoid running during SSR prerender.
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  if (supabaseRef.current === null && typeof window !== "undefined") {
    supabaseRef.current = createBrowserClient();
  }

  const fetchStatus = useCallback(async () => {
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

    const { data, error } = await supabase.rpc("check_user_daily_limit", {
      p_user_id: user.id,
    });

    if (error || !data) {
      dispatch({ type: "UNAUTHENTICATED" });
      return;
    }

    const payload = data as {
      has_active_subscription: boolean;
      studies_today: number;
      daily_limit: number;
    };

    dispatch({
      type: "LOADED",
      hasActiveSubscription: payload.has_active_subscription,
      studiesToday: payload.studies_today,
      dailyLimit: payload.daily_limit,
    });
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const incrementToday = useCallback(() => {
    dispatch({ type: "INCREMENT_TODAY" });
  }, []);

  const refresh = useCallback(async () => {
    dispatch({ type: "LOADING" });
    await fetchStatus();
  }, [fetchStatus]);

  const isUnlimited = state.hasActiveSubscription === true;
  const remaining =
    state.studiesToday === null
      ? null
      : isUnlimited
        ? Infinity
        : Math.max(0, state.dailyLimit - state.studiesToday);
  const canGenerate = isUnlimited || (state.studiesToday !== null && state.studiesToday < state.dailyLimit);

  return {
    isLoading: state.isLoading,
    hasActiveSubscription: state.hasActiveSubscription,
    studiesToday: state.studiesToday,
    dailyLimit: state.dailyLimit,
    remaining,
    canGenerate,
    isUnlimited,
    incrementToday,
    refresh,
  };
}
