import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { ensureAttendanceTablesSchema } from "@/lib/attendance-schema-ensure";
import { prisma, isPrismaConfigured } from "@/lib/prisma";
import { INITIAL_INGEST_PIPELINE_STAGE } from "@/types/attendance-pipeline";
import { normalizeBiometricCode } from "@/types/manual-attendance-entry";

export const MANUAL_ENTRY_REMARK_PREFIX = "[MANUAL_ENTRY]";

export const MANUAL_WORKFLOW_STAGES = {
  PENDING_LAYER_2: "pending_layer_2",
  PENDING_LAYER_3: "pending_layer_3",
  PENDING_LAYER_4: "pending_layer_4",
  REJECTED: "rejected",
} as const;

export type ManualPipelineIngestInput = {
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  status: string;
  punchIn: string;
  punchOut?: string;
  remarks?: string;
  dailyWage?: number;
};

function isoToTimeToken(value: string): string {
  if (!value) return "";
  if (/^\d{1,2}:\d{2}/.test(value.trim())) return value.trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildManualPayCode(employeeId: string): string {
  return `MAN-${employeeId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function buildManualPipelineRow(input: ManualPipelineIngestInput): Record<string, unknown> {
  const payCode = buildManualPayCode(input.employeeId);
  const shift = normalizeBiometricCode(input.status);
  const remarkParts = [
    MANUAL_ENTRY_REMARK_PREFIX,
    input.remarks?.trim(),
    input.dailyWage && input.dailyWage > 0 ? `Daily Wage: ₹${input.dailyWage}` : "",
  ].filter(Boolean);

  return {
    pay_code: payCode,
    employee_name: input.employeeName.trim(),
    date: input.attendanceDate.slice(0, 10),
    shift,
    status: "Present",
    in_time: isoToTimeToken(input.punchIn),
    out_time: isoToTimeToken(input.punchOut ?? ""),
    duration: "",
    ot_hours: "0",
    gross_hours: "0",
    net_hours: "0",
    work_code: "MANUAL",
    remark: remarkParts.join(" · "),
    pipeline_stage: INITIAL_INGEST_PIPELINE_STAGE,
    workflow_stage: MANUAL_WORKFLOW_STAGES.PENDING_LAYER_2,
  };
}

export function isManualPipelineRemark(remark: string | null | undefined): boolean {
  return String(remark ?? "").includes(MANUAL_ENTRY_REMARK_PREFIX);
}

export async function ingestManualAttendanceToPipeline(
  input: ManualPipelineIngestInput
): Promise<{ id: string; payCode: string }> {
  const row = buildManualPipelineRow(input);

  if (isPrismaConfigured() && prisma) {
    await ensureAttendanceTablesSchema();
    const created = await prisma.biometricAttendance.upsert({
      where: {
        payCode_date: {
          payCode: String(row.pay_code),
          date: String(row.date),
        },
      },
      create: {
        payCode: String(row.pay_code),
        employeeName: String(row.employee_name),
        date: String(row.date),
        shift: String(row.shift),
        status: String(row.status),
        inTime: String(row.in_time),
        outTime: String(row.out_time),
        duration: String(row.duration),
        otHours: String(row.ot_hours),
        grossHours: String(row.gross_hours),
        netHours: String(row.net_hours),
        workCode: String(row.work_code),
        remark: String(row.remark),
        pipelineStage: INITIAL_INGEST_PIPELINE_STAGE,
        workflowStage: MANUAL_WORKFLOW_STAGES.PENDING_LAYER_2,
      },
      update: {
        employeeName: String(row.employee_name),
        shift: String(row.shift),
        inTime: String(row.in_time),
        outTime: String(row.out_time),
        remark: String(row.remark),
        pipelineStage: INITIAL_INGEST_PIPELINE_STAGE,
        workflowStage: MANUAL_WORKFLOW_STAGES.PENDING_LAYER_2,
      },
    });
    return { id: created.id, payCode: String(row.pay_code) };
  }

  if (isSupabaseServerConfigured()) {
    await ensureAttendanceTablesSchema();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("biometric_attendance")
      .upsert(row, { onConflict: "pay_code,date" })
      .select("id, pay_code")
      .single();
    if (error) throw new Error(error.message);
    return { id: String(data.id), payCode: String(data.pay_code) };
  }

  throw new Error("Database not configured — cannot queue manual entry for Layer 2 approval.");
}
