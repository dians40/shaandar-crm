import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import {
  isFullAccessUser,
  isLayer2StagingPipelineAction,
  isLayer2StagingStagingAction,
  isLayer2StagingUser,
  isLayer3WorkflowPipelineAction,
  isLayer3WorkflowUser,
  isLayer4SavedPipelineAction,
  isLayer4SavedUser,
  LAYER2_STAGING_PIPELINE_STAGE,
  LAYER3_WORKFLOW_PIPELINE_STAGE,
  LAYER4_SAVED_PIPELINE_STAGE,
  type AuthSessionPayload,
} from "@/types/auth-session";
import { isPipelineStage } from "@/types/attendance-pipeline";

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    },
    { status: 503 }
  );
}

export async function getApiAuthSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  return decodeAuthSession(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getApiAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireFullAccessUser(): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isFullAccessUser(session)) {
    return NextResponse.json(
      { error: "Access denied. Your role is restricted to your assigned attendance layer." },
      { status: 403 }
    );
  }
  return null;
}

export async function requireLayer2PipelineGet(stageParam: string): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer2StagingUser(session)) {
    return null;
  }

  if (stageParam !== LAYER2_STAGING_PIPELINE_STAGE) {
    return NextResponse.json(
      { error: "Layer 2 users may only read LAYER_2_STAGING pipeline records." },
      { status: 403 }
    );
  }
  return null;
}

export async function requireLayer3PipelineGet(stageParam: string): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer3WorkflowUser(session)) {
    return null;
  }

  if (stageParam !== LAYER3_WORKFLOW_PIPELINE_STAGE) {
    return NextResponse.json(
      { error: "Layer 3 users may only read LAYER_3_WORKFLOW pipeline records." },
      { status: 403 }
    );
  }
  return null;
}

export async function requireLayer2PipelinePost(
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer2StagingUser(session)) {
    return null;
  }

  const action = String(body.action ?? "approve-staging");
  if (!isLayer2StagingPipelineAction(action)) {
    return NextResponse.json(
      { error: `Layer 2 users cannot perform pipeline action: ${action}` },
      { status: 403 }
    );
  }

  const stageParam = String(body.stage ?? LAYER2_STAGING_PIPELINE_STAGE);
  const stage = isPipelineStage(stageParam) ? stageParam : LAYER2_STAGING_PIPELINE_STAGE;
  if (
    (action === "update-department" || action === "update-designation") &&
    stage !== LAYER2_STAGING_PIPELINE_STAGE
  ) {
    return NextResponse.json(
      { error: "Layer 2 users may only update rows at LAYER_2_STAGING." },
      { status: 403 }
    );
  }

  return null;
}

export async function requireLayer3PipelinePost(
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer3WorkflowUser(session)) {
    return null;
  }

  const action = String(body.action ?? "");
  if (!isLayer3WorkflowPipelineAction(action)) {
    return NextResponse.json(
      { error: `Layer 3 users cannot perform pipeline action: ${action}` },
      { status: 403 }
    );
  }

  const stageParam = String(body.stage ?? LAYER3_WORKFLOW_PIPELINE_STAGE);
  const stage = isPipelineStage(stageParam) ? stageParam : LAYER3_WORKFLOW_PIPELINE_STAGE;
  if (
    (action === "update-department" ||
      action === "update-designation" ||
      action === "update-row-fields") &&
    stage !== LAYER3_WORKFLOW_PIPELINE_STAGE
  ) {
    return NextResponse.json(
      { error: "Layer 3 users may only update rows at LAYER_3_WORKFLOW." },
      { status: 403 }
    );
  }

  return null;
}

export async function requireLayer4PipelinePost(
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer4SavedUser(session)) {
    return null;
  }

  const action = String(body.action ?? "");
  if (!isLayer4SavedPipelineAction(action)) {
    return NextResponse.json(
      { error: `Layer 4 users cannot perform pipeline action: ${action}` },
      { status: 403 }
    );
  }

  return null;
}

export async function requireLayer4BiometricGet(stageParam: string): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer4SavedUser(session)) {
    return null;
  }

  if (stageParam !== LAYER4_SAVED_PIPELINE_STAGE) {
    return NextResponse.json(
      { error: "Layer 4 users may only read LAYER_4_SAVED attendance records." },
      { status: 403 }
    );
  }
  return null;
}

export async function requireLayer2StagingPost(
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getApiAuthSession();
  if (!isLayer2StagingUser(session)) {
    return null;
  }

  const action = String(body.action ?? "");
  if (!isLayer2StagingStagingAction(action)) {
    return NextResponse.json(
      { error: `Layer 2 users cannot perform staging action: ${action}` },
      { status: 403 }
    );
  }

  return null;
}
