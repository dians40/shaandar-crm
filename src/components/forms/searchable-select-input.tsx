"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  id?: string;
};

export default function SearchableSelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "Search and select...",
  required = false,
  disabled = false,
  hint,
  id,
}: Props) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const displayValue = query || selected?.label || "";

  const filteredOptions = useMemo(() => {
    const token = (query || selected?.label || "").trim().toLowerCase();
    if (!token) return options.slice(0, 50);
    return options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(token) ||
          option.value.toLowerCase().includes(token)
      )
      .slice(0, 50);
  }, [options, query, selected?.label]);

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-corporate-text">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        id={id}
        list={id ? `${id}-options` : undefined}
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          const exact = options.find(
            (option) => option.label.toLowerCase() === nextQuery.trim().toLowerCase()
          );
          if (exact) {
            onChange(exact.value);
            setQuery("");
          } else if (!nextQuery.trim()) {
            onChange("");
          }
        }}
        onBlur={() => {
          const exact = options.find(
            (option) =>
              option.label.toLowerCase() === displayValue.trim().toLowerCase() ||
              option.value === value
          );
          if (exact) {
            onChange(exact.value);
          }
          setQuery("");
        }}
        className={cn(
          "input-field",
          disabled && "cursor-not-allowed opacity-60"
        )}
      />
      {id && (
        <datalist id={`${id}-options`}>
          {filteredOptions.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      )}
      {!id && filteredOptions.length > 0 && displayValue.trim() && !selected && (
        <ul className="max-h-40 overflow-auto rounded-lg border border-corporate-border bg-white shadow-sm">
          {filteredOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-corporate-bg"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery("");
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <span className="text-xs font-normal text-corporate-muted">{hint}</span>}
    </label>
  );
}
