import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { requireAuth, supabaseNotConfiguredResponse } from "@/lib/api/auth-guard";
import { getEmployeeIdsWithAttendance } from "@/lib/attendance";
import {
  mapEmployeeRowToListItem,
  mapFormToEmployeeInsert,
} from "@/lib/map-employee-to-db";
import { validateEmployeeForm } from "@/lib/validate-employee-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocumentFiles } from "@/lib/form-data-utils";
import { uploadEmployeeDocuments } from "@/lib/supabase/upload-documents";
import { EMPLOYEE_LIST_COLUMNS, EMPLOYEE_LIST_COLUMNS_BASE } from "@/types/employee-db";
import type { EmployeeFormData } from "@/types/employee-form";
import { EMPTY_DOCUMENT_NUMBERS } from "@/types/employee-form";

type EmployeePayload = Pick<
  EmployeeFormData,
  | "basicInformation"
  | "workAssignment"
  | "familyMembers"
  | "documentNumbers"
  | "bankAndSalary"
  | "existingDocumentPaths"
>;

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  try {
    const supabase = createAdminClient();

    let { data, error } = await supabase
      .from("employees")
      .select(EMPLOYEE_LIST_COLUMNS)
      .order("created_at", { ascending: false });

    if (error?.message.includes("column")) {
      ({ data, error } = await supabase
        .from("employees")
        .select(EMPLOYEE_LIST_COLUMNS_BASE)
        .order("created_at", { ascending: false }));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employees = await (async () => {
      const rows = data ?? [];
      const ids = rows.map((row) => row.id as string);
      const attendanceIds = await getEmployeeIdsWithAttendance(supabase, ids);

      return rows.map((row) =>
        mapEmployeeRowToListItem(row, {
          hasAttendanceRecords: attendanceIds.has(row.id as string),
        })
      );
    })();

    return NextResponse.json({ employees });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch employees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return supabaseNotConfiguredResponse();
  }

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

    const { basic: validationErrors, bank: bankErrors } = validateEmployeeForm({
      basicInformation: employeePayload.basicInformation,
      bankAndSalary: employeePayload.bankAndSalary,
    });
    if (Object.keys(validationErrors).length > 0 || Object.keys(bankErrors).length > 0) {
      const firstError =
        Object.values(validationErrors)[0] ?? Object.values(bankErrors)[0];
      return NextResponse.json({ error: firstError ?? "Invalid employee data." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const fullFormData: EmployeeFormData = {
      ...employeePayload,
      documents: extractDocumentFiles(formData),
      documentNumbers: employeePayload.documentNumbers ?? { ...EMPTY_DOCUMENT_NUMBERS },
      existingDocumentPaths: employeePayload.existingDocumentPaths ?? {},
    };

    const insertPayload = mapFormToEmployeeInsert(fullFormData);

    const { data: inserted, error: insertError } = await supabase
      .from("employees")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !inserted) {
      const msg = insertError?.message ?? "Failed to create employee.";
      const hint = msg.includes("column")
        ? " Run migration 003_employee_extended_fields.sql in Supabase SQL Editor."
        : "";
      return NextResponse.json({ error: msg + hint }, { status: 500 });
    }

    const documentFiles = extractDocumentFiles(formData);
    const hasDocuments = Object.values(documentFiles).some(Boolean);

    if (hasDocuments) {
      const documentPaths = await uploadEmployeeDocuments(
        supabase,
        inserted.id,
        documentFiles,
        fullFormData.existingDocumentPaths
      );

      await supabase
        .from("employees")
        .update({
          document_paths: documentPaths,
          photo_url: documentPaths.profilePhoto ?? null,
        })
        .eq("id", inserted.id);
    }

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select(EMPLOYEE_LIST_COLUMNS)
      .eq("id", inserted.id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Employee created but failed to load." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        employee: mapEmployeeRowToListItem(employee),
        message: "Employee saved successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create employee.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
