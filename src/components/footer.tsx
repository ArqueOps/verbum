import Link from "next/link";

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Preços" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-[#1E3A5F] dark:border-neutral-700 dark:bg-[#0F1720]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="font-display text-[25px] font-semibold tracking-[-0.02em] text-white"
            >
              Verbum
            </Link>
            <p className="max-w-[280px] text-sm text-neutral-300">
              Profundidade que ilumina. Estudo bíblico com inteligência artificial.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C8963E]">
              Navegação
            </h3>
            <nav className="flex flex-col gap-1.5" aria-label="Links do rodapé">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-neutral-300 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

        </div>

        {/* Divider + copyright */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-neutral-400">
            &copy; {year} Verbum. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
