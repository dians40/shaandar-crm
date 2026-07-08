"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeOvertimeRecord,
  resolvePayrollTotalHours,
  type OvertimeRecord,
} from "@/types/overtime";
import {
  OVERTIME_PIPELINE_STAGES,
  type OvertimePipelineStage,
} from "@/types/overtime-pipeline";
import type { VerificationStage } from "@/types/verification-workflow";

const STORAGE_KEY = "shaandar-crm-overtime";

function mapPipelineToWorkflow(stage: OvertimePipelineStage): VerificationStage {
  if (stage === OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW) return "operator_verification";
  if (stage === OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED) return "finalized";
  return "pending_allocation";
}

function readOvertimeRecords(): OvertimeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<OvertimeRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<OvertimeRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeOvertimeRecord(row));
  } catch {
    return [];
  }
}

function writeOvertimeRecords(records: OvertimeRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useOvertimeRecords() {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readOvertimeRecords());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: OvertimeRecord[]) => {
    setRecords(next);
    writeOvertimeRecords(next);
  }, []);

  const addRecord = useCallback(
    (
      input: Omit<OvertimeRecord, "id" | "totalHours" | "createdAt" | "updatedAt">
    ) => {
      const now = new Date().toISOString();
      const totalHours = resolvePayrollTotalHours({
        shiftType: input.shiftType,
        fromTime: input.fromTime,
        toTime: input.toTime,
      });
      const record: OvertimeRecord = normalizeOvertimeRecord({
        ...input,
        id: `ot-${Date.now()}`,
        totalHours,
        pipelineStage: input.pipelineStage ?? OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING,
        workflowStage: input.workflowStage ?? "pending_allocation",
        paymentStatus: input.paymentStatus ?? "due",
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readOvertimeRecords()]);
      return record;
    },
    [persist]
  );

  const updateRecord = useCallback(
    (
      id: string,
      input: Omit<OvertimeRecord, "id" | "totalHours" | "createdAt" | "updatedAt">
    ) => {
      const next = readOvertimeRecords().map((row) =>
        row.id === id
          ? normalizeOvertimeRecord({
              ...row,
              ...input,
              id: row.id,
              totalHours: resolvePayrollTotalHours({
                shiftType: input.shiftType,
                fromTime: input.fromTime,
                toTime: input.toTime,
              }),
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [persist]
  );

  const patchRecord = useCallback(
    (id: string, patch: Partial<OvertimeRecord>) => {
      const next = readOvertimeRecords().map((row) =>
        row.id === id
          ? normalizeOvertimeRecord({
              ...row,
              ...patch,
              id: row.id,
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [persist]
  );

  const transitionPipelineStage = useCallback(
    (id: string, pipelineStage: OvertimePipelineStage, extra: Partial<OvertimeRecord> = {}) => {
      patchRecord(id, {
        pipelineStage,
        workflowStage: mapPipelineToWorkflow(pipelineStage),
        ...extra,
      });
    },
    [patchRecord]
  );

  const approveLayer2ToLayer3 = useCallback(
    (id: string, approvedBy = "Layer 2 Reviewer") => {
      transitionPipelineStage(id, OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW, {
        operatorVerifiedAt: new Date().toISOString(),
        operatorVerifiedBy: approvedBy,
      });
    },
    [transitionPipelineStage]
  );

  const approveLayer3ToLayer4 = useCallback(
    (id: string, approvedBy = "Layer 3 Reviewer") => {
      transitionPipelineStage(id, OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED, {
        supervisorApprovedAt: new Date().toISOString(),
        supervisorApprovedBy: approvedBy,
        paymentStatus: "due",
      });
    },
    [transitionPipelineStage]
  );

  const rejectPipelineRow = useCallback(
    (id: string) => {
      const next = readOvertimeRecords().filter((row) => row.id !== id);
      persist(next);
    },
    [persist]
  );

  const commitToLedger = useCallback(
    (id: string, committedBy = "Layer 4 Commit") => {
      patchRecord(id, {
        pipelineStage: OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED,
        workflowStage: "finalized",
        paymentStatus: "due",
        supervisorApprovedAt: new Date().toISOString(),
        supervisorApprovedBy: committedBy,
      });
    },
    [patchRecord]
  );

  const markAsPaid = useCallback(
    (id: string) => {
      patchRecord(id, { paymentStatus: "paid" });
    },
    [patchRecord]
  );

  return {
    records,
    isReady,
    addRecord,
    updateRecord,
    patchRecord,
    transitionPipelineStage,
    approveLayer2ToLayer3,
    approveLayer3ToLayer4,
    rejectPipelineRow,
    commitToLedger,
    markAsPaid,
  };
}
