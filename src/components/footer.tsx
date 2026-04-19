import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/sobre", label: "Sobre" },
  { href: "/precos", label: "Preços" },
  { href: "/contato", label: "Contato" },
];

const legalLinks = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política de Privacidade" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-[#1E3A5F] dark:border-neutral-700 dark:bg-[#0F1720]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Verbum"
                width={120}
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
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

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C8963E]">
              Legal
            </h3>
            <nav className="flex flex-col gap-1.5" aria-label="Links legais">
              {legalLinks.map((link) => (
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
