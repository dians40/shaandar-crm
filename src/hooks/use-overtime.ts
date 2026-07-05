"use client";

import { useCallback, useEffect, useState } from "react";
import {
  calculateOvertimeHours,
  normalizeOvertimeRecord,
  type OvertimeRecord,
} from "@/types/overtime";
import type { VerificationStage } from "@/types/verification-workflow";

const STORAGE_KEY = "shaandar-crm-overtime";

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
      const record: OvertimeRecord = {
        ...input,
        id: `ot-${Date.now()}`,
        totalHours: calculateOvertimeHours(input.fromTime, input.toTime),
        workflowStage: input.workflowStage ?? "pending_allocation",
        paymentStatus: input.paymentStatus ?? "due",
        createdAt: now,
        updatedAt: now,
      };
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
          ? {
              ...row,
              ...input,
              totalHours: calculateOvertimeHours(input.fromTime, input.toTime),
              updatedAt: new Date().toISOString(),
            }
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

  const transitionStage = useCallback(
    (
      id: string,
      workflowStage: VerificationStage,
      extra: Partial<OvertimeRecord> = {}
    ) => {
      patchRecord(id, { workflowStage, ...extra });
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
    transitionStage,
    markAsPaid,
  };
}
