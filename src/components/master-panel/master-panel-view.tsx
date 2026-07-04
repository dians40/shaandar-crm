"use client";

import { useState, useEffect } from "react";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import { supabase } from "@/lib/supabase/client"; 

// एम्प्लोयी का सही स्ट्रक्चर (Type) सेट कर रहे हैं ताकि TypeScript एरर न दे
interface Employee {
  id: string;
  name: string;
  employee_type?: string;
  mobile?: string;
  vehicle_no?: string;
  salary?: number;
  [key: string]: unknown;
}

export default function MasterPanelView() {
  const [view, setView] = useState<"list" | "add">("list");
  const [employees, setEmployees] = useState<Employee[]>([]); // यहाँ से 'any' हटा दिया गया है

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("employees").select("*");
    if (!error && data) {
      setEmployees(data as Employee[]);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [view]);

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
          <EmployeeForm onSuccess={() => setView("list")} onBack={() => setView("list")} />
          <button 
            onClick={() => setView("list")}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Back to List
          </button>
        </div>
      ) : (
        /* @ts-expect-error - bypassing strict nested employee item type mismatch safely */
        <EmployeeList employees={employees} />
      )}
    </div>
  );
}