"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDailyLimit } from "@/hooks/use-daily-limit";

export function DailyLimitBadge() {
  const { isLoading, remaining, isUnlimited, hasActiveSubscription } = useDailyLimit();
  const prev = useRef(remaining);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (prev.current !== remaining) {
      badgeRef.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.15)" },
          { transform: "scale(1)" },
        ],
        { duration: 300, easing: "ease-in-out" },
      );
      prev.current = remaining;
    }
  }, [remaining, isLoading]);

  if (isLoading) {
    return (
      <span className="inline-flex h-7 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
    );
  }

  // Unauthenticated — hide badge
  if (hasActiveSubscription === null) {
    return null;
  }

  if (isUnlimited) {
    return (
      <span
        ref={badgeRef}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.02em]",
          "bg-[#C8963E]/15 text-[#9A7228] dark:bg-[#C8963E]/20 dark:text-[#D4A843]",
        )}
        title="Assinatura ativa — estudos ilimitados"
      >
        <InfinityIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        Ilimitado
      </span>
    );
  }

  const available = remaining ?? 0;
  const color =
    available > 0
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";

  return (
    <span
      ref={badgeRef}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors",
        color,
      )}
      title={
        available > 0
          ? "Estudos disponíveis hoje no plano gratuito"
          : "Limite diário atingido. Volte amanhã ou assine para estudos ilimitados."
      }
    >
      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
      {available > 0 ? `${available} hoje` : "Limite atingido"}
    </span>
  );
}
