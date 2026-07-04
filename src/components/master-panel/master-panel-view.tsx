"use client";

import { useState } from "react";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type ViewMode = "list" | "add" | "edit";

export default function MasterPanelView() {
  const { employees, isLoading, error, reload } = useEmployees();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleBack = () => {
    setView("list");
    setEditingId(null);
  };

  const handleSuccess = () => {
    handleBack();
    void reload();
  };

  if (view === "add") {
    return (
      <EmployeeForm mode="add" onBack={handleBack} onSuccess={handleSuccess} />
    );
  }

  if (view === "edit" && editingId) {
    return (
      <EmployeeForm
        mode="edit"
        employeeId={editingId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SupabaseSetupBanner />
      <EmployeeList
        employees={employees}
        isLoading={isLoading}
        error={error}
        onRetry={() => void reload()}
        onAddNew={() => setView("add")}
        onEdit={(id) => {
          setEditingId(id);
          setView("edit");
        }}
        onRefresh={() => void reload()}
      />
    </div>
  );
}
