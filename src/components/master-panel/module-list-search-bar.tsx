"use client";

import { Search } from "lucide-react";

type Props = {
  moduleName: string;
  value: string;
  onChange: (value: string) => void;
  departmentFilter?: string;
  designationFilter?: string;
  departmentOptions?: string[];
  designationOptions?: string[];
  onDepartmentFilterChange?: (value: string) => void;
  onDesignationFilterChange?: (value: string) => void;
  showDepartmentDesignationFilters?: boolean;
};

export default function ModuleListSearchBar({
  moduleName,
  value,
  onChange,
  departmentFilter = "",
  designationFilter = "",
  departmentOptions = [],
  designationOptions = [],
  onDepartmentFilterChange,
  onDesignationFilterChange,
  showDepartmentDesignationFilters = true,
}: Props) {
  const label = `Search ${moduleName}`;
  const showExtendedFilters =
    showDepartmentDesignationFilters &&
    Boolean(onDepartmentFilterChange && onDesignationFilterChange);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="relative min-w-[220px] flex-1">
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

      {showExtendedFilters && (
        <>
          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
            Department
            <select
              value={departmentFilter}
              onChange={(event) => onDepartmentFilterChange?.(event.target.value)}
              className="input-field h-10 normal-case"
              aria-label={`Filter ${moduleName} by department`}
            >
              <option value="">All Departments</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
            Designation
            <select
              value={designationFilter}
              onChange={(event) => onDesignationFilterChange?.(event.target.value)}
              className="input-field h-10 normal-case"
              aria-label={`Filter ${moduleName} by designation`}
            >
              <option value="">All Designations</option>
              {designationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
