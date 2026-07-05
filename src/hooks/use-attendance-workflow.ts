"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ATTENDANCE_WORKFLOW_STORAGE_KEY,
  PAYROLL_ATTENDANCE_TALLY_STORAGE_KEY,
} from "@/types/verification-workflow";
import {
  normalizeAttendanceWorkflowRecord,
  type AttendanceWorkflowRecord,
} from "@/types/attendance-workflow";

function readRecords(): AttendanceWorkflowRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTENDANCE_WORKFLOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<AttendanceWorkflowRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<AttendanceWorkflowRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeAttendanceWorkflowRecord(row));
  } catch {
    return [];
  }
}

function writeRecords(records: AttendanceWorkflowRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ATTENDANCE_WORKFLOW_STORAGE_KEY, JSON.stringify(records));
}

function readPayrollTally(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PAYROLL_ATTENDANCE_TALLY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function writePayrollTally(tally: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAYROLL_ATTENDANCE_TALLY_STORAGE_KEY, JSON.stringify(tally));
}

function tallyKey(employeeId: string, attendanceDate: string) {
  const month = attendanceDate.slice(0, 7);
  return `${employeeId}:${month}`;
}

export function useAttendanceWorkflow() {
  const [records, setRecords] = useState<AttendanceWorkflowRecord[]>([]);
  const [payrollTally, setPayrollTally] = useState<Record<string, number>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readRecords());
    setPayrollTally(readPayrollTally());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: AttendanceWorkflowRecord[]) => {
    setRecords(next);
    writeRecords(next);
  }, []);

  const syncFromApi = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/attendance/workflow");
      if (!response.ok) return;
      const payload = (await response.json()) as { records?: AttendanceWorkflowRecord[] };
      if (!Array.isArray(payload.records)) return;
      const normalized = payload.records.map((row) =>
        normalizeAttendanceWorkflowRecord(row)
      );
      const local = readRecords();
      const merged = new Map<string, AttendanceWorkflowRecord>();
      for (const row of [...local, ...normalized]) {
        merged.set(row.id, row);
      }
      persist(Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      // localStorage remains source of truth when API unavailable
    }
  }, [persist]);

  useEffect(() => {
    void syncFromApi();
    const interval = window.setInterval(() => {
      void syncFromApi();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [syncFromApi]);

  const ingestBiometricLog = useCallback(
    (input: {
      employeeId: string;
      employeeName: string;
      attendanceDate: string;
      punchIn: string;
      punchOut: string;
      id?: string;
    }) => {
      const now = new Date().toISOString();
      const record = normalizeAttendanceWorkflowRecord({
        id: input.id ?? `att-${Date.now()}`,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        attendanceDate: input.attendanceDate,
        punchIn: input.punchIn,
        punchOut: input.punchOut,
        assignedMachine: "",
        workflowStage: "pending_allocation",
        source: "webhook",
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readRecords()]);
      return record;
    },
    [persist]
  );

  const updateRecord = useCallback(
    (id: string, patch: Partial<AttendanceWorkflowRecord>) => {
      const next = readRecords().map((row) =>
        row.id === id
          ? normalizeAttendanceWorkflowRecord({
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

  const commitToPayrollTally = useCallback(
    (employeeId: string, attendanceDate: string) => {
      const key = tallyKey(employeeId, attendanceDate);
      const current = readPayrollTally();
      const next = { ...current, [key]: (current[key] ?? 0) + 1 };
      setPayrollTally(next);
      writePayrollTally(next);
    },
    []
  );

  return {
    records,
    payrollTally,
    isReady,
    ingestBiometricLog,
    updateRecord,
    commitToPayrollTally,
    syncFromApi,
  };
}
