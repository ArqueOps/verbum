"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DailyLimitBadge } from "@/components/layout/DailyLimitBadge";

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "/", label: "Início" },
  { href: "/blog", label: "Blog" },
  { href: "/generate", label: "Gerar Estudo" },
  { href: "/meus-estudos", label: "Meus Estudos" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMobileMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-[#0F1720]/95">
      <div className="mx-auto flex h-24 max-w-[1200px] items-center justify-between px-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Verbum"
            width={240}
            height={240}
            className="h-16 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`text-sm font-medium transition-colors duration-150 ${
                isActive(link.href)
                  ? "text-[#1E3A5F] dark:text-white border-b-2 border-[#C8963E] pb-0.5"
                  : "text-neutral-600 hover:text-[#1E3A5F] dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <DailyLimitBadge />
          <ThemeToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <DailyLimitBadge />
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className="h-9 w-9 flex items-center justify-center rounded-md text-neutral-600 hover:text-[#1E3A5F] dark:text-neutral-400 dark:hover:text-white"
          >
            {mobileOpen ? (
              <X className="h-6 w-6" strokeWidth={1.5} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-16 z-20 bg-black/20 md:hidden" />
          <div
            ref={menuRef}
            id="mobile-menu"
            className="absolute left-0 right-0 top-16 z-30 border-b border-neutral-200 bg-white px-4 py-4 shadow-lg dark:border-neutral-700 dark:bg-[#1A2332] md:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Navegação principal">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive(link.href)
                      ? "bg-[#E8EEF4] text-[#1E3A5F] dark:bg-[#1E3A5F]/20 dark:text-white"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
