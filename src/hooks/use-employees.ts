"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEmployees } from "@/lib/employees-api";
import type { EmployeeListItem } from "@/types/employee-list";

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load employees."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const prependEmployee = (employee: EmployeeListItem) => {
    setEmployees((prev) => [employee, ...prev.filter((e) => e.id !== employee.id)]);
  };

  return {
    employees,
    isLoading,
    error,
    reload: loadEmployees,
    prependEmployee,
  };
}
