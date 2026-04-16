"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function StudyCTA() {
  const [href, setHref] = useState("/login?redirect=/generate");

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHref("/generate");
      }
    });
  }, []);

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center md:p-8">
      <BookOpen className="mx-auto mb-3 size-8 text-primary" />
      <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">
        Gere seu próprio estudo bíblico
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Escolha uma passagem e receba um estudo completo gerado por inteligência
        artificial em segundos.
      </p>
      <Button
        className="mt-4"
        size="lg"
        render={<a href={href} />}
      >
        Gerar meu estudo
      </Button>
    </section>
  );
}
