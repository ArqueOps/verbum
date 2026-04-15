"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/estudos", label: "Estudos" },
  { href: "/planos", label: "Planos de Leitura" },
  { href: "/biblioteca", label: "Minha Biblioteca" },
] as const;

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    document.body.style.overflow = "hidden";

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMobileMenu();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <header
      className="sticky top-0 w-full border-b"
      style={{
        backgroundColor: "var(--header-bg)",
        borderColor: "var(--header-border)",
        zIndex: 30,
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-8">
        <Link
          href="/"
          className="font-display text-[25px] font-semibold leading-tight tracking-[-0.02em]"
          style={{ color: "var(--nav-link-active)" }}
          aria-label="Verbum — Página inicial"
        >
          Verbum
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActiveLink(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="relative pb-1 text-sm font-medium transition-colors duration-150"
                style={{ color: active ? "var(--nav-link-active)" : "var(--nav-link)" }}
                aria-current={active ? "page" : undefined}
              >
                {label}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 h-0.5 w-full rounded-full"
                    style={{ backgroundColor: "var(--nav-active-underline)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 md:hidden"
          style={{ color: "var(--nav-link-active)" }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 md:hidden"
            style={{ backgroundColor: "var(--mobile-overlay)", zIndex: 29 }}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            id="mobile-menu"
            className="absolute left-0 right-0 top-16 border-b px-8 py-6 md:hidden"
            style={{
              backgroundColor: "var(--mobile-menu-bg)",
              borderColor: "var(--header-border)",
              zIndex: 30,
            }}
            role="navigation"
            aria-label="Menu de navegação móvel"
          >
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map(({ href, label }) => {
                const active = isActiveLink(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-lg px-4 py-3 text-base font-medium transition-colors duration-150"
                    style={{
                      color: active ? "var(--nav-link-active)" : "var(--nav-link)",
                      backgroundColor: active ? "var(--header-border)" : "transparent",
                    }}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMobileMenu}
                  >
                    {active && (
                      <span
                        className="mr-2 inline-block h-4 w-0.5 rounded-full align-middle"
                        style={{ backgroundColor: "var(--nav-active-underline)" }}
                      />
                    )}
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
