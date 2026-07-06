import {
  normalizeBiometric22ColumnRecord,
  type Biometric22ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export type BiometricColumnKey = keyof Biometric22ColumnRecord;

/** Strict lowercase header: `.toString().trim().toLowerCase()` */
export function normalizeHeaderKey(value: unknown): string {
  try {
    return String(value ?? "")
      .toString()
      .trim()
      .toLowerCase();
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
  tokens: string[];
};

/** Case-insensitive fuzzy patterns for all 22 biometric columns. */
export const BULK_HEADER_FUZZY_PATTERNS: BulkHeaderPattern[] = [
  {
    key: "serialNumber",
    snake: "srl_number",
    tokens: [
      "srlnumber",
      "srlno",
      "srl",
      "srno",
      "serialnumber",
      "serialno",
      "serial",
      "sno",
    ],
  },
  {
    key: "payCode",
    snake: "pay_code",
    tokens: ["paycode", "paycd", "pay", "empcode", "employeecode", "ecode"],
  },
  {
    key: "cardNumber",
    snake: "card_number",
    tokens: ["cardnumber", "cardno", "card", "cardid", "badge", "badgeno"],
  },
  {
    key: "employeeName",
    snake: "employee_name",
    tokens: [
      "employeename",
      "empname",
      "name",
      "staffname",
      "workername",
      "fullname",
    ],
  },
  {
    key: "department",
    snake: "department",
    tokens: ["department", "dept", "division"],
  },
  {
    key: "designation",
    snake: "designation",
    tokens: ["designations", "designation", "desig", "jobtitle", "title", "role"],
  },
  {
    key: "shift",
    snake: "shift",
    tokens: ["shift", "workshift", "shiftcode"],
  },
  {
    key: "start",
    snake: "start",
    tokens: ["start", "starttime", "shiftstart", "startin"],
  },
  {
    key: "in",
    snake: "in",
    tokens: ["in", "intime", "timein", "clockin", "punchin"],
  },
  {
    key: "lunchOut",
    snake: "lunch_out",
    tokens: ["lunchout", "lunchbreakout", "lout"],
  },
  {
    key: "lunchIn",
    snake: "lunch_in",
    tokens: ["lunchin", "lunchbreakin", "lin"],
  },
  {
    key: "out",
    snake: "out",
    tokens: ["out", "outtime", "timeout", "clockout", "punchout"],
  },
  {
    key: "hoursWorked",
    snake: "hours_worked",
    tokens: [
      "hoursworked",
      "hours",
      "workedhours",
      "totalhours",
      "duration",
      "workhours",
    ],
  },
  {
    key: "status",
    snake: "status",
    tokens: ["status", "attendancestatus", "attstatus", "presentstatus"],
  },
  {
    key: "earlyArrival",
    snake: "early_arrival",
    tokens: ["earlyarrival", "earlyin", "early"],
  },
  {
    key: "shiftLate",
    snake: "shift_late",
    tokens: ["shiftlate", "late", "lateness"],
  },
  {
    key: "shiftEarly",
    snake: "shift_early",
    tokens: ["shiftearly", "earlyout"],
  },
  {
    key: "excessLunch",
    snake: "excess_lunch",
    tokens: ["excesslunch", "lunchexcess", "extralunch"],
  },
  {
    key: "ot",
    snake: "ot",
    tokens: ["ot", "othours", "otshift"],
  },
  {
    key: "overtime",
    snake: "overtime",
    tokens: ["overtime", "overtimehours", "othr"],
  },
  {
    key: "overstay",
    snake: "overstay",
    tokens: ["overstay", "overstayhours", "stayover"],
  },
  {
    key: "manual",
    snake: "manual",
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
        Math.max(...right.tokens.map((token) => token.length)) -
        Math.max(...left.tokens.map((token) => token.length))
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
  columnMap: Partial<Record<BiometricColumnKey, number>>
): Biometric22ColumnRecord {
  try {
    const cells = Array.isArray(rawRow) ? rawRow : [];
    const partial: Partial<Biometric22ColumnRecord> = {};

    for (const pattern of BULK_HEADER_FUZZY_PATTERNS) {
      const index = columnMap[pattern.key];
      if (index == null || index < 0) continue;
      partial[pattern.key] = safeCell(cells[index]);
    }

    return normalizeBiometric22ColumnRecord(partial);
  } catch (error) {
    console.error(error);
    return normalizeBiometric22ColumnRecord(null);
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
  return countMappedHeaders(columnMap) >= 4;
}
