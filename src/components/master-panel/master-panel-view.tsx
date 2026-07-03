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
        <EmployeeForm onSuccess={handleSuccess} onCancel={() => setView("list")} />
      </div>
    );
  }

  // यहाँ सुरक्षित लिस्ट पास की जा रही है ताकि undefined होने पर भी .map() क्रैश न हो
  const safeEmployeesList = Array.isArray(employees) 
    ? employees 
    : (employees && typeof employees === 'object' && 'data' in employees && Array.isArray((employees as any).data)) 
      ? (employees as any).data 
      : [];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Master Panel</h1>
        {view === "list" && (
          <button 
            onClick={() => setView("add")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Add New Employee
          </button>
        )}
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <EmployeeList 
          employees={safeEmployeesList} 
          onEdit={(id) => {
            setEditingId(id);
            setView("edit");
          }} 
        />
      )}
    </div>
  );
}