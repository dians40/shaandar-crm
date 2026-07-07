import { NextResponse } from "next/server";
import { fetchAttendanceDateCatalog } from "@/lib/attendance-date-catalog";
import { fetchLegacyAttendanceGridRows } from "@/lib/legacy-attendance-fetch";
import { mergeAttendanceGridRows } from "@/lib/legacy-attendance-grid-fusion";
import { fetchRowsByPipelineStage } from "@/lib/attendance-pipeline-service";
import { isPipelineStage, PIPELINE_STAGES } from "@/types/attendance-pipeline";

const MAX_MERGED_ROWS = 500;

/** Layer 4 — saved history grid. Only LAYER_4_SAVED rows (no staging/workflow leakage). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "300"), MAX_MERGED_ROWS);
    const date = searchParams.get("date")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const includeDates = searchParams.get("includeDates") === "1";
    const stageParam = searchParams.get("pipelineStage")?.trim() ?? PIPELINE_STAGES.LAYER_4_SAVED;
    const stage = isPipelineStage(stageParam) ? stageParam : PIPELINE_STAGES.LAYER_4_SAVED;

    const [biometricRows, legacyRows, availableDates] = await Promise.all([
      fetchRowsByPipelineStage(stage, { limit, date, search }),
      stage === PIPELINE_STAGES.LAYER_4_SAVED
        ? fetchLegacyAttendanceGridRows({ date, search, limit })
        : Promise.resolve([]),
      includeDates ? fetchAttendanceDateCatalog() : Promise.resolve(undefined),
    ]);

    const rows = mergeAttendanceGridRows(biometricRows, legacyRows).slice(0, MAX_MERGED_ROWS);

    return NextResponse.json({
      rows,
      meta: {
        biometricCount: biometricRows.length,
        legacyCount: legacyRows.length,
        mergedCount: rows.length,
        pipelineStage: stage,
      },
      availableDates,
    });
  } catch (error) {
    console.error("[attendance/biometric] GET failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load attendance records.",
        rows: [],
        meta: { biometricCount: 0, legacyCount: 0, mergedCount: 0 },
      },
      { status: 500 }
    );
  }
}
