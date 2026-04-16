"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  Clock,
  Key,
  BookOpen,
  Search,
  Globe,
  Target,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Contexto Histórico": Clock,
  "Palavras-Chave": Key,
  "Referências Cruzadas": BookOpen,
  "Análise Teológica": Search,
  "Contexto Cultural": Globe,
  "Aplicação Prática": Target,
  "Perguntas para Reflexão": HelpCircle,
};

interface StudySectionCardProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
}

export function StudySectionCard({
  title,
  content,
  defaultOpen = false,
}: StudySectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = SECTION_ICONS[title];

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
        aria-expanded={isOpen}
      >
        {Icon && (
          <Icon className="size-5 shrink-0 text-primary" />
        )}
        <span className="flex-1 text-sm font-semibold text-card-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 py-3">
            <div className="prose prose-sm max-w-none text-card-foreground prose-headings:text-card-foreground prose-strong:text-card-foreground prose-a:text-primary prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
