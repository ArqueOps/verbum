"use client";

import { useEffect, useRef } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/use-credits";

function badgeColor(credits: number, isUnlimited: boolean) {
  if (isUnlimited || credits > 2) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (credits >= 1) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

export function CreditsBadge() {
  const { creditsRemaining, isLoading, isUnlimited } = useCredits();
  const prevCredits = useRef(creditsRemaining);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (prevCredits.current !== creditsRemaining) {
      badgeRef.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.15)" },
          { transform: "scale(1)" },
        ],
        { duration: 300, easing: "ease-in-out" },
      );
      prevCredits.current = creditsRemaining;
    }
  }, [creditsRemaining, isLoading]);

  if (isLoading) {
    return (
      <span className="inline-flex h-7 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
    );
  }

  const displayCount = isUnlimited ? "\u221E" : creditsRemaining;

  return (
    <span
      ref={badgeRef}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors",
        badgeColor(creditsRemaining, isUnlimited),
      )}
      title={`Créditos restantes: ${isUnlimited ? "ilimitados" : creditsRemaining}`}
    >
      <Coins className="h-3.5 w-3.5" strokeWidth={1.5} />
      {displayCount}
    </span>
  );
}
