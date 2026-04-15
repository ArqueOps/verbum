import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verbum — Palavra para Todos",
  description: "Plataforma de estudo bíblico com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
