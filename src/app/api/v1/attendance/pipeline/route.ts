import { NextResponse } from "next/server";
import {
  getApiAuthSession,
  requireLayer2PipelineGet,
  requireLayer2PipelinePost,
  requireLayer3PipelineGet,
  requireLayer3PipelinePost,
  requireLayer4PipelinePost,
} from "@/lib/api/auth-guard";
import { isLayer4SavedUser } from "@/types/auth-session";
import {
  approveStagingToWorkflow,
  commitWorkflowToSaved,
  fetchRowsByPipelineStage,
  gridRowsToStagingRows,
  gridRowsToWorkflowRecords,
  rejectPipelineRows,
  transitionPipelineStage,
  updatePipelineRowFields,
  persistSavedRow,
  persistSavedRows,
} from "@/lib/attendance-pipeline-service";
import { autoSyncDepartmentName } from "@/lib/department-master-sync";
import { isPipelineStage, PIPELINE_STAGES } from "@/types/attendance-pipeline";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stageParam = searchParams.get("stage")?.trim() ?? PIPELINE_STAGES.LAYER_2_STAGING;
    const layer2Error = await requireLayer2PipelineGet(stageParam);
    if (layer2Error) return layer2Error;
    const layer3Error = await requireLayer3PipelineGet(stageParam);
    if (layer3Error) return layer3Error;

    const session = await getApiAuthSession();
    if (isLayer4SavedUser(session)) {
      return NextResponse.json(
        { error: "Layer 4 users may only read saved records via biometric API." },
        { status: 403 }
      );
    }
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
    const layer2Error = await requireLayer2PipelinePost(body);
    if (layer2Error) return layer2Error;
    const layer3Error = await requireLayer3PipelinePost(body);
    if (layer3Error) return layer3Error;
    const layer4Error = await requireLayer4PipelinePost(body);
    if (layer4Error) return layer4Error;
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

    if (action === "reject-row" || action === "reject-rows") {
      const stageParam = String(body.stage ?? PIPELINE_STAGES.LAYER_2_STAGING);
      if (!isPipelineStage(stageParam)) {
        return NextResponse.json({ error: "Valid stage is required for rejection." }, { status: 400 });
      }
      const result = await rejectPipelineRows({ ids, stage: stageParam });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "update-department") {
      const department = String(body.department ?? "").trim();
      if (!department) {
        return NextResponse.json({ error: "department is required." }, { status: 400 });
      }
      const stageParam = String(body.stage ?? PIPELINE_STAGES.LAYER_2_STAGING);
      const stage = isPipelineStage(stageParam) ? stageParam : PIPELINE_STAGES.LAYER_2_STAGING;
      const result = await updatePipelineRowFields({ ids, stage, department });
      await autoSyncDepartmentName(department);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "update-designation") {
      const designation = String(body.designation ?? "").trim();
      if (!designation) {
        return NextResponse.json({ error: "designation is required." }, { status: 400 });
      }
      const stageParam = String(body.stage ?? PIPELINE_STAGES.LAYER_2_STAGING);
      const stage = isPipelineStage(stageParam) ? stageParam : PIPELINE_STAGES.LAYER_2_STAGING;
      const result = await updatePipelineRowFields({ ids, stage, designation });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "update-row-fields") {
      const stageParam = String(body.stage ?? "");
      if (!isPipelineStage(stageParam)) {
        return NextResponse.json({ error: "Valid stage is required." }, { status: 400 });
      }
      const result = await updatePipelineRowFields({
        ids,
        stage: stageParam,
        department: body.department ? String(body.department) : undefined,
        designation: body.designation ? String(body.designation) : undefined,
      });
      if (body.department) {
        await autoSyncDepartmentName(String(body.department));
      }
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "persist-saved-row") {
      const id = ids[0] ?? String(body.id ?? "");
      const result = await persistSavedRow(id);
      return NextResponse.json(result);
    }

    if (action === "persist-saved-rows") {
      const result = await persistSavedRows(ids);
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
