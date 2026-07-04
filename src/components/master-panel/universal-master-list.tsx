"use client";

import type { MouseEvent, ReactNode } from "react";
import ModuleListRecordLink from "./module-list-record-link";
import ModuleListSearchBar from "./module-list-search-bar";

export const MASTER_LIST_TABLE_WRAPPER_CLASS =
  "overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card";

export const MASTER_LIST_TABLE_CLASS = "min-w-full divide-y divide-corporate-border";

export const MASTER_LIST_HEAD_CLASS = "bg-corporate-bg";

export const MASTER_LIST_HEADER_CELL_CLASS =
  "px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted";

export const MASTER_LIST_HEADER_CELL_RIGHT_CLASS =
  "px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted";

export const MASTER_LIST_ROW_CLASS = "cursor-pointer hover:bg-corporate-bg/60";

export const MASTER_LIST_BODY_CELL_CLASS = "px-4 py-3 text-sm";

type ShellProps = {
  moduleName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
};

/** Unified list shell: optional header + identical real-time search bar. */
export function UniversalMasterListShell({
  moduleName,
  searchQuery,
  onSearchChange,
  title,
  subtitle,
  children,
  headerExtra,
}: ShellProps) {
  return (
    <div className="space-y-5">
      {(title || subtitle || headerExtra) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          {(title || subtitle) && (
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-corporate-text">{title}</h2>
              )}
              {subtitle && <p className="text-sm text-corporate-muted">{subtitle}</p>}
            </div>
          )}
          {headerExtra}
        </div>
      )}
      <ModuleListSearchBar
        moduleName={moduleName}
        value={searchQuery}
        onChange={onSearchChange}
      />
      {children}
    </div>
  );
}

type TableProps = {
  children: ReactNode;
  className?: string;
};

export function UniversalMasterListTable({ children, className }: TableProps) {
  return (
    <div className={className ?? MASTER_LIST_TABLE_WRAPPER_CLASS}>
      <table className={MASTER_LIST_TABLE_CLASS}>{children}</table>
    </div>
  );
}

type RowProps = {
  onEdit: () => void;
  children: ReactNode;
  className?: string;
};

/** Clickable row — opens edit workspace (name link uses the same handler). */
export function UniversalMasterListRow({ onEdit, children, className }: RowProps) {
  return (
    <tr className={className ?? MASTER_LIST_ROW_CLASS} onClick={onEdit}>
      {children}
    </tr>
  );
}

type NameCellProps = {
  name: string;
  onEdit: () => void;
  className?: string;
  suffix?: ReactNode;
};

export function UniversalMasterListNameCell({
  name,
  onEdit,
  className,
  suffix,
}: NameCellProps) {
  return (
    <td className={className ?? MASTER_LIST_BODY_CELL_CLASS}>
      <ModuleListRecordLink label={name} onOpen={onEdit} />
      {suffix}
    </td>
  );
}

type ActionsCellProps = {
  children: ReactNode;
  className?: string;
};

export function UniversalMasterListActionsCell({ children, className }: ActionsCellProps) {
  return (
    <td
      className={className ?? `${MASTER_LIST_BODY_CELL_CLASS} text-right`}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </td>
  );
}

/** Prevent row edit when interacting with inline controls inside a row. */
export function stopMasterListRowClick(event: MouseEvent) {
  event.stopPropagation();
}
