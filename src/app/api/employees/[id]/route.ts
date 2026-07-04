import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { requireAuth, supabaseNotConfiguredResponse } from "@/lib/api/auth-guard";
import { employeeHasAttendance } from "@/lib/attendance";
import {
  mapEmployeeRowToFormData,
  mapEmployeeRowToListItem,
  mapFormToEmployeeInsert,
} from "@/lib/map-employee-to-db";
import { validateBasicInformation } from "@/lib/validate-employee-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocumentFiles } from "@/lib/form-data-utils";
import { uploadEmployeeDocuments } from "@/lib/supabase/upload-documents";
import { EMPLOYEE_FULL_COLUMNS, EMPLOYEE_LIST_COLUMNS } from "@/types/employee-db";
import type { EmployeeFormData } from "@/types/employee-form";
import { EMPTY_DOCUMENT_NUMBERS } from "@/types/employee-form";

type RouteContext = { params: Promise<{ id: string }> };

type EmployeePayload = Pick<
  EmployeeFormData,
  | "basicInformation"
  | "workAssignment"
  | "familyMembers"
  | "documentNumbers"
  | "bankAndSalary"
  | "existingDocumentPaths"
>;

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const { id } = await context.params;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("employees")
      .select(EMPLOYEE_FULL_COLUMNS)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    return NextResponse.json({ employee: mapEmployeeRowToFormData(data) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load employee.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const employeeJson = formData.get("employee");

    if (typeof employeeJson !== "string") {
      return NextResponse.json(
        { error: "Missing employee payload." },
        { status: 400 }
      );
    }

    const employeePayload = JSON.parse(employeeJson) as EmployeePayload;

    const validationErrors = validateBasicInformation(
      employeePayload.basicInformation
    );
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      return NextResponse.json({ error: firstError ?? "Invalid employee data." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const fullFormData: EmployeeFormData = {
      ...employeePayload,
      documents: extractDocumentFiles(formData),
      documentNumbers: employeePayload.documentNumbers ?? { ...EMPTY_DOCUMENT_NUMBERS },
      existingDocumentPaths: employeePayload.existingDocumentPaths ?? {},
    };

    const updatePayload = mapFormToEmployeeInsert(fullFormData);
    const documentFiles = extractDocumentFiles(formData);
    const hasNewDocuments = Object.values(documentFiles).some(Boolean);

    let documentPaths = fullFormData.existingDocumentPaths;

    if (hasNewDocuments) {
      documentPaths = await uploadEmployeeDocuments(
        supabase,
        id,
        documentFiles,
        fullFormData.existingDocumentPaths
      );
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        ...updatePayload,
        document_paths: documentPaths,
        photo_url: documentPaths.profilePhoto ?? updatePayload.photo_url ?? null,
      })
      .eq("id", id);

    if (updateError) {
      const hint = updateError.message.includes("column")
        ? " Run migration 003_employee_extended_fields.sql in Supabase SQL Editor."
        : "";
      return NextResponse.json({ error: updateError.message + hint }, { status: 500 });
    }

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select(EMPLOYEE_LIST_COLUMNS)
      .eq("id", id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: "Updated but failed to reload employee." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      employee: mapEmployeeRowToListItem(employee, {
        hasAttendanceRecords: await employeeHasAttendance(supabase, id),
      }),
      message: "Employee updated successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update employee.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const { id } = await context.params;

  try {
    const supabase = createAdminClient();

    const hasAttendance = await employeeHasAttendance(supabase, id);
    if (hasAttendance) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this employee: attendance records exist and must be preserved for payroll calculations.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Employee removed successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete employee.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      fixSalaryAmount?: number | null;
      dailyRate?: number | null;
      workedDays?: number | null;
      variableSalaryEnabled?: boolean;
    };

    const supabase = createAdminClient();
    const { data: employee, error } = await supabase
      .from("employees")
      .update({
        fix_salary_amount: body.fixSalaryAmount ?? null,
        basic_salary: body.fixSalaryAmount ?? null,
        daily_rate: body.dailyRate ?? null,
        worked_days: body.workedDays ?? null,
        variable_salary_enabled: body.variableSalaryEnabled ?? false,
      })
      .eq("id", id)
      .select(EMPLOYEE_LIST_COLUMNS)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
    }

    return NextResponse.json({ employee: mapEmployeeRowToListItem(employee) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update salary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
