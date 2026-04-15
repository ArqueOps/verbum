"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSyncExternalStore } from "react";

const ariaLabels = {
  light: "Alternar para modo escuro",
  dark: "Alternar para modo sistema",
  system: "Alternar para modo claro",
} as const;

const themeOrder = ["light", "dark", "system"] as const;

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        className="h-9 w-9 rounded-md border border-neutral-200 dark:border-neutral-700 animate-pulse"
        disabled
        aria-label="Carregando tema"
      />
    );
  }

  const currentIndex = themeOrder.indexOf(
    theme as (typeof themeOrder)[number]
  );
  const nextTheme =
    themeOrder[(currentIndex + 1) % themeOrder.length] ?? "system";
  const label = ariaLabels[theme as keyof typeof ariaLabels] ?? ariaLabels.system;

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      className="h-9 w-9 flex items-center justify-center rounded-md border border-neutral-200 transition-colors duration-200 hover:border-[#C8963E] hover:text-[#C8963E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] dark:border-neutral-700 dark:hover:text-[#D4A843]"
    >
      <Icon className="h-5 w-5 transition-transform duration-200" strokeWidth={1.5} />
    </button>
  );
}
