"use client";

import { Search } from "lucide-react";

type Props = {
  moduleName: string;
  value: string;
  onChange: (value: string) => void;
};

export default function ModuleListSearchBar({ moduleName, value, onChange }: Props) {
  const label = `Search ${moduleName}`;

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label}...`}
        aria-label={label}
        className="input-field w-full pl-10"
      />
    </div>
  );
}
