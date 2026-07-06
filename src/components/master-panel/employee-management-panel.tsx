"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import EmployeeBioDataCard from "./employee-bio-data-card";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type EmployeeViewMode = "list" | "add" | "edit" | "detail" | "manual-attendance";

const EMPTY_EMPLOYEES: never[] = [];

/**
 * Fully functional Employee Management workspace.
 * Includes: split first/last name form, mandatory gender, real-time search,
 * bio-data card, attendance-based delete protection (via EmployeeList + API),
 * and embedded manual attendance entry for supervisors.
 */
export default function EmployeeManagementPanel() {
  const { employees, isLoading, error, reload } = useEmployees();
  const [view, setView] = useState<EmployeeViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedId(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleBack();
    void reload();
  }, [handleBack, reload]);

  const handleListTab = useCallback(() => {
    setView("list");
    setSelectedId(null);
  }, []);

  const handleAddTab = useCallback(() => {
    setView("add");
    setSelectedId(null);
  }, []);

  const handleManualAttendanceTab = useCallback(() => {
    setView("manual-attendance");
    setSelectedId(null);
  }, []);

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  const subTab: "list" | "add" =
    view === "add" ? "add" : view === "manual-attendance" ? "list" : "list";

  const withWorkspaceTabs = (content: ReactNode) => (
    <>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Employee workspace views"
      >
        <ModuleAddListTabBar
          moduleName="Employee"
          active={subTab}
          onList={handleListTab}
          onAdd={handleAddTab}
        />
        <button
          type="button"
          role="tab"
          aria-selected={view === "manual-attendance"}
          onClick={handleManualAttendanceTab}
          className={cn(
            "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
            view === "manual-attendance"
              ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
              : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
          )}
        >
          Manual Attendance
        </button>
      </div>
      {content}
    </>
  );

  if (view === "manual-attendance") {
    return withWorkspaceTabs(<ManualAttendanceEntryPanel />);
  }

  if (view === "add") {
    return withWorkspaceTabs(
      <EmployeeForm mode="add" onBack={handleBack} onSuccess={handleSuccess} />
    );
  }

  if (view === "edit" && selectedId) {
    return withWorkspaceTabs(
      <EmployeeForm
        mode="edit"
        employeeId={selectedId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return withWorkspaceTabs(
      <EmployeeBioDataCard
        employeeId={selectedId}
        onBack={handleBack}
        onEdit={() => setView("edit")}
      />
    );
  }

  return withWorkspaceTabs(
    <>
      <SupabaseSetupBanner />
      <EmployeeList
        employees={safeEmployees}
        isLoading={isLoading}
        error={error}
        onRetry={() => void reload()}
        onAddNew={handleAddTab}
        onView={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("detail");
        }}
        onEdit={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("edit");
        }}
        onRefresh={() => void reload()}
        hideHeaderAddButton
      />
    </>
  );
}
