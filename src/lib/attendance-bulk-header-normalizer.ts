import {
  applyDateFallback,
  BIOMETRIC_GRID_HEADER_LABELS,
  normalizeBiometric23ColumnRecord,
  todayIsoDateString,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export type BiometricColumnKey = keyof Biometric23ColumnRecord;

/** Collapse embedded newlines and extra spaces from Excel header cells. */
export function collapseHeaderWhitespace(value: unknown): string {
  try {
    return String(value ?? "")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

/** Strict lowercase header: trim + lowercase, preserving collapsed spacing intent. */
export function normalizeHeaderKey(value: unknown): string {
  try {
    return collapseHeaderWhitespace(value).toLowerCase();
  } catch {
    return "";
  }
}

/** Alphanumeric-only token for fuzzy header comparison. */
export function fuzzyHeaderToken(value: unknown): string {
  return normalizeHeaderKey(value).replace(/[^a-z0-9]/g, "");
}

export type BulkHeaderPattern = {
  key: BiometricColumnKey;
  snake: string;
  exactLabel: string;
  tokens: string[];
};

/** Exact + fuzzy patterns — 23-column grid (date after shift). Excel headers omit date. */
export const BULK_HEADER_FUZZY_PATTERNS: BulkHeaderPattern[] = [
  {
    key: "serialNumber",
    snake: "srl_number",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[0],
    tokens: ["srlno", "srlnumber", "serialno", "serialnumber", "srno", "sno"],
  },
  {
    key: "payCode",
    snake: "pay_code",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[1],
    tokens: ["paycode", "paycd", "empcode", "employeecode"],
  },
  {
    key: "cardNumber",
    snake: "card_number",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[2],
    tokens: ["cardno", "cardnumber", "cardid", "badgeno"],
  },
  {
    key: "employeeName",
    snake: "employee_name",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[3],
    tokens: ["employeename", "empname", "staffname", "workername", "fullname"],
  },
  {
    key: "department",
    snake: "department",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[4],
    tokens: ["department", "dept", "division"],
  },
  {
    key: "designation",
    snake: "designation",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[5],
    tokens: ["designation", "designations", "desig", "jobtitle", "title"],
  },
  {
    key: "shift",
    snake: "shift",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[6],
    tokens: ["shift", "workshift", "shiftcode"],
  },
  {
    key: "date",
    snake: "date",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[7],
    tokens: ["date", "workdate", "attdate", "attendancedate"],
  },
  {
    key: "start",
    snake: "start",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[8],
    tokens: ["start", "starttime", "shiftstart"],
  },
  {
    key: "in",
    snake: "in",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[9],
    tokens: ["in", "intime", "timein", "clockin", "punchin"],
  },
  {
    key: "lunchOut",
    snake: "lunch_out",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[10],
    tokens: ["lunchout", "lout"],
  },
  {
    key: "lunchIn",
    snake: "lunch_in",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[11],
    tokens: ["lunchin", "lin"],
  },
  {
    key: "out",
    snake: "out",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[12],
    tokens: ["out", "outtime", "timeout", "clockout", "punchout"],
  },
  {
    key: "hoursWorked",
    snake: "hours_worked",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[13],
    tokens: ["hoursworked", "workedhours", "totalhours", "duration", "workhours"],
  },
  {
    key: "status",
    snake: "status",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[14],
    tokens: ["status", "attendancestatus", "attstatus"],
  },
  {
    key: "earlyArrival",
    snake: "early_arrival",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[15],
    tokens: ["earlyarrival", "earlyin", "early"],
  },
  {
    key: "shiftLate",
    snake: "shift_late",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[16],
    tokens: ["shiftlate", "late", "lateness"],
  },
  {
    key: "shiftEarly",
    snake: "shift_early",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[17],
    tokens: ["shiftearly", "earlyout"],
  },
  {
    key: "excessLunch",
    snake: "excess_lunch",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[18],
    tokens: ["excesslunch", "lunchexcess", "extralunch"],
  },
  {
    key: "ot",
    snake: "ot",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[19],
    tokens: ["ot", "othours", "otshift"],
  },
  {
    key: "overtimeAmount",
    snake: "overtime_amount",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[20],
    tokens: ["overtimeamount", "overtime", "overtimehours", "othr"],
  },
  {
    key: "overStay",
    snake: "over_stay",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[21],
    tokens: ["overstay", "overstayhours", "stayover"],
  },
  {
    key: "manual",
    snake: "manual",
    exactLabel: BIOMETRIC_GRID_HEADER_LABELS[22],
    tokens: ["manual", "manualentry", "manualmark", "remark", "remarks"],
  },
];

function tokenMatchesHeader(token: string, headerFuzzy: string, headerLower: string): boolean {
  if (!token || !headerFuzzy) return false;

  const tokenLower = token.toLowerCase();

  if (headerFuzzy === tokenLower) return true;
  if (headerLower === tokenLower) return true;

  if (tokenLower.length <= 3) {
    return headerFuzzy === tokenLower;
  }

  return (
    headerFuzzy === tokenLower ||
    headerFuzzy.startsWith(tokenLower) ||
    headerFuzzy.endsWith(tokenLower) ||
    headerFuzzy.includes(tokenLower)
  );
}

function patternMatchesHeader(
  pattern: BulkHeaderPattern,
  headerFuzzy: string,
  headerLower: string
): boolean {
  const exactFuzzy = fuzzyHeaderToken(pattern.exactLabel);
  const exactLower = normalizeHeaderKey(pattern.exactLabel);

  if (headerFuzzy === exactFuzzy || headerLower === exactLower) return true;

  for (const token of pattern.tokens) {
    if (tokenMatchesHeader(token, headerFuzzy, headerLower)) return true;
  }
  if (tokenMatchesHeader(pattern.snake.replace(/_/g, ""), headerFuzzy, headerLower)) {
    return true;
  }
  if (tokenMatchesHeader(pattern.key.toLowerCase(), headerFuzzy, headerLower)) {
    return true;
  }
  return false;
}

/** Map normalized Excel headers to canonical biometric column keys. */
export function buildHeaderColumnMap(
  headers: string[]
): Partial<Record<BiometricColumnKey, number>> {
  const map: Partial<Record<BiometricColumnKey, number>> = {};
  try {
    const sortedPatterns = [...BULK_HEADER_FUZZY_PATTERNS].sort(
      (left, right) =>
        Math.max(...right.tokens.map((token) => token.length), right.exactLabel.length) -
        Math.max(...left.tokens.map((token) => token.length), left.exactLabel.length)
    );

    headers.forEach((header, index) => {
      const headerLower = normalizeHeaderKey(header);
      const headerFuzzy = fuzzyHeaderToken(header);
      if (!headerLower && !headerFuzzy) return;

      for (const pattern of sortedPatterns) {
        if (map[pattern.key] != null) continue;
        if (patternMatchesHeader(pattern, headerFuzzy, headerLower)) {
          map[pattern.key] = index;
          break;
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
  return map;
}

function safeCell(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

/** Build a biometric record from a row using header column mapping. */
export function bulkRecordFromHeaderMap(
  rawRow: unknown,
  columnMap: Partial<Record<BiometricColumnKey, number>>,
  defaultDate?: string
): Biometric23ColumnRecord {
  try {
    const cells = Array.isArray(rawRow) ? rawRow : [];
    const partial: Partial<Biometric23ColumnRecord> = {};

    for (const pattern of BULK_HEADER_FUZZY_PATTERNS) {
      const index = columnMap[pattern.key];
      if (index == null || index < 0) continue;
      partial[pattern.key] = safeCell(cells[index]);
    }

    if (!partial.date) {
      partial.date = defaultDate || todayIsoDateString();
    }

    return normalizeBiometric23ColumnRecord(partial, { defaultDate });
  } catch (error) {
    console.error(error);
    return normalizeBiometric23ColumnRecord(null, { defaultDate });
  }
}

/** Normalize every key on a raw object for case-insensitive lookup. */
export function normalizeRawRowKeys(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  try {
    const source = raw ?? {};
    const normalized: Record<string, unknown> = { ...source };

    for (const [key, value] of Object.entries(source)) {
      const lower = normalizeHeaderKey(key);
      const fuzzy = fuzzyHeaderToken(key);
      if (lower) normalized[lower] = value;
      if (fuzzy) normalized[fuzzy] = value;
    }

    for (const pattern of BULK_HEADER_FUZZY_PATTERNS) {
      for (const [key, value] of Object.entries(source)) {
        const headerLower = normalizeHeaderKey(key);
        const headerFuzzy = fuzzyHeaderToken(key);
        if (!patternMatchesHeader(pattern, headerFuzzy, headerLower)) continue;
        normalized[pattern.key] = value;
        normalized[pattern.snake] = value;
        break;
      }
    }

    return normalized;
  } catch (error) {
    console.error(error);
    return {};
  }
}

export function countMappedHeaders(
  columnMap: Partial<Record<BiometricColumnKey, number>>
): number {
  return Object.keys(columnMap).length;
}

export function shouldUseHeaderMapping(
  columnMap: Partial<Record<BiometricColumnKey, number>>
): boolean {
  return countMappedHeaders(columnMap) >= 1;
}

/** Detect biometric header row index (e.g. row containing Srl No. + Pay Code). */
export function findBiometricHeaderRowIndex(matrix: string[][]): number {
  try {
    for (let index = 0; index < Math.min(matrix.length, 30); index += 1) {
      const row = matrix[index] ?? [];
      const collapsed = row.map((cell) => collapseHeaderWhitespace(cell));
      const fuzzyProbe = collapsed.map((cell) => fuzzyHeaderToken(cell)).join("|");
      const hasSrl = fuzzyProbe.includes("srlno") || fuzzyProbe.includes("srlnumber");
      const hasPayCode = fuzzyProbe.includes("paycode");
      const hasEmployeeName = fuzzyProbe.includes("employeename");
      if (hasSrl && hasPayCode && hasEmployeeName) return index;
    }
  } catch (error) {
    console.error(error);
  }
  return 0;
}

/** Extract attendance date from report title row e.g. "Daily Performance for 06/07/2026". */
export function extractReportDateFromMatrix(matrix: string[][]): string {
  try {
    for (let index = 0; index < Math.min(matrix.length, 10); index += 1) {
      const firstCell = collapseHeaderWhitespace(matrix[index]?.[0] ?? "");
      const match = firstCell.match(
        /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/
      );
      if (!match) continue;
      const day = match[1]!.padStart(2, "0");
      const month = match[2]!.padStart(2, "0");
      let year = match[3]!;
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error(error);
  }
  return new Date().toISOString().slice(0, 10);
}
