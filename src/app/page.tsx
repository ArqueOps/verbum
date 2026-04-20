import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { ForWhomSection } from "@/components/landing/for-whom-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SevenDimensionsSection } from "@/components/landing/seven-dimensions-section";
import { TwoPathsSection } from "@/components/landing/two-paths-section";
import { PillarsSection } from "@/components/landing/pillars-section";
import { BlogPreviewSection } from "@/components/landing/blog-preview-section";
import { PricingPreviewSection } from "@/components/landing/pricing-preview-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";

export const metadata: Metadata = {
  title: "Verbum — Profundidade que ilumina",
  description:
    "Plataforma de estudo bíblico com IA. Exegese nas línguas originais, contexto histórico, hermenêutica e escatologia para cada passagem.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Verbum — Profundidade que ilumina",
    description:
      "Estudo bíblico aprofundado com IA: sete dimensões de análise para cada passagem.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verbum — Profundidade que ilumina",
    description:
      "Estudo bíblico aprofundado com IA: sete dimensões de análise para cada passagem.",
  },
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <ForWhomSection />
      <HowItWorksSection />
      <SevenDimensionsSection />
      <TwoPathsSection />
      <PillarsSection />
      <BlogPreviewSection />
      <PricingPreviewSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
