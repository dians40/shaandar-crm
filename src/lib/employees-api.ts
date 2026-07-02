import type { EmployeeFormData } from "@/types/employee-form";
import type { EmployeeListItem } from "@/types/employee-list";
import { buildEmployeePayloadJson } from "@/lib/form-data-utils";
import { ALL_DOCUMENT_KEYS } from "@/lib/employee-form-utils";

type FetchEmployeesResponse = { employees: EmployeeListItem[] };
type EmployeeResponse = { employee: EmployeeFormData };
type MutateResponse = { employee: EmployeeListItem; message: string };
type ApiErrorResponse = { error: string };

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function appendFormData(formData: EmployeeFormData): FormData {
  const body = new FormData();
  body.append("employee", buildEmployeePayloadJson(formData));

  for (const key of ALL_DOCUMENT_KEYS) {
    const file = formData.documents[key];
    if (file) {
      body.append(key, file);
    }
  }

  return body;
}

export async function fetchEmployees(): Promise<EmployeeListItem[]> {
  const response = await fetch("/api/employees", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as FetchEmployeesResponse;
  return data.employees;
}

export async function fetchEmployee(id: string): Promise<EmployeeFormData> {
  const response = await fetch(`/api/employees/${id}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as EmployeeResponse;
  return data.employee;
}

export async function createEmployee(
  formData: EmployeeFormData
): Promise<MutateResponse> {
  const response = await fetch("/api/employees", {
    method: "POST",
    body: appendFormData(formData),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as MutateResponse;
}

export async function updateEmployee(
  id: string,
  formData: EmployeeFormData
): Promise<MutateResponse> {
  const response = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    body: appendFormData(formData),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as MutateResponse;
}

export async function deleteEmployee(id: string): Promise<void> {
  const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function patchEmployeeSalary(
  id: string,
  payload: {
    fixSalaryAmount?: number | null;
    dailyRate?: number | null;
    workedDays?: number | null;
    variableSalaryEnabled?: boolean;
  }
): Promise<EmployeeListItem> {
  const response = await fetch(`/api/employees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { employee: EmployeeListItem };
  return data.employee;
}
