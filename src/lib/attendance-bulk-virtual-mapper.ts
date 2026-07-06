import {
  normalizeAttendanceDateIso,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import {
  atomicFinalizeBulkDbPayload,
  buildBulkDbPayload,
  safeBulkNumeric,
  type AttendanceBulkDbPayload,
} from "@/lib/attendance-bulk-payload-bridge";

/** Virtual mapping dictionary — case-insensitive fuzzy aliases → canonical 23-column keys. */
export const VIRTUAL_BULK_FIELD_MAP: Array<{
  canonical: keyof Biometric23ColumnRecord;
  snake: string;
  aliases: string[];
  numericDefault?: boolean;
}> = [
  {
    canonical: "serialNumber",
    snake: "srl_number",
    aliases: ["srlnumber", "srlno", "srlno.", "srl", "serialnumber", "serialno"],
  },
  {
    canonical: "payCode",
    snake: "pay_code",
    aliases: ["paycode", "empcode", "employeecode", "employee_code"],
  },
  {
    canonical: "cardNumber",
    snake: "card_number",
    aliases: ["cardnumber", "cardno", "card_no", "card"],
  },
  {
    canonical: "employeeName",
    snake: "employee_name",
    aliases: ["employeename", "name", "empname", "employee"],
  },
  { canonical: "department", snake: "department", aliases: ["dept", "departmentname"] },
  {
    canonical: "designation",
    snake: "designation",
    aliases: ["designations", "desig", "jobtitle"],
  },
  { canonical: "shift", snake: "shift", aliases: ["shiftcode", "shift_code"] },
  {
    canonical: "date",
    snake: "date",
    aliases: [
      "attendance_date",
      "attendancedate",
      "workdate",
      "attdate",
      "reportdate",
      "attendance date",
    ],
  },
  { canonical: "start", snake: "start", aliases: ["starttime", "shiftstart"] },
  { canonical: "in", snake: "in", aliases: ["intime", "in_time", "punchin", "punch_in"] },
  { canonical: "lunchOut", snake: "lunch_out", aliases: ["lunchout", "lunch_out_time"] },
  { canonical: "lunchIn", snake: "lunch_in", aliases: ["lunchin", "lunch_in_time"] },
  { canonical: "out", snake: "out", aliases: ["outtime", "out_time", "punchout", "punch_out"] },
  {
    canonical: "hoursWorked",
    snake: "hours_worked",
    aliases: ["hoursworked", "hours", "totalhours"],
  },
  { canonical: "status", snake: "status", aliases: ["attendancestatus", "attstatus"] },
  {
    canonical: "earlyArrival",
    snake: "early_arrival",
    aliases: ["earlyarrival", "early"],
    numericDefault: true,
  },
  {
    canonical: "shiftLate",
    snake: "shift_late",
    aliases: ["shiftlate", "late"],
    numericDefault: true,
  },
  {
    canonical: "shiftEarly",
    snake: "shift_early",
    aliases: ["shiftearly", "earlydeparture"],
    numericDefault: true,
  },
  {
    canonical: "excessLunch",
    snake: "excess_lunch",
    aliases: ["excesslunch"],
    numericDefault: true,
  },
  { canonical: "ot", snake: "ot", aliases: ["overtimehours", "othours"], numericDefault: true },
  {
    canonical: "overtimeAmount",
    snake: "overtime_amount",
    aliases: ["overtimeamount", "overtime", "otamount"],
    numericDefault: true,
  },
  {
    canonical: "overStay",
    snake: "over_stay",
    aliases: ["overstay", "overstayamount"],
    numericDefault: true,
  },
  { canonical: "manual", snake: "manual", aliases: ["manualentry", "manualflag"], numericDefault: true },
];

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function collapseKey(key: string): string {
  return key.toLowerCase().replace(/[\s_.-]+/g, "");
}

function buildVirtualKeyIndex(source: Record<string, unknown>): Map<string, unknown> {
  const index = new Map<string, unknown>();
  try {
    for (const [key, value] of Object.entries(source)) {
      if (value == null) continue;
      index.set(collapseKey(key), value);
    }
  } catch (error) {
    console.error("[virtual-mapper] key index failed:", error);
  }
  return index;
}

/** Case-insensitive fuzzy read from a flattened key index. */
export function fuzzyReadVirtualField(
  source: Record<string, unknown>,
  aliases: string[]
): string {
  try {
    const index = buildVirtualKeyIndex(source);

    for (const alias of aliases) {
      const direct = safeString(source[alias]);
      if (direct) return direct;

      const collapsed = collapseKey(alias);
      const fromIndex = safeString(index.get(collapsed));
      if (fromIndex) return fromIndex;
    }
    return "";
  } catch {
    return "";
  }
}

/** Map any incoming row shape → canonical 23-column virtual record. */
export function mapVirtualBulkRow(
  raw: Record<string, unknown> | null | undefined,
  defaultDate?: string
): Biometric23ColumnRecord {
  try {
    if (!raw || typeof raw !== "object") {
      return normalizeBiometric23ColumnRecord(null, { defaultDate });
    }

    const partial: Record<string, unknown> = {};

    for (const field of VIRTUAL_BULK_FIELD_MAP) {
      const keys = [field.canonical, field.snake, ...field.aliases];
      const value = fuzzyReadVirtualField(raw, keys);
      if (value) {
        partial[field.canonical] = value;
      }
    }

    const resolvedDate = normalizeAttendanceDateIso(
      fuzzyReadVirtualField(raw, [
        "date",
        "attendance_date",
        "attendanceDate",
        "reportDate",
        "report_date",
      ]),
      defaultDate
    );

    partial.date = resolvedDate;

    const record = normalizeBiometric23ColumnRecord(partial, { defaultDate: resolvedDate });

    for (const field of VIRTUAL_BULK_FIELD_MAP) {
      if (!field.numericDefault) continue;
      const current = safeString(record[field.canonical]);
      if (!current) {
        (record as Record<string, string>)[field.canonical] = "0";
      }
    }

    record.date = normalizeAttendanceDateIso(record.date, defaultDate);
    return record;
  } catch (error) {
    console.error("[virtual-mapper] mapVirtualBulkRow failed:", error);
    return normalizeBiometric23ColumnRecord(null, { defaultDate });
  }
}

/** Sync virtual date column → native attendance_date for date-wise DB queries. */
export function syncVirtualDateToAttendanceDate(
  record: Biometric23ColumnRecord,
  fallback?: string
): { date: string; attendanceDate: string } {
  try {
    const date = normalizeAttendanceDateIso(record.date, fallback);
    return { date, attendanceDate: date };
  } catch {
    const date = todayIsoDate();
    return { date, attendanceDate: date };
  }
}

/** Full virtual intercept: fuzzy 23-col map → DB payload with date-wise persistence. */
export function virtualBulkRowToDbPayload(
  raw: Record<string, unknown>,
  options?: { employeeId?: string; defaultDate?: string }
): AttendanceBulkDbPayload | null {
  try {
    const virtual = mapVirtualBulkRow(raw, options?.defaultDate);
    const { date, attendanceDate } = syncVirtualDateToAttendanceDate(
      virtual,
      options?.defaultDate
    );

    const employeeId =
      fuzzyReadVirtualField(raw, [
        "employee_id",
        "employeeId",
        "employeeid",
        "pay_code",
        "payCode",
        "card_number",
        "cardNumber",
      ]) ||
      options?.employeeId ||
      virtual.payCode ||
      virtual.cardNumber ||
      virtual.employeeName;

    if (!employeeId && !virtual.employeeName && !virtual.payCode && !virtual.cardNumber) {
      return null;
    }

    const payload = atomicFinalizeBulkDbPayload(
      buildBulkDbPayload({
        row: { ...virtual, date },
        employeeId,
        attendanceDate,
      })
    );

    return atomicFinalizeBulkDbPayload({
      ...payload,
      date,
      attendance_date: attendanceDate,
      employee_id: safeString(payload.employee_id) || employeeId,
      employee_name:
        safeString(payload.employee_name) ||
        virtual.employeeName ||
        fuzzyReadVirtualField(raw, ["employee_name", "employeeName", "name"]),
      ot: safeString(payload.ot) || "0",
      overtime_amount: safeString(payload.overtime_amount) || "0",
      over_stay: safeString(payload.over_stay) || "0",
      manual: safeString(payload.manual) || "0",
      overtime_hours: safeBulkNumeric(payload.overtime_hours),
    });
  } catch (error) {
    console.error("[virtual-mapper] virtualBulkRowToDbPayload failed:", error);
    return null;
  }
}
