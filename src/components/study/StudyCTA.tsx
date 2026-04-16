import Link from "next/link";

interface StudyCTAProps {
  isAuthenticated: boolean;
}

export function StudyCTA({ isAuthenticated }: StudyCTAProps) {
  const href = isAuthenticated ? "/generate" : "/login?redirect=/generate";

  return (
    <section className="rounded-lg border bg-muted/50 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        Gere seu próprio estudo
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie estudos bíblicos personalizados com inteligência artificial
      </p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Começar agora
      </Link>
    </section>
  );
}
