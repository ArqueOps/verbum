"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  PassagePicker,
  type PassageSelection,
} from "@/components/study/PassagePicker";

type GenerationStatus = "idle" | "connecting" | "streaming" | "saving";

const STATUS_LABELS: Record<GenerationStatus, string> = {
  idle: "",
  connecting: "Conectando ao servidor...",
  streaming: "Gerando estudo com IA...",
  saving: "Salvando estudo...",
};

export function GenerateStudyForm() {
  const router = useRouter();
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const isGenerating = status !== "idle";

  const handlePassageSelect = useCallback(
    (sel: PassageSelection) => {
      if (!isGenerating) {
        setSelection(sel);
      }
    },
    [isGenerating],
  );

  const handleGenerate = useCallback(async () => {
    if (!selection || isGenerating) return;

    if (selection.verseStart === 0) {
      toast.error("Selecione pelo menos um versículo para gerar o estudo.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("connecting");

    try {
      const response = await fetch("/api/generate-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: selection.book,
          chapter: selection.chapter,
          verse_start: selection.verseStart,
          verse_end: selection.verseEnd,
          version_id: selection.version,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error ?? "Erro ao iniciar geração do estudo.";
        toast.error(message);
        setStatus("idle");
        return;
      }

      if (!response.body) {
        toast.error("Resposta do servidor sem conteúdo.");
        setStatus("idle");
        return;
      }

      setStatus("streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (currentEvent === "done") {
              setStatus("saving");
              router.push(`/estudos/${data}`);
              return;
            }

            if (currentEvent === "error") {
              toast.error(data);
              setStatus("idle");
              return;
            }

            currentEvent = "";
          } else if (line === "") {
            currentEvent = "";
          }
        }
      }

      setStatus("idle");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Geração cancelada.");
      } else {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
      }
      setStatus("idle");
    } finally {
      abortRef.current = null;
    }
  }, [selection, isGenerating, router]);

  return (
    <div className="flex flex-col gap-6">
      <PassagePicker
        onPassageSelect={handlePassageSelect}
        className="w-full"
      />

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selection || selection.verseStart === 0 || isGenerating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isGenerating && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {isGenerating ? "Gerando..." : "Gerar Estudo"}
        </button>

        {isGenerating && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {STATUS_LABELS[status]}
          </p>
        )}
      </div>
    </div>
  );
}
