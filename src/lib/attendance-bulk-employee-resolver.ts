import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttendanceBulkDbPayload } from "@/lib/attendance-bulk-payload-bridge";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

export function isValidEmployeeUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Map biometric Excel status codes to employee_attendance.status column values. */
export function mapExcelStatusToDbStatus(
  statusToken: unknown,
  shiftToken?: unknown
): "present" | "absent" | "half-day" | "leave" {
  try {
    const token = safeString(statusToken).toUpperCase();
    const shift = safeString(shiftToken).toUpperCase();

    if (!token && !shift) return "present";
    if (token === "A" || token === "ABS" || token === "ABSENT" || token === "L") {
      return "absent";
    }
    if (token === "HD" || token === "HALF" || token === "HALF-DAY") {
      return "half-day";
    }
    if (token === "LV" || token === "LEAVE") {
      return "leave";
    }
    if (token === "MIS" || token === "P" || token === "PR" || token === "PRESENT") {
      return "present";
    }
    if (shift.includes("G11") || shift.includes("DY") || token.includes("DY")) {
      return "present";
    }
    return "present";
  } catch {
    return "present";
  }
}

/** Resolve overtime shift without treating currency/numeric OT as a shift code. */
export function resolveOvertimeShiftFromBulkRow(
  row: Pick<
    AttendanceBulkDbPayload,
    "overtime_shift" | "ot" | "overtime_amount" | "shift" | "status"
  >
): string {
  try {
    const shift = safeString(row.shift).toUpperCase();
    if (shift.includes("G11")) return "G11";
    if (shift.includes("DY1") || shift.includes("DY")) return "DY1";

    const otToken = safeString(row.ot);
    if (otToken.includes("G11")) return "G11";
    if (otToken.includes("DY1") || otToken.includes("DY")) return "DY1";

    const overtimeShift = safeString(row.overtime_shift).toUpperCase();
    if (overtimeShift.includes("G11")) return "G11";
    if (overtimeShift.includes("DY1") || overtimeShift.includes("DY")) return "DY1";

    return shift.includes("G11") ? "G11" : "DY1";
  } catch {
    return "DY1";
  }
}

async function findEmployeeByUuid(
  supabase: SupabaseClient,
  employeeId: string
): Promise<string | null> {
  if (!employeeId || !isValidEmployeeUuid(employeeId)) return null;
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function findEmployeeByName(
  supabase: SupabaseClient,
  employeeName: string
): Promise<string | null> {
  const name = collapseWhitespace(employeeName);
  if (!name) return null;

  const { data: exact } = await supabase
    .from("employees")
    .select("id, full_name")
    .ilike("full_name", name)
    .limit(1)
    .maybeSingle();
  if (exact?.id) return String(exact.id);

  const { data: rows } = await supabase
    .from("employees")
    .select("id, full_name")
    .ilike("full_name", `%${name.split(" ")[0]}%`)
    .limit(20);

  const normalizedTarget = normalizeName(name);
  const fuzzy = (rows ?? []).find(
    (row) => normalizeName(String(row.full_name ?? "")) === normalizedTarget
  );
  return fuzzy?.id ? String(fuzzy.id) : null;
}

async function findEmployeeByPayCode(
  supabase: SupabaseClient,
  payCode: string,
  cardNumber?: string
): Promise<string | null> {
  const code = safeString(payCode);
  const card = safeString(cardNumber);
  const candidates = [code, card].filter(Boolean);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const { data: byMobile } = await supabase
      .from("employees")
      .select("id")
      .eq("mobile_number", candidate)
      .limit(1)
      .maybeSingle();
    if (byMobile?.id) return String(byMobile.id);

    const { data: byMobileIlike } = await supabase
      .from("employees")
      .select("id")
      .ilike("mobile_number", candidate)
      .limit(1)
      .maybeSingle();
    if (byMobileIlike?.id) return String(byMobileIlike.id);
  }

  return null;
}

/** Create a minimal employee row so bulk attendance can reference a real UUID. */
export async function autoProvisionEmployeeForBulkImport(
  supabase: SupabaseClient,
  input: {
    payCode: string;
    cardNumber?: string;
    employeeName: string;
    department?: string;
  }
): Promise<string | null> {
  try {
    const payCode = safeString(input.payCode);
    const cardNumber = safeString(input.cardNumber);
    const employeeName =
      collapseWhitespace(input.employeeName) ||
      (payCode ? `Employee ${payCode}` : "Imported Employee");
    const mobileKey = payCode || cardNumber || `bulk-${Date.now()}`;

    const existing = await findEmployeeByPayCode(supabase, payCode, cardNumber);
    if (existing) return existing;

    const { data, error } = await supabase
      .from("employees")
      .insert({
        full_name: employeeName,
        date_of_birth: "1990-01-01",
        mobile_number: mobileKey,
        employee_type: "Temporary",
        family_members: [],
        document_paths: {},
        machine_assignment: safeString(input.department) || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[bulk-import] auto-provision failed:", error.message);
      return null;
    }

    return data?.id ? String(data.id) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** Resolve employee UUID — auto-provisions when no match exists. */
export async function resolveOrProvisionEmployeeId(
  supabase: SupabaseClient,
  row: Pick<
    AttendanceBulkDbPayload,
    "employee_id" | "employee_name" | "pay_code" | "card_number" | "department"
  >,
  options?: { autoProvision?: boolean }
): Promise<{ employeeId: string | null; provisioned: boolean; error?: string }> {
  try {
    const autoProvision = options?.autoProvision !== false;
    const employeeId = safeString(row.employee_id);
    const employeeName = safeString(row.employee_name);
    const payCode = safeString(row.pay_code);
    const cardNumber = safeString(row.card_number);

    const fromUuid = await findEmployeeByUuid(supabase, employeeId);
    if (fromUuid) return { employeeId: fromUuid, provisioned: false };

    const fromPayCode = await findEmployeeByPayCode(supabase, payCode, cardNumber);
    if (fromPayCode) return { employeeId: fromPayCode, provisioned: false };

    const fromName = await findEmployeeByName(supabase, employeeName);
    if (fromName) return { employeeId: fromName, provisioned: false };

    if (!autoProvision) {
      return {
        employeeId: null,
        provisioned: false,
        error: `${employeeName || payCode || employeeId}: employee not found in database.`,
      };
    }

    const provisionedId = await autoProvisionEmployeeForBulkImport(supabase, {
      payCode,
      cardNumber,
      employeeName,
      department: row.department,
    });

    if (!provisionedId) {
      return {
        employeeId: null,
        provisioned: false,
        error: `${employeeName || payCode}: auto-provision failed.`,
      };
    }

    return { employeeId: provisionedId, provisioned: true };
  } catch (error) {
    console.error(error);
    return {
      employeeId: null,
      provisioned: false,
      error: error instanceof Error ? error.message : "Employee resolution failed.",
    };
  }
}
