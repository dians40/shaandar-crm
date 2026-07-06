import {
  bulkRecordToWorkflowFields,
  normalizeBiometric22ColumnRecord,
  type Biometric22ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import {
  BULK_HEADER_FUZZY_PATTERNS,
  fuzzyHeaderToken,
  normalizeHeaderKey,
  normalizeRawRowKeys,
} from "@/lib/attendance-bulk-header-normalizer";
import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

/** Snake_case database payload for a single biometric bulk row. */
export type AttendanceBulkDbPayload = {
  srl_number: string;
  pay_code: string;
  card_number: string;
  employee_name: string;
  department: string;
  designation: string;
  shift: string;
  start: string;
  in: string;
  lunch_out: string;
  lunch_in: string;
  out: string;
  hours_worked: string;
  status: string;
  early_arrival: string;
  shift_late: string;
  shift_early: string;
  excess_lunch: string;
  ot: string;
  overtime_amount: string;
  over_stay: string;
  manual: string;
  employee_id: string;
  attendance_date: string;
  punch_in: string;
  punch_out: string;
  overtime_hours: number;
  overtime_shift: string;
  remarks: string;
};

type FieldAliasMap = {
  camel: keyof Biometric22ColumnRecord;
  snake: string;
  tokens: string[];
};

const BULK_FIELD_ALIASES: FieldAliasMap[] = BULK_HEADER_FUZZY_PATTERNS.map((pattern) => ({
  camel: pattern.key,
  snake: pattern.snake,
  tokens: pattern.tokens,
}));

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

export function safeBulkNumeric(value: unknown): number {
  try {
    const token = safeString(value).replace(/[$,]/g, "");
    if (!token) return 0;
    const parsed = Number(token);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function tokenMatchesField(token: string, keyFuzzy: string): boolean {
  if (!token || !keyFuzzy) return false;
  if (keyFuzzy === token) return true;
  if (token.length <= 3) return keyFuzzy === token;
  return keyFuzzy.includes(token) || token.includes(keyFuzzy);
}

/** Resolve one biometric field from camelCase, snake_case, or fuzzy header keys. */
export function resolveBulkField(
  row: Record<string, unknown>,
  alias: FieldAliasMap
): string {
  try {
    const camel = safeString(row[alias.camel]);
    if (camel) return camel;

    const snake = safeString(row[alias.snake]);
    if (snake) return snake;

    for (const token of alias.tokens) {
      const direct = safeString(row[token] ?? row[normalizeHeaderKey(token)]);
      if (direct) return direct;
    }

    for (const [key, value] of Object.entries(row)) {
      const keyFuzzy = fuzzyHeaderToken(key);
      const keyLower = normalizeHeaderKey(key);
      for (const token of alias.tokens) {
        if (tokenMatchesField(token, keyFuzzy) || tokenMatchesField(token, keyLower)) {
          const resolved = safeString(value);
          if (resolved) return resolved;
        }
      }
      if (keyFuzzy === fuzzyHeaderToken(alias.snake) || keyFuzzy === fuzzyHeaderToken(alias.camel)) {
        const resolved = safeString(value);
        if (resolved) return resolved;
      }
    }

    if (alias.camel === "serialNumber") {
      return safeString(row.srlNumber ?? row.srl_number ?? row["srl no."]);
    }
    if (alias.camel === "cardNumber") {
      return safeString(row["card no"]);
    }
    if (alias.camel === "in") {
      return safeString(row.inTime ?? row.in_time);
    }
    if (alias.camel === "out") {
      return safeString(row.outTime ?? row.out_time);
    }
    if (alias.camel === "overtimeAmount") {
      return safeString(row.overtime ?? row["overtime amount"]);
    }
    if (alias.camel === "overStay") {
      return safeString(row.overstay ?? row["over stay"]);
    }

    return "";
  } catch (error) {
    console.error(error);
    return "";
  }
}

/** Sanitize any raw row shape into the canonical 22-key biometric record. */
export function sanitizeBulkRowInput(
  raw: Record<string, unknown> | Biometric22ColumnRecord | null | undefined
): Biometric22ColumnRecord {
  try {
    const source = normalizeRawRowKeys((raw ?? {}) as Record<string, unknown>);
    const partial: Partial<Biometric22ColumnRecord> = {};

    for (const alias of BULK_FIELD_ALIASES) {
      partial[alias.camel] = resolveBulkField(source, alias);
    }

    return normalizeBiometric22ColumnRecord(partial);
  } catch (error) {
    console.error(error);
    return normalizeBiometric22ColumnRecord(null);
  }
}

/** Atomic defaults — every string field to "" and numeric metrics to 0 before POST. */
export function atomicFinalizeBulkDbPayload(
  payload: AttendanceBulkDbPayload
): AttendanceBulkDbPayload {
  try {
    return {
      srl_number: safeString(payload.srl_number),
      pay_code: safeString(payload.pay_code),
      card_number: safeString(payload.card_number),
      employee_name: safeString(payload.employee_name),
      department: safeString(payload.department),
      designation: safeString(payload.designation),
      shift: safeString(payload.shift),
      start: safeString(payload.start),
      in: safeString(payload.in),
      lunch_out: safeString(payload.lunch_out),
      lunch_in: safeString(payload.lunch_in),
      out: safeString(payload.out),
      hours_worked: safeString(payload.hours_worked),
      status: safeString(payload.status) || BIOMETRIC_DAY_CODE,
      early_arrival: safeString(payload.early_arrival),
      shift_late: safeString(payload.shift_late),
      shift_early: safeString(payload.shift_early),
      excess_lunch: safeString(payload.excess_lunch),
      ot: safeString(payload.ot),
      overtime_amount: safeString(payload.overtime_amount),
      over_stay: safeString(payload.over_stay),
      manual: safeString(payload.manual),
      employee_id: safeString(payload.employee_id),
      attendance_date: safeString(payload.attendance_date) || todayIsoDate(),
      punch_in: safeString(payload.punch_in),
      punch_out: safeString(payload.punch_out),
      overtime_hours: safeBulkNumeric(payload.overtime_hours),
      overtime_shift: safeString(payload.overtime_shift) || BIOMETRIC_DAY_CODE,
      remarks: safeString(payload.remarks),
    };
  } catch (error) {
    console.error(error);
    const date = todayIsoDate();
    return {
      srl_number: "",
      pay_code: "",
      card_number: "",
      employee_name: "",
      department: "",
      designation: "",
      shift: "",
      start: "",
      in: "",
      lunch_out: "",
      lunch_in: "",
      out: "",
      hours_worked: "",
      status: BIOMETRIC_DAY_CODE,
      early_arrival: "",
      shift_late: "",
      shift_early: "",
      excess_lunch: "",
      ot: "",
      overtime_amount: "",
      over_stay: "",
      manual: "",
      employee_id: "",
      attendance_date: date,
      punch_in: `${date}T09:00:00.000Z`,
      punch_out: "",
      overtime_hours: 0,
      overtime_shift: BIOMETRIC_DAY_CODE,
      remarks: "",
    };
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeToIso(date: string, timeValue: string): string {
  try {
    const token = timeValue.trim();
    if (!token) return "";

    if (/^\d{4}-\d{2}-\d{2}T/.test(token)) return token;

    const match = token.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
    if (match) {
      let hour = Number(match[1]);
      const minute = Number(match[2] ?? "0");
      const second = Number(match[3] ?? "0");
      const meridiem = match[4]?.toLowerCase();
      if (meridiem === "pm" && hour < 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
    }

    const parsed = Date.parse(`${date}T${token}`);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    return "";
  } catch (error) {
    console.error(error);
    return "";
  }
}

export function resolveBulkOvertimeHours(record: Biometric22ColumnRecord): number {
  try {
    const safe = normalizeBiometric22ColumnRecord(record);
    const fromOt = safeBulkNumeric(safe.ot);
    if (fromOt > 0) return fromOt;
    const fromOvertimeAmount = safeBulkNumeric(safe.overtimeAmount);
    if (fromOvertimeAmount > 0) return fromOvertimeAmount;
    const fromOverStay = safeBulkNumeric(safe.overStay);
    if (fromOverStay > 0) return fromOverStay;
    const fromManual = safeBulkNumeric(safe.manual);
    if (fromManual > 0) return fromManual;
    return safe.ot || safe.overtimeAmount || safe.overStay ? 1 : 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

export function buildBulkPunchTimes(
  record: Biometric22ColumnRecord,
  attendanceDate?: string
): { punchIn: string; punchOut: string } {
  try {
    const safe = normalizeBiometric22ColumnRecord(record);
    const date = safeString(attendanceDate) || todayIsoDate();
    const punchIn = parseTimeToIso(date, safe.in || safe.start);
    const punchOut = parseTimeToIso(date, safe.out);

    if (punchIn) {
      return { punchIn, punchOut: punchOut || "" };
    }

    const mapped = bulkRecordToWorkflowFields(safe);
    const status = mapped.status || BIOMETRIC_DAY_CODE;
    const shift = mapped.overtimeShift || status;
    const fallbackIn = `${date}T09:00:00.000Z`;
    const fallbackOut = `${date}T18:00:00.000Z`;
    return {
      punchIn: fallbackIn,
      punchOut: shift === BIOMETRIC_DAY_CODE ? `${date}T20:00:00.000Z` : fallbackOut,
    };
  } catch (error) {
    console.error(error);
    const date = todayIsoDate();
    return { punchIn: `${date}T09:00:00.000Z`, punchOut: "" };
  }
}

export function biometricRecordToSnakeCase(
  record: Biometric22ColumnRecord
): Omit<
  AttendanceBulkDbPayload,
  | "employee_id"
  | "attendance_date"
  | "punch_in"
  | "punch_out"
  | "overtime_hours"
  | "overtime_shift"
  | "remarks"
> {
  const safe = normalizeBiometric22ColumnRecord(record);
  return {
    srl_number: safe.serialNumber,
    pay_code: safe.payCode,
    card_number: safe.cardNumber,
    employee_name: safe.employeeName,
    department: safe.department,
    designation: safe.designation,
    shift: safe.shift,
    start: safe.start,
    in: safe.in,
    lunch_out: safe.lunchOut,
    lunch_in: safe.lunchIn,
    out: safe.out,
    hours_worked: safe.hoursWorked,
    status: safe.status || BIOMETRIC_DAY_CODE,
    early_arrival: safe.earlyArrival,
    shift_late: safe.shiftLate,
    shift_early: safe.shiftEarly,
    excess_lunch: safe.excessLunch,
    ot: safe.ot,
    overtime_amount: safe.overtimeAmount,
    over_stay: safe.overStay,
    manual: safe.manual,
  };
}

export function buildBulkDbPayload(input: {
  row: Biometric22ColumnRecord | Record<string, unknown>;
  employeeId: string;
  attendanceDate?: string;
}): AttendanceBulkDbPayload {
  try {
    const safe = sanitizeBulkRowInput(input.row as Record<string, unknown>);
    const mapped = bulkRecordToWorkflowFields(safe);
    const attendanceDate = safeString(input.attendanceDate) || todayIsoDate();
    const { punchIn, punchOut } = buildBulkPunchTimes(safe, attendanceDate);
    const status = normalizeBiometricCode(mapped.status) as ManualAttendanceStatus;
    const overtimeShift = normalizeBiometricCode(mapped.overtimeShift) as OvertimeShiftType;

    return atomicFinalizeBulkDbPayload({
      ...biometricRecordToSnakeCase(safe),
      employee_id: safeString(input.employeeId),
      attendance_date: attendanceDate,
      punch_in: punchIn,
      punch_out: punchOut || "",
      overtime_hours: resolveBulkOvertimeHours(safe),
      overtime_shift: overtimeShift || status || BIOMETRIC_DAY_CODE,
      remarks: mapped.remarks || "",
    });
  } catch (error) {
    console.error(error);
    const date = todayIsoDate();
    return atomicFinalizeBulkDbPayload({
      srl_number: "",
      pay_code: "",
      card_number: "",
      employee_name: "",
      department: "",
      designation: "",
      shift: "",
      start: "",
      in: "",
      lunch_out: "",
      lunch_in: "",
      out: "",
      hours_worked: "",
      status: BIOMETRIC_DAY_CODE,
      early_arrival: "",
      shift_late: "",
      shift_early: "",
      excess_lunch: "",
      ot: "",
      overtime_amount: "",
      over_stay: "",
      manual: "",
      employee_id: safeString(input.employeeId),
      attendance_date: date,
      punch_in: `${date}T09:00:00.000Z`,
      punch_out: "",
      overtime_hours: 0,
      overtime_shift: BIOMETRIC_DAY_CODE,
      remarks: "",
    });
  }
}

export function sanitizeBulkPayloadArray(
  rows: unknown[] | null | undefined
): AttendanceBulkDbPayload[] {
  try {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        try {
          if (!row || typeof row !== "object") return null;
          const source = row as Record<string, unknown>;
          const employeeId = safeString(
            source.employee_id ?? source.employeeId ?? source.pay_code ?? source.payCode
          );
          if (!employeeId) return null;
          return atomicFinalizeBulkDbPayload(
            buildBulkDbPayload({
              row: source,
              employeeId,
              attendanceDate: safeString(source.attendance_date ?? source.attendanceDate),
            })
          );
        } catch (rowError) {
          console.error(rowError);
          return null;
        }
      })
      .filter((row): row is AttendanceBulkDbPayload => Boolean(row));
  } catch (error) {
    console.error(error);
    return [];
  }
}
