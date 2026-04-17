import type { Metadata } from "next";
import { StudyModerationList } from "./study-moderation-list";

export const metadata: Metadata = {
  title: "Moderação de Estudos — Verbum",
  description: "Gerenciamento e moderação de estudos publicados.",
};

export default function AdminStudiesPage() {
  return <StudyModerationList />;
}
