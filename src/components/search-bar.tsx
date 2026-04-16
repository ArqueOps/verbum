"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  /** Current search value (controlled) */
  value?: string;
  /** Callback fired with debounced value after 300ms of inactivity */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = "Buscar estudos...",
  className,
}: SearchBarProps) {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState("");
  const displayValue = isControlled ? controlledValue : uncontrolledValue;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange?.(newValue);
      }, 300);
    },
    [onChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    emitChange(newValue);
  };

  const handleClear = () => {
    if (!isControlled) {
      setUncontrolledValue("");
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onChange?.("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        aria-label={placeholder}
      />
      {displayValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
