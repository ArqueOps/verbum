"use client";

import { StudySectionCard } from "./StudySectionCard";

interface Section {
  id: string;
  title: string;
  content: string;
  position: number;
}

interface StudySectionsProps {
  sections: Section[];
  defaultAllOpen?: boolean;
}

export function StudySections({ sections, defaultAllOpen }: StudySectionsProps) {
  const sorted = [...sections].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((section, index) => (
        <StudySectionCard
          key={section.id}
          title={section.title}
          content={section.content}
          defaultOpen={defaultAllOpen || index === 0}
        />
      ))}
    </div>
  );
}
