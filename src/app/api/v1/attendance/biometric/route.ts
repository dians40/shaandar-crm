import { NextResponse } from "next/server";
import {
  getApiAuthSession,
  requireAuth,
  requireFullAccessUser,
  requireLayer4BiometricGet,
} from "@/lib/api/auth-guard";
import { fetchAttendanceDateCatalog } from "@/lib/attendance-date-catalog";
import { fetchRowsByPipelineStage } from "@/lib/attendance-pipeline-service";
import { isLayer4SavedUser } from "@/types/auth-session";
import { isPipelineStage, PIPELINE_STAGES } from "@/types/attendance-pipeline";

const MAX_MERGED_ROWS = 500;

/** Layer 4 — saved history grid. Only LAYER_4_SAVED biometric rows (no legacy/workflow leakage). */
export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "300"), MAX_MERGED_ROWS);
    const date = searchParams.get("date")?.trim() || undefined;
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const includeDates = searchParams.get("includeDates") === "1";
    const stageParam = searchParams.get("pipelineStage")?.trim() ?? PIPELINE_STAGES.LAYER_4_SAVED;
    const stage = isPipelineStage(stageParam) ? stageParam : PIPELINE_STAGES.LAYER_4_SAVED;

    const session = await getApiAuthSession();
    if (isLayer4SavedUser(session)) {
      const layer4Error = await requireLayer4BiometricGet(stage);
      if (layer4Error) return layer4Error;
    } else {
      const fullAccessError = await requireFullAccessUser();
      if (fullAccessError) return fullAccessError;
    }

    const [biometricRows, availableDates] = await Promise.all([
      fetchRowsByPipelineStage(stage, { limit, date, fromDate, toDate, search }),
      includeDates ? fetchAttendanceDateCatalog() : Promise.resolve(undefined),
    ]);

    const rows = biometricRows.slice(0, MAX_MERGED_ROWS);

    return NextResponse.json({
      rows,
      meta: {
        biometricCount: biometricRows.length,
        legacyCount: 0,
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
