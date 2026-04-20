import Image from "next/image";
import { cn } from "@/lib/utils";

interface PaidFeatureIconProps {
  /** true = user has active subscription (feature already unlocked). false = free user (shows highlighted). */
  unlocked?: boolean;
  /** Optional tooltip. */
  title?: string;
  size?: number;
  className?: string;
}

/**
 * Verbum symbol used as "paid feature" indicator (Canva-style).
 * - Free user (unlocked=false): gold, highlighted — signals a paid feature.
 * - Premium user (unlocked=true): dimmed — signals already available.
 * Fonte: verbum-features-completo.md item 6b/11.
 */
export function PaidFeatureIcon({
  unlocked = false,
  title = unlocked
    ? "Recurso premium — já disponível para você"
    : "Recurso premium — assine para desbloquear",
  size = 18,
  className,
}: PaidFeatureIconProps) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center justify-center align-middle",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={unlocked ? "/logo.png" : "/logo-gold.png"}
        alt=""
        width={size * 2}
        height={size * 2}
        className={cn(
          "h-full w-full object-contain",
          unlocked && "opacity-40 grayscale",
        )}
        aria-hidden="true"
      />
    </span>
  );
}
