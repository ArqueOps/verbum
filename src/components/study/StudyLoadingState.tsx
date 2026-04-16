"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { StudySkeleton } from "./StudySkeleton";

const PROGRESS_MESSAGES = [
  "Analisando passagem…",
  "Consultando contexto histórico…",
  "Estudando palavras-chave…",
  "Buscando referências cruzadas…",
  "Analisando teologia…",
  "Gerando aplicação prática…",
  "Finalizando estudo…",
] as const;

const ROTATION_INTERVAL_MS = 3000;

interface StudyLoadingStateProps {
  completedSections?: string[];
  children?: React.ReactNode;
}

export function StudyLoadingState({
  completedSections = [],
  children,
}: StudyLoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);

      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
        setFading(false);
      }, 200);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p
          className={`text-sm font-medium text-muted-foreground transition-opacity duration-200 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {PROGRESS_MESSAGES[messageIndex]}
        </p>
      </div>

      <StudySkeleton completedSections={completedSections}>
        {children}
      </StudySkeleton>
    </div>
  );
}
