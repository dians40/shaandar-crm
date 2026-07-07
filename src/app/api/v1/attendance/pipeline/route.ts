import { NextResponse } from "next/server";
import {
  approveStagingToWorkflow,
  commitWorkflowToSaved,
  fetchRowsByPipelineStage,
  gridRowsToStagingRows,
  gridRowsToWorkflowRecords,
  transitionPipelineStage,
  updateStagingDepartment,
} from "@/lib/attendance-pipeline-service";
import { isPipelineStage, PIPELINE_STAGES } from "@/types/attendance-pipeline";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stageParam = searchParams.get("stage")?.trim() ?? PIPELINE_STAGES.LAYER_2_STAGING;
    if (!isPipelineStage(stageParam)) {
      return NextResponse.json({ error: `Invalid stage: ${stageParam}` }, { status: 400 });
    }

    const limit = Math.min(Number(searchParams.get("limit") ?? "500"), 500);
    const date = searchParams.get("date")?.trim() || undefined;
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const format = searchParams.get("format")?.trim() ?? "grid";

    const rows = await fetchRowsByPipelineStage(stageParam, {
      limit,
      date,
      fromDate,
      toDate,
      search,
    });

    if (format === "staging") {
      return NextResponse.json({ rows: gridRowsToStagingRows(rows), meta: { count: rows.length, stage: stageParam } });
    }
    if (format === "workflow") {
      return NextResponse.json({
        records: gridRowsToWorkflowRecords(rows),
        meta: { count: rows.length, stage: stageParam },
      });
    }

    return NextResponse.json({ rows, meta: { count: rows.length, stage: stageParam } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline fetch failed.", rows: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "approve-staging");
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];

    if (action === "approve-staging" || action === "approve-all-staging") {
      const result = await approveStagingToWorkflow(ids);
      return NextResponse.json({ ok: true, ...result, toStage: PIPELINE_STAGES.LAYER_3_WORKFLOW });
    }

    if (action === "commit-workflow" || action === "commit-all-workflow") {
      const result = await commitWorkflowToSaved(ids);
      return NextResponse.json({ ok: true, ...result, toStage: PIPELINE_STAGES.LAYER_4_SAVED });
    }

    if (action === "update-department") {
      const department = String(body.department ?? "").trim();
      if (!department) {
        return NextResponse.json({ error: "department is required." }, { status: 400 });
      }
      const result = await updateStagingDepartment(ids, department);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "transition") {
      const from = String(body.from ?? "");
      const to = String(body.to ?? "");
      if (!isPipelineStage(from) || !isPipelineStage(to)) {
        return NextResponse.json({ error: "Invalid from/to pipeline stage." }, { status: 400 });
      }
      const result = await transitionPipelineStage({ ids, from, to });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline action failed." },
      { status: 500 }
    );
  }
}
