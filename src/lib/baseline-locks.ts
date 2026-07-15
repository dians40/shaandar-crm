/**
 * V18 Configuration Baseline Lock — permanent frozen multi-environment cloud state.
 * Do not modify seed counts, pipeline paths, or UI scroll patterns without
 * an explicit baseline version bump.
 *
 * Cloud sync: Codespaces-ready via `.devcontainer/devcontainer.json` + `cloud-workspace-paths.ts`.
 * Sequential gatekeeper: Layer 1 → Layer 2 → Layer 3 → Layer 4 (no skips).
 */

import {
  DEFAULT_DEPARTMENT_SEEDS,
  DEFAULT_DESIGNATION_SEEDS,
} from "@/types/general-settings";

export const BASELINE_VERSION = "V18" as const;

/** Online cloud sync architecture lock — GitHub Codespaces + remote repository ready. */
export const CLOUD_SYNC_ARCHITECTURE_VERSION = "V18" as const;
export const ONLINE_SYNC_ARCHITECTURE_LOCKED = true as const;

/** Locked department seed count (CHAIR MACHINE DAY → UNLOADING). */
export const LOCKED_DEPARTMENT_COUNT = 25 as const;

/** Locked designation seed count (ALL ROUNDER → N A). */
export const LOCKED_DESIGNATION_COUNT = 15 as const;

/** Uppercase department seeds — canonical source: general-settings.ts */
export const LOCKED_DEPARTMENTS = DEFAULT_DEPARTMENT_SEEDS;

/** Uppercase designation seeds — canonical source: general-settings.ts */
export const LOCKED_DESIGNATIONS = DEFAULT_DESIGNATION_SEEDS;

/** 4-layer attendance pipeline — frozen; do not modify without baseline bump. */
export const FROZEN_PIPELINE_PATHS = [
  "src/lib/attendance-pipeline-service.ts",
  "src/lib/pipeline-stage-*.ts",
  "src/app/api/v1/attendance/pipeline/**",
  "src/app/api/v1/attendance/workflow/**",
  "src/components/master-panel/attendance-control-center.tsx",
  "src/components/master-panel/attendance-staging-workflow-panel.tsx",
] as const;

/** Double-scrollbar table workspaces — preserve horizontal + vertical scroll split. */
export const DOUBLE_SCROLLBAR_COMPONENTS = [
  "src/components/master-panel/attendance-staging-workflow-panel.tsx",
  "src/components/master-panel/attendance-system-panel.tsx",
  "src/components/master-panel/employee-list.tsx",
  "src/components/master-panel/attendance-control-center.tsx",
] as const;

/** Master panel navigation registry — all modules must remain visible. */
export const MASTER_PANEL_NAV_REGISTRY = "src/constants/master-panel-modules.ts" as const;

export function assertBaselineSeeds(): void {
  if (LOCKED_DEPARTMENTS.length !== LOCKED_DEPARTMENT_COUNT) {
    throw new Error(
      `Baseline ${BASELINE_VERSION}: expected ${LOCKED_DEPARTMENT_COUNT} departments, got ${LOCKED_DEPARTMENTS.length}`
    );
  }
  if (LOCKED_DESIGNATIONS.length !== LOCKED_DESIGNATION_COUNT) {
    throw new Error(
      `Baseline ${BASELINE_VERSION}: expected ${LOCKED_DESIGNATION_COUNT} designations, got ${LOCKED_DESIGNATIONS.length}`
    );
  }
}

assertBaselineSeeds();
