"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  clearActiveEmployeeSession,
  setActiveEmployeeSession,
} from "@/lib/master-panel-entity-bridge";
import EmployeeBioDataCard from "./employee-bio-data-card";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import BiometricAttendanceRecordsPanel from "./biometric-attendance-records-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type EmployeeWorkspaceTab = "list" | "add" | "manual-attendance" | "biometric-attendance-log";

type EmployeeViewMode = EmployeeWorkspaceTab | "edit" | "detail";

const WORKSPACE_TABS: { id: EmployeeWorkspaceTab; label: string }[] = [
  { id: "list", label: "Employee List" },
  { id: "add", label: "Add Employee" },
  { id: "manual-attendance", label: "Manual Attendance & Wages" },
  { id: "biometric-attendance-log", label: "Biometric Attendance Log" },
];

const EMPTY_EMPLOYEES: never[] = [];

/**
 * Employee Management workspace with embedded manual labor attendance entry.
 */
export default function EmployeeManagementPanel() {
  const { employees, isLoading, error, reload } = useEmployees();
  const [view, setView] = useState<EmployeeViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeTab: EmployeeWorkspaceTab =
    view === "add"
      ? "add"
      : view === "manual-attendance"
        ? "manual-attendance"
        : view === "biometric-attendance-log"
          ? "biometric-attendance-log"
          : "list";

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedId(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleBack();
    void reload();
  }, [handleBack, reload]);

  const handleTabChange = useCallback((tab: EmployeeWorkspaceTab) => {
    setView(tab);
    setSelectedId(null);
  }, []);

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  const selectedEmployeeName = useMemo(() => {
    if (!selectedId) return "";
    return safeEmployees.find((employee) => employee.id === selectedId)?.name ?? "";
  }, [safeEmployees, selectedId]);

  useEffect(() => {
    if (view === "add") {
      setActiveEmployeeSession({
        mode: "add",
        activeEmployeeName: "Drafting...",
      });
      return;
    }

    if (view === "edit" && selectedId) {
      setActiveEmployeeSession({
        mode: "edit",
        activeEmployeeName: selectedEmployeeName.trim() || "Employee",
        employeeId: selectedId,
      });
      return;
    }

    clearActiveEmployeeSession();
  }, [view, selectedId, selectedEmployeeName]);

  const withWorkspaceTabs = (content: ReactNode) => (
    <>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Employee workspace views"
      >
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content}
    </>
  );

  if (view === "manual-attendance") {
    return withWorkspaceTabs(<ManualAttendanceEntryPanel />);
  }

  if (view === "biometric-attendance-log") {
    return withWorkspaceTabs(<BiometricAttendanceRecordsPanel />);
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
        onAddNew={() => handleTabChange("add")}
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
