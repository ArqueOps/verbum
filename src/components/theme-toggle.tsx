"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const themeOrder = ["light", "dark", "system"] as const;
type ThemeOption = (typeof themeOrder)[number];

const ariaLabels: Record<ThemeOption, string> = {
  light: "Alternar para modo escuro",
  dark: "Alternar para modo sistema",
  system: "Alternar para modo claro",
};

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme } = useTheme();

  const currentTheme = (theme as ThemeOption) ?? "system";

  function handleToggle() {
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex] ?? "system";
    setTheme(nextTheme);
  }

  if (!mounted) {
    return (
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-md"
        aria-label="Carregando alternador de tema"
        disabled
      >
        <span className="h-5 w-5 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </button>
    );
  }

  const Icon = currentTheme === "light" ? Sun : currentTheme === "dark" ? Moon : Monitor;

  return (
    <button
      onClick={handleToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md
        text-neutral-600 transition-colors duration-200
        hover:bg-[#C8963E]/10 hover:text-[#C8963E]
        active:bg-[#B5862F]/20 active:text-[#B5862F]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8963E]
        dark:text-neutral-400 dark:hover:text-[#D4A843]"
      aria-label={ariaLabels[currentTheme]}
      type="button"
    >
      <Icon
        className="h-5 w-5 transition-transform duration-200 ease-out"
        strokeWidth={1.75}
      />
    </button>
  );
}
