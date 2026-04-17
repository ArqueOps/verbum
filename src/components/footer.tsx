import Link from "next/link";

interface FooterLink {
  href: string;
  label: string;
}

const navigationLinks: FooterLink[] = [
  { href: "/", label: "Início" },
  { href: "/estudos", label: "Estudos" },
  { href: "/planos", label: "Planos de Leitura" },
  { href: "/blog", label: "Blog" },
  { href: "/precos", label: "Preços" },
];

const legalLinks: FooterLink[] = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Privacidade" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-[#0F1720]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="font-display text-xl font-semibold tracking-[-0.02em] text-[#1E3A5F] dark:text-white">
              Verbum
            </span>
            <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
              Profundidade que ilumina
            </p>
          </div>

          <nav aria-label="Links do rodapé" className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Navegação
            </h3>
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-600 hover:text-[#1E3A5F] dark:text-neutral-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Links legais" className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Legal
            </h3>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-600 hover:text-[#1E3A5F] dark:text-neutral-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
            &copy; {currentYear} Verbum. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
