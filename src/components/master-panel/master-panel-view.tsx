"use client";

import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";


type View = "list" | "add" | "edit";

export default function MasterPanelView() {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { employees, isLoading, error, reload } = useEmployees();

  const handleSuccess = () => {
    void reload();
    setView("list");
    setEditingId(null);
  };

  if (view === "add") {
    return (
      <div className="space-y-5">
        
        <EmployeeForm mode="add" onBack={() => setView("list")} onSuccess={handleSuccess} />
      </div>
    );
  }

  if (view === "edit" && editingId) {
    return (
      <div className="space-y-5">
        
        <EmployeeForm
        mode="edit"
        employeeId={editingId}
        onBack={() => {
          setView("list");
          setEditingId(null);
        }}
        onSuccess={handleSuccess}
      />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      
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
