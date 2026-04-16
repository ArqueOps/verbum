import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  planName: string;
  price: string;
  features: string[];
  isHighlighted?: boolean;
  ctaText: string;
  ctaHref: string;
}

export function PricingCard({
  planName,
  price,
  features,
  isHighlighted = false,
  ctaText,
  ctaHref,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
        isHighlighted
          ? "border-primary shadow-md ring-1 ring-primary"
          : "border-border",
      )}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          Mais Popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-card-foreground">{planName}</h3>

      <p className="mt-2 text-3xl font-bold tracking-tight text-card-foreground">
        {price}
      </p>

      <ul className="mt-6 flex flex-col gap-3" role="list">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          "mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
          isHighlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
      >
        {ctaText}
      </Link>
    </div>
  );
}
