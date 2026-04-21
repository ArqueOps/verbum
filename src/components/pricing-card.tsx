import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  planName: string;
  price: string;
  priceLabel?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  isHighlighted?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
}

function isInternalRoute(href: string): boolean {
  return href.startsWith("/");
}

export function PricingCard({
  planName,
  price,
  priceLabel,
  description,
  features,
  ctaText,
  ctaHref,
  onCtaClick,
  isHighlighted = false,
  isDisabled = false,
  isLoading = false,
}: PricingCardProps) {
  const ctaClasses = cn(
    "inline-flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:ring-3 focus-visible:ring-ring/50",
    isHighlighted
      ? "bg-primary text-primary-foreground hover:bg-primary/80"
      : "border border-border bg-background text-foreground hover:bg-muted",
    (isDisabled || isLoading) && "pointer-events-none opacity-50",
  );

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6 text-card-foreground",
        isHighlighted
          ? "border-primary shadow-lg shadow-primary/10"
          : "border-border",
      )}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          Mais Popular
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{planName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {price}
        </span>
        {priceLabel && (
          <span className="ml-1 text-sm text-muted-foreground">
            {priceLabel}
          </span>
        )}
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {onCtaClick ? (
        <button
          type="button"
          onClick={onCtaClick}
          disabled={isDisabled || isLoading}
          className={ctaClasses}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            ctaText
          )}
        </button>
      ) : ctaHref && isInternalRoute(ctaHref) ? (
        <Link href={ctaHref} className={ctaClasses} aria-disabled={isDisabled}>
          {ctaText}
        </Link>
      ) : ctaHref ? (
        <a
          href={ctaHref}
          className={ctaClasses}
          aria-disabled={isDisabled}
          {...(!isDisabled && { target: "_blank", rel: "noopener noreferrer" })}
        >
          {ctaText}
        </a>
      ) : null}
    </div>
  );
}
