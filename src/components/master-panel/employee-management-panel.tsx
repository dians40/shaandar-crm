"use client";

import { useCallback, useState } from "react";
import EmployeeBioDataCard from "./employee-bio-data-card";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type EmployeeViewMode = "list" | "add" | "edit" | "detail";

const EMPTY_EMPLOYEES: never[] = [];

/**
 * Fully functional Employee Management workspace.
 * Includes: split first/last name form, mandatory gender, real-time search,
 * bio-data card, and attendance-based delete protection (via EmployeeList + API).
 * Do not modify this component when extending ERP navigation.
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

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  if (view === "add") {
    return (
      <EmployeeForm mode="add" onBack={handleBack} onSuccess={handleSuccess} />
    );
  }

  if (view === "edit" && selectedId) {
    return (
      <EmployeeForm
        mode="edit"
        employeeId={selectedId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return (
      <EmployeeBioDataCard
        employeeId={selectedId}
        onBack={handleBack}
        onEdit={() => setView("edit")}
      />
    );
  }

  return (
    <>
      <SupabaseSetupBanner />
      <EmployeeList
        employees={safeEmployees}
        isLoading={isLoading}
        error={error}
        onRetry={() => void reload()}
        onAddNew={() => setView("add")}
        onView={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("detail");
        }}
        onEdit={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("edit");
        }}
        onRefresh={() => void reload()}
      />
    </>
  );
}
