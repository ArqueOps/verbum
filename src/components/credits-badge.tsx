"use client";

import { Coins, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditsBadgeProps {
  creditsRemaining: number | null;
  isUnlimited: boolean;
  isLoading: boolean;
}

function badgeColor(credits: number, isUnlimited: boolean) {
  if (isUnlimited || credits > 2)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (credits >= 1)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

export function CreditsBadge({
  creditsRemaining,
  isUnlimited,
  isLoading,
}: CreditsBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
    );
  }

  if (isUnlimited) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
          "bg-primary/10 text-primary dark:bg-primary/20",
        )}
      >
        <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
        Assinante
      </span>
    );
  }

  const count = creditsRemaining ?? 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        badgeColor(count, false),
      )}
    >
      <Coins className="h-3.5 w-3.5" strokeWidth={1.5} />
      {count} {count === 1 ? "crédito" : "créditos"}
    </span>
  );
}
