import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://verbum.vercel.app";

export function generateMetadata(): Metadata {
  return {
    title: "Verbum — Estudo Bíblico com Inteligência Artificial",
    description:
      "Gere estudos bíblicos completos em 7 dimensões com IA: contexto histórico, estudo de palavras, teologia, referências cruzadas, comentários, aplicação prática e reflexão.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "Verbum — Estudo Bíblico com Inteligência Artificial",
      description:
        "Gere estudos bíblicos completos em 7 dimensões com IA. Profundidade teológica e clareza acessível para pastores, seminaristas e estudiosos.",
      type: "website",
      url: siteUrl,
      siteName: "Verbum",
      images: [
        {
          url: `${siteUrl}/api/og`,
          width: 1200,
          height: 630,
          alt: "Verbum — Profundidade que ilumina",
        },
      ],
    },
  };
}

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}
