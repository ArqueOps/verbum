import type { Metadata } from "next";
import { TopicSearchUI } from "./topic-search-ui";

export const metadata: Metadata = {
  title: "O que a Bíblia diz sobre...? — Verbum",
  description:
    "Pergunte sobre qualquer tema e descubra o que o texto bíblico responde, com exegese ancorada nas línguas originais.",
  alternates: {
    canonical: "/perguntar",
  },
};

export default function PerguntarPage() {
  return (
    <div className="space-y-8">
      <TopicSearchUI />
    </div>
  );
}
