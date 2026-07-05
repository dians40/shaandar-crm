import { NextResponse } from "next/server";

const ATTENDANCE_TOKEN_ENV = "ATTENDANCE_SYNC_API_TOKEN";

export function validateAttendanceSyncToken(request: Request): NextResponse | null {
  const configuredToken = process.env[ATTENDANCE_TOKEN_ENV]?.trim();
  if (!configuredToken) {
    return NextResponse.json(
      {
        error:
          "Attendance sync is not configured. Set ATTENDANCE_SYNC_API_TOKEN in your deployment environment.",
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
  const providedToken = bearerMatch?.[1]?.trim() ?? "";

  if (!providedToken || providedToken !== configuredToken) {
    return NextResponse.json({ error: "Invalid or missing API authentication token." }, { status: 401 });
  }

  return null;
}

export function parseAttendanceSyncBody(body: unknown): {
  employeeId: string;
  punchIn: string;
  punchOut: string;
} | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const employeeId = String(record.employee_id ?? record.employeeId ?? "").trim();
  const punchIn = String(record.punch_in ?? record.punchIn ?? "").trim();
  const punchOut = String(record.punch_out ?? record.punchOut ?? "").trim();

  if (!employeeId) return { error: "employee_id is required." };
  if (!punchIn) return { error: "punch_in is required." };

  const punchInDate = new Date(punchIn);
  if (Number.isNaN(punchInDate.getTime())) {
    return { error: "punch_in must be a valid ISO datetime." };
  }

  if (punchOut) {
    const punchOutDate = new Date(punchOut);
    if (Number.isNaN(punchOutDate.getTime())) {
      return { error: "punch_out must be a valid ISO datetime when provided." };
    }
  }

  return { employeeId, punchIn, punchOut };
}

export function attendanceDateFromPunchIn(punchIn: string): string {
  return new Date(punchIn).toISOString().slice(0, 10);
}
