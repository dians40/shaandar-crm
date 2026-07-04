"use client";

import { useCallback, useState, type ReactNode } from "react";
import EmployeeBioDataCard from "./employee-bio-data-card";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import EmployeeSubTabBar from "./employee-sub-tab-bar";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type EmployeeViewMode = "list" | "add" | "edit" | "detail";

const EMPTY_EMPLOYEES: never[] = [];

/**
 * Fully functional Employee Management workspace.
 * Includes: split first/last name form, mandatory gender, real-time search,
 * bio-data card, and attendance-based delete protection (via EmployeeList + API).
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

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const withSubTabs = (content: ReactNode) => (
    <>
      <EmployeeSubTabBar
        active={subTab}
        onList={handleListTab}
        onAdd={handleAddTab}
      />
      {content}
    </>
  );

  if (view === "add") {
    return withSubTabs(
      <EmployeeForm mode="add" onBack={handleBack} onSuccess={handleSuccess} />
    );
  }

  if (view === "edit" && selectedId) {
    return withSubTabs(
      <EmployeeForm
        mode="edit"
        employeeId={selectedId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return withSubTabs(
      <EmployeeBioDataCard
        employeeId={selectedId}
        onBack={handleBack}
        onEdit={() => setView("edit")}
      />
    );
  }

  return withSubTabs(
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
