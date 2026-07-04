"use client";

import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { mapEmployeeRowToListItem } from "@/lib/map-employee-to-db";
import type { EmployeeListItem } from "@/types/employee-list";
import type { EmployeeType } from "@/types/employee-form";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import SupabaseSetupBanner from "./supabase-setup-banner";

type ViewMode = "list" | "add" | "edit";

const EMPTY_EMPLOYEES: EmployeeListItem[] = [];

const VALID_EMPLOYEE_TYPES: EmployeeType[] = [
  "Contractor",
  "Regular",
  "Temporary",
];

function normalizeEmployeeType(value: unknown): EmployeeType {
  if (
    typeof value === "string" &&
    VALID_EMPLOYEE_TYPES.includes(value as EmployeeType)
  ) {
    return value as EmployeeType;
  }
  return "Regular";
}

function safeMapEmployeeRow(row: unknown): EmployeeListItem | null {
  try {
    if (!row || typeof row !== "object") return null;

    const record = row as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.full_name !== "string") {
      return null;
    }

    return mapEmployeeRowToListItem({
      id: record.id,
      full_name: record.full_name,
      employee_type: normalizeEmployeeType(record.employee_type),
      mobile_number: String(record.mobile_number ?? ""),
      vehicle_number:
        typeof record.vehicle_number === "string" ? record.vehicle_number : null,
      machine_assignment:
        typeof record.machine_assignment === "string"
          ? record.machine_assignment
          : null,
      fix_salary_amount:
        typeof record.fix_salary_amount === "number"
          ? record.fix_salary_amount
          : null,
      basic_salary:
        typeof record.basic_salary === "number" ? record.basic_salary : null,
      variable_salary_enabled:
        typeof record.variable_salary_enabled === "boolean"
          ? record.variable_salary_enabled
          : false,
      daily_rate:
        typeof record.daily_rate === "number" ? record.daily_rate : null,
      worked_days:
        typeof record.worked_days === "number" ? record.worked_days : null,
    });
  } catch {
    return null;
  }
}

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class MasterPanelErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message:
        error?.message || "Something went wrong while loading the Master Panel.",
    };
  }

  componentDidCatch(error: Error) {
    console.error("MasterPanelView crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">Master Panel could not be loaded</p>
          <p className="mt-2">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function MasterPanelContent() {
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[]>(EMPTY_EMPLOYEES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = supabase;
      const fromMethod = client?.from;

      if (!client || typeof fromMethod !== "function") {
        setEmployees(EMPTY_EMPLOYEES);
        setError("Supabase client is unavailable. Check environment variables.");
        return;
      }

      const tableQuery = fromMethod.call(client, "employees");

      if (!tableQuery || typeof tableQuery.select !== "function") {
        setEmployees(EMPTY_EMPLOYEES);
        setError("Unable to query the employees table.");
        return;
      }

      const { data, error: supabaseError } = await tableQuery
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        setEmployees(EMPTY_EMPLOYEES);
        setError(supabaseError.message ?? "Failed to load employees.");
        return;
      }

      if (data == null || !Array.isArray(data)) {
        setEmployees(EMPTY_EMPLOYEES);
        return;
      }

      const mapped = data
        .map((row) => safeMapEmployeeRow(row))
        .filter((row): row is EmployeeListItem => row !== null);

      setEmployees(mapped);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees(EMPTY_EMPLOYEES);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees, view]);

  const handleBack = () => {
    setView("list");
    setEditingId(null);
  };

  const handleSuccess = () => {
    handleBack();
    void fetchEmployees();
  };

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  if (!hasLoadedOnce && isLoading) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading master panel...
      </div>
    );
  }

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
        employees={safeEmployees || EMPTY_EMPLOYEES}
        isLoading={isLoading}
        error={error}
        onRetry={() => void fetchEmployees()}
        onAddNew={() => setView("add")}
        onEdit={(id) => {
          setEditingId(typeof id === "string" ? id : null);
          setView("edit");
        }}
        onRefresh={() => void fetchEmployees()}
      />
    </div>
  );
}

export default function MasterPanelView() {
  return (
    <MasterPanelErrorBoundary>
      <MasterPanelContent />
    </MasterPanelErrorBoundary>
  );
}
