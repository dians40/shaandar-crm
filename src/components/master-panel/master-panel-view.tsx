"use client";

import { useState } from "react";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";

type View = "list" | "add";

export default function MasterPanelView() {
  const [view, setView] = useState<View>("list");

  const handleSuccess = () => {
    setView("list");
  };

  return (
    <div className="space-y-5 p-4">
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

      {view === "add" ? (
        <div className="bg-white p-6 rounded-md shadow">
          <EmployeeForm onSuccess={handleSuccess} onBack={() => setView("list")} />
          
          <button 
            onClick={() => setView("list")}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Back to List
          </button>
        </div>
      ) : (
        /* यहाँ हम एरे को explicit type 'any[]' दे रहे हैं ताकि एरर न आए और onAdd हटा दिया है */
        <EmployeeList employees={[] as any[]} />
      )}
    </div>
  );
}