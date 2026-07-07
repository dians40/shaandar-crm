import { NextResponse } from "next/server";
import { ensureAttendanceTablesSchema } from "@/lib/attendance-schema-ensure";
import {
  approveAllStaging,
  approveStagingRow,
  fetchStagingRows,
  insertStagingRows,
  transferApprovedToMaster,
  updateStagingEdit,
  upsertEveningStaging,
} from "@/lib/attendance-staging-service";
import {
  bulkRowToStagingPayload,
  parseStagingTimestamp,
  validateStagingRow,
} from "@/lib/attendance-staging-validator";
import { normalizeBiometric23ColumnRecord } from "@/types/attendance-bulk-import-row";

export async function GET(request: Request) {
  try {
    await ensureAttendanceTablesSchema();
    const { searchParams } = new URL(request.url);
    const shiftDate = searchParams.get("shiftDate")?.trim() || undefined;
    const status = searchParams.get("status")?.trim() || undefined;
    const rows = await fetchStagingRows({ shiftDate, status });
    const anomalyCount = rows.filter((r) => r.isAnomaly && r.status === "Pending").length;
    const editedCount = rows.filter((r) => r.editRemark && r.status === "Pending").length;
    return NextResponse.json({ rows, meta: { count: rows.length, anomalyCount, editedCount } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load staging rows.", rows: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureAttendanceTablesSchema();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "bulk-upload");
    const changedBy = String(body.changedBy ?? "Supervisor");

    if (action === "bulk-upload") {
      const rawRows = Array.isArray(body.rows) ? body.rows : [];
      const existingKeys = new Set<string>();
      const payloads: Record<string, unknown>[] = [];

      for (const raw of rawRows) {
        const row = normalizeBiometric23ColumnRecord(raw as Record<string, unknown>);
        const validation = validateStagingRow(row, existingKeys);
        const shiftKey = `${row.payCode}|${row.date}`;
        existingKeys.add(shiftKey);
        if (validation.isDuplicate) continue;
        const employeeId =
          raw && typeof raw === "object" && "employee_id" in raw
            ? String((raw as Record<string, unknown>).employee_id ?? "")
            : null;
        payloads.push(
          bulkRowToStagingPayload(row, employeeId || null, validation)
        );
      }

      const result = await insertStagingRows(payloads, {
        changedBy,
        remark: String(body.remark ?? "Step 1 — morning Excel upload"),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "edit") {
      const existingRows = await fetchStagingRows();
      const target = existingRows.find((r) => r.id === String(body.id));
      const date = target?.date ?? String(body.date ?? "");
      const correctedInRaw = body.correctedInTime ? String(body.correctedInTime) : null;
      const correctedOutRaw = body.correctedOutTime ? String(body.correctedOutTime) : null;
      const row = await updateStagingEdit({
        id: String(body.id),
        correctedInTime: correctedInRaw
          ? parseStagingTimestamp(date, correctedInRaw) ?? correctedInRaw
          : null,
        correctedOutTime: correctedOutRaw
          ? parseStagingTimestamp(date, correctedOutRaw) ?? correctedOutRaw
          : null,
        editRemark: String(body.editRemark ?? ""),
        changedBy,
      });
      return NextResponse.json({ ok: true, row });
    }

    if (action === "approve") {
      const row = await approveStagingRow({
        id: String(body.id),
        approvedBy: String(body.approvedBy ?? changedBy),
      });
      return NextResponse.json({ ok: true, row });
    }

    if (action === "approve-all") {
      const shiftDate = body.shiftDate ? String(body.shiftDate) : undefined;
      const pending = await fetchStagingRows({ shiftDate, status: "Pending" });
      const anomalyCount = pending.filter((r) => r.isAnomaly || r.editRemark).length;
      if (body.confirm !== true && anomalyCount > 0) {
        return NextResponse.json({
          ok: false,
          requiresConfirmation: true,
          anomalyCount,
          editedCount: pending.filter((r) => r.editRemark).length,
          message: `${anomalyCount} record(s) have anomalies or edits — confirm before bulk approve.`,
        });
      }
      const result = await approveAllStaging({
        shiftDate,
        approvedBy: String(body.approvedBy ?? changedBy),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "evening-upsert") {
      const rawRows = Array.isArray(body.rows) ? body.rows : [];
      const payloads = rawRows.map((raw) => {
        const row = normalizeBiometric23ColumnRecord(raw as Record<string, unknown>);
        const validation = validateStagingRow(row, new Set());
        return bulkRowToStagingPayload(
          row,
          body.employeeId ? String(body.employeeId) : null,
          validation
        );
      });
      const result = await upsertEveningStaging(payloads, changedBy);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "transfer") {
      const result = await transferApprovedToMaster({
        shiftDate: String(body.shiftDate),
        transferredBy: changedBy,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Staging action failed." },
      { status: 500 }
    );
  }
}
