"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createAutoProvisionedEmployee,
  detectPendingAutoEmployees,
  readAutoProvisionedEmployees,
  resolveImportEmployee,
  upsertAutoProvisionedEmployee,
  type PendingAutoEmployee,
} from "@/lib/attendance-auto-provision";
import {
  atomicFinalizeBulkDbPayload,
  buildBulkDbPayload,
  safeBulkNumeric,
} from "@/lib/attendance-bulk-payload-bridge";
import {
  bulkRecordToWorkflowFields,
  normalizeAttendanceDateIso,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import {
  finalizeImportRow,
  parseAttendanceImportFileSafe,
  PDF_UPLOAD_SUCCESS_TOKEN,
  type AttendanceImportRow,
} from "@/lib/attendance-import-parser";
import { bulkRecordHasContent } from "@/types/attendance-bulk-import-row";
import AttendanceBulkImportPreviewGrid from "./attendance-bulk-import-preview-grid";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import {
  BIOMETRIC_ATTENDANCE_GRID_COLUMNS,
  type BiometricAttendanceGridRow,
} from "@/types/biometric-attendance-grid";
import {
  mergeAttendanceGridRows,
  mapWorkflowRecordToGridRow,
} from "@/lib/legacy-attendance-grid-fusion";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type ImportPreviewState = {
  fileName: string;
  rows: AttendanceImportRow[];
  bulkRows: Biometric23ColumnRecord[];
  pendingNewEmployees: PendingAutoEmployee[];
  skippedRows: number;
  warnings: string[];
  alignmentInfo?: string;
  reportDate?: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  createdEmployees: number;
  errors: string[];
};

function mappedStatusFromRecord(record: {
  assignedMachine?: string;
}): import("@/types/manual-attendance-entry").ManualAttendanceStatus {
  try {
    const token = record.assignedMachine ?? "";
    if (token.includes("G11")) return "G11";
    return "DY1";
  } catch {
    return "DY1";
  }
}

function safeBulkNumericFromRecord(record: {
  assignedMachine?: string;
}): number {
  try {
    const token = record.assignedMachine ?? "";
    const match = token.match(/Overtime Amount:\s*([$0-9.]+)/i);
    if (match?.[1]) return safeBulkNumeric(match[1]);
    return 0;
  } catch {
    return 0;
  }
}

const BULK_SAVE_TIMEOUT_MS = 120_000;
const SEARCH_DEBOUNCE_MS = 300;

type AttendanceDateCatalogEntry = {
  date: string;
  biometricCount: number;
  legacyCount: number;
  totalCount: number;
};

type SaveSummary = {
  biometricSaved: number;
  workflowSaved: number;
  savedDate: string;
  fileName: string;
  savedLocallyOnly?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "failed";

function rowSelectionKey(row: BiometricAttendanceGridRow): string {
  return row.id || `${row.source}-${row.payCode}-${row.date}-${row.employeeName}`;
}

function mapApiGridRow(raw: Record<string, unknown>): BiometricAttendanceGridRow {
  const sourceRaw = String(raw.source ?? "biometric");
  const source = sourceRaw === "legacy" ? "legacy" : "biometric";
  return {
    id: String(raw.id ?? ""),
    source,
    srlNo: String(raw.srlNo ?? raw.srl_no ?? ""),
    payCode: String(raw.payCode ?? raw.pay_code ?? ""),
    cardNo: String(raw.cardNo ?? raw.card_no ?? ""),
    employeeName: String(raw.employeeName ?? raw.employee_name ?? ""),
    department: String(raw.department ?? ""),
    designation: String(raw.designation ?? ""),
    shift: String(raw.shift ?? ""),
    date: String(raw.date ?? ""),
    status: String(raw.status ?? ""),
    inTime: String(raw.inTime ?? raw.in_time ?? ""),
    outTime: String(raw.outTime ?? raw.out_time ?? ""),
    duration: String(raw.duration ?? ""),
    earlyIn: String(raw.earlyIn ?? raw.early_in ?? ""),
    lateIn: String(raw.lateIn ?? raw.late_in ?? ""),
    earlyOut: String(raw.earlyOut ?? raw.early_out ?? ""),
    lateOut: String(raw.lateOut ?? raw.late_out ?? ""),
    otHours: String(raw.otHours ?? raw.ot_hours ?? ""),
    shortHours: String(raw.shortHours ?? raw.short_hours ?? ""),
    grossHours: String(raw.grossHours ?? raw.gross_hours ?? ""),
    netHours: String(raw.netHours ?? raw.net_hours ?? ""),
    workCode: String(raw.workCode ?? raw.work_code ?? ""),
    remark: String(raw.remark ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

export default function AttendanceControlCenter() {
  const { employees, prependEmployee } = useEmployees();
  const { ingestManualEntry, records: workflowRecords, syncFromApi } = useAttendanceWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridSectionRef = useRef<HTMLElement>(null);

  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [selectedBulkRowIndex, setSelectedBulkRowIndex] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [gridRows, setGridRows] = useState<BiometricAttendanceGridRow[]>([]);
  const [gridMeta, setGridMeta] = useState({ biometricCount: 0, legacyCount: 0, mergedCount: 0 });
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [availableDates, setAvailableDates] = useState<AttendanceDateCatalogEntry[]>([]);
  const [lastSaveSummary, setLastSaveSummary] = useState<SaveSummary | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const resetPanelState = useCallback(() => {
    setImportPreview(null);
    setSelectedBulkRowIndex(0);
    setImportMessage(null);
    setImportError(null);
    setIsParsing(false);
    setIsProcessing(false);
    setIsDragging(false);
    setGridRows([]);
    setGridMeta({ biometricCount: 0, legacyCount: 0, mergedCount: 0 });
    setGridError(null);
    setFilterDate("");
    setSearchQuery("");
    setDebouncedSearch("");
    setAvailableDates([]);
    setLastSaveSummary(null);
    setSaveStatus("idle");
    setSelectedRowIds(new Set());
  }, []);

  useEffect(() => {
    fetch("/api/health/supabase")
      .then((response) => response.json())
      .then((health: { ok?: boolean }) => setDbConnected(Boolean(health.ok)))
      .catch(() => setDbConnected(false));
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadGridRows = useCallback(async (dateOverride?: string) => {
    setIsGridLoading(true);
    setGridError(null);
    try {
      await syncFromApi();

      const activeDate = dateOverride ?? filterDate;
      const params = new URLSearchParams({ limit: "300", includeDates: "1" });
      if (activeDate.trim()) {
        params.set("date", normalizeAttendanceDateIso(activeDate.trim()));
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      const response = await fetch(`/api/v1/attendance/biometric?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: Record<string, unknown>[];
        error?: string;
        meta?: { biometricCount?: number; legacyCount?: number; mergedCount?: number };
        availableDates?: AttendanceDateCatalogEntry[];
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load attendance records.");
      }

      const apiRows = Array.isArray(body.rows) ? body.rows.map(mapApiGridRow) : [];
      const normalizedFilterDate = activeDate.trim()
        ? normalizeAttendanceDateIso(activeDate.trim())
        : "";
      const searchToken = debouncedSearch.toLowerCase();

      const localLegacyRows = workflowRecords
        .filter((record) => {
          const recordDate = normalizeAttendanceDateIso(record.attendanceDate);
          if (normalizedFilterDate && recordDate !== normalizedFilterDate) return false;
          if (!searchToken) return true;
          return (
            record.employeeName.toLowerCase().includes(searchToken) ||
            record.employeeId.toLowerCase().includes(searchToken)
          );
        })
        .map(mapWorkflowRecordToGridRow);

      const biometricApiRows = apiRows.filter((row) => row.source === "biometric");
      const legacyApiRows = apiRows.filter((row) => row.source === "legacy");
      const mergedRows = mergeAttendanceGridRows(biometricApiRows, [
        ...legacyApiRows,
        ...localLegacyRows,
      ]);

      setGridRows(mergedRows);
      if (Array.isArray(body.availableDates)) {
        setAvailableDates(body.availableDates);
      }
      setGridMeta({
        biometricCount: body.meta?.biometricCount ?? apiRows.filter((r) => r.source === "biometric").length,
        legacyCount:
          (body.meta?.legacyCount ?? apiRows.filter((r) => r.source === "legacy").length) +
          localLegacyRows.length,
        mergedCount: mergedRows.length,
      });
    } catch (loadError) {
      console.error(loadError);
      setGridError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load attendance records."
      );
      setGridRows([]);
    } finally {
      setIsGridLoading(false);
    }
  }, [filterDate, debouncedSearch, syncFromApi, workflowRecords]);

  useEffect(() => {
    void loadGridRows();
  }, [loadGridRows]);

  const viewSavedDate = useCallback(
    (date: string) => {
      const normalized = normalizeAttendanceDateIso(date);
      setFilterDate(normalized);
      void loadGridRows(normalized);
      gridSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [loadGridRows]
  );

  const autoProvisionMissingEmployees = (
    rows: AttendanceImportRow[],
    registry: ReturnType<typeof readAutoProvisionedEmployees>
  ) => {
    const pending = detectPendingAutoEmployees(rows, employees, registry);
    let nextRegistry = registry;
    let createdCount = 0;

    for (const pendingEmployee of pending) {
      const created = createAutoProvisionedEmployee(
        pendingEmployee.employeeCode,
        pendingEmployee.employeeName
      );
      nextRegistry = upsertAutoProvisionedEmployee(created);
      prependEmployee(created);
      createdCount += 1;
    }

    return { pending, nextRegistry, createdCount };
  };

  const handleFileSelect = async (file: File) => {
    setImportMessage(null);
    setImportError(null);
    setSaveStatus("idle");
    setLastSaveSummary(null);
    setIsParsing(true);

    try {
      const outcome = await parseAttendanceImportFileSafe(file);

      if (outcome.pdfDocumentUploaded) {
        setImportPreview(null);
        setImportMessage(PDF_UPLOAD_SUCCESS_TOKEN);
        return;
      }

      const {
        rows: parsedRows,
        bulkRows: parsedBulkRows,
        skippedRows,
        warnings,
        alignmentInfo,
        reportDate,
      } = outcome;

      const sanitizedRows = Array.isArray(parsedRows)
        ? parsedRows.map((row) => finalizeImportRow(row))
        : [];
      const sanitizedBulkRows = Array.isArray(parsedBulkRows)
        ? parsedBulkRows.map((row) =>
            normalizeBiometric23ColumnRecord(row, { defaultDate: reportDate })
          )
        : [];

      if (sanitizedBulkRows.length === 0) {
        setImportPreview(null);
        setSelectedBulkRowIndex(0);
        setImportError(
          "No valid attendance rows found in the uploaded file. Check that the sheet contains employee data rows."
        );
        return;
      }

      const registry = readAutoProvisionedEmployees();
      const { pending: pendingNewEmployees, createdCount } =
        autoProvisionMissingEmployees(sanitizedRows, registry);

      setSelectedBulkRowIndex(0);
      setImportPreview({
        fileName: file.name,
        rows: sanitizedRows,
        bulkRows: sanitizedBulkRows,
        pendingNewEmployees,
        skippedRows,
        reportDate,
        alignmentInfo,
        warnings:
          createdCount > 0
            ? [
                ...warnings,
                `${createdCount} missing employee profile(s) were auto-created in this session.`,
              ]
            : warnings,
      });

      if (createdCount > 0) {
        setImportMessage(
          `${createdCount} new employee profile(s) were auto-provisioned from the uploaded sheet.`
        );
      }
    } catch (error) {
      console.error(error);
      setImportPreview(null);
      setImportError(
        "Upload processing completed safely, but no rows could be recovered from this file."
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processBulkImport = useCallback(async () => {
    if (!importPreview) return;

    setImportMessage(null);
    setImportError(null);
    setIsProcessing(true);
    setSaveStatus("saving");

    try {
      let registry = readAutoProvisionedEmployees();
      const result: ImportResult = {
        imported: 0,
        skipped: 0,
        createdEmployees: 0,
        errors: [],
      };

      for (const pending of importPreview.pendingNewEmployees) {
        const created = createAutoProvisionedEmployee(
          pending.employeeCode,
          pending.employeeName
        );
        registry = upsertAutoProvisionedEmployee(created);
        prependEmployee(created);
        result.createdEmployees += 1;
      }

      const bulkPayloadRows: Record<string, unknown>[] = [];

      for (const bulkRow of importPreview.bulkRows) {
        try {
          const safeBulk = normalizeBiometric23ColumnRecord(bulkRow, {
            defaultDate: importPreview.reportDate,
          });
          if (!bulkRecordHasContent(safeBulk)) {
            result.skipped += 1;
            continue;
          }
          const mapped = bulkRecordToWorkflowFields(safeBulk);
          const employeeCode = mapped.employeeCode.trim() || "TEMP_CODE";
          const employeeName = mapped.employeeName.trim() || "Unknown Worker";

          let employee = resolveImportEmployee(
            employeeCode,
            employeeName,
            employees,
            registry
          );

          if (!employee) {
            const created = createAutoProvisionedEmployee(employeeCode, employeeName);
            registry = upsertAutoProvisionedEmployee(created);
            prependEmployee(created);
            employee = created;
            result.createdEmployees += 1;
          }

          const dbPayload = atomicFinalizeBulkDbPayload(
            buildBulkDbPayload({
              row: safeBulk,
              employeeId: employee.id,
              attendanceDate: safeBulk.date || importPreview.reportDate || "",
            })
          );

          bulkPayloadRows.push({
            ...dbPayload,
            date: safeBulk.date || importPreview.reportDate || "",
            employee_id: employee.id,
            employee_name: employee.name,
            attendance_date:
              safeBulk.date || importPreview.reportDate || dbPayload.attendance_date,
          });
        } catch (rowError) {
          console.error(rowError);
          result.skipped += 1;
          result.errors.push(
            rowError instanceof Error ? rowError.message : "Row sanitization failed."
          );
        }
      }

      if (bulkPayloadRows.length === 0) {
        setImportError("No valid rows available for bulk submission.");
        setSaveStatus("failed");
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), BULK_SAVE_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch("/api/v1/attendance/workflow/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: bulkPayloadRows }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          throw new Error(
            "Bulk save timed out after 120 seconds. Please verify database connectivity and try again."
          );
        }
        throw fetchError;
      } finally {
        window.clearTimeout(timeoutId);
      }

      const body = (await response.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
        imported?: number;
        skipped?: number;
        provisionedEmployees?: number;
        errors?: string[];
        debug?: { cause?: string; receivedRows?: number };
        biometricSaved?: number;
        records?: Array<{
          id: string;
          employeeId: string;
          employeeName: string;
          attendanceDate: string;
          punchIn: string;
          punchOut: string;
          assignedMachine: string;
        }>;
      };

      if (!response.ok) {
        const detail = body.debug?.cause ? ` ${body.debug.cause}` : "";
        throw new Error((body.error ?? "Bulk attendance submission failed.") + detail);
      }

      const biometricSaved = body.biometricSaved ?? 0;
      const workflowSaved = body.imported ?? 0;
      const savedLocallyOnly = body.message?.toLowerCase().includes("locally") ?? false;

      if (biometricSaved === 0 && workflowSaved === 0 && bulkPayloadRows.length > 0) {
        const schemaHint =
          body.errors?.some((entry) => /schema cache|not find table/i.test(entry)) ??
          false;
        throw new Error(
          body.errors?.slice(0, 2).join(" · ") ||
            (schemaHint
              ? "Attendance tables are missing. Run supabase/migrations/011_ensure_attendance_tables.sql in Supabase SQL Editor, or npm run migrate:attendance."
              : "Save returned zero rows. Check Supabase connection and run migration 011_ensure_attendance_tables.sql.")
        );
      }

      result.imported = workflowSaved;
      result.skipped += body.skipped ?? 0;
      if (body.provisionedEmployees && body.provisionedEmployees > 0) {
        result.createdEmployees += body.provisionedEmployees;
      }
      if (Array.isArray(body.errors)) {
        result.errors.push(...body.errors);
      }

      for (const record of body.records ?? []) {
        try {
          if (!record?.id || !record.employeeId) continue;
          ingestManualEntry({
            id: record.id,
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            attendanceDate: record.attendanceDate,
            punchIn: record.punchIn,
            punchOut: record.punchOut ?? "",
            remarks: record.assignedMachine ?? "",
            status: mappedStatusFromRecord(record),
            overtimeHours: safeBulkNumericFromRecord(record),
          });
        } catch (entryError) {
          console.error(entryError);
        }
      }

      const savedDate = normalizeAttendanceDateIso(
        importPreview.reportDate ||
          importPreview.bulkRows[0]?.date ||
          new Date().toISOString().slice(0, 10)
      );

      setFilterDate(savedDate);
      setLastSaveSummary({
        biometricSaved,
        workflowSaved,
        savedDate,
        fileName: importPreview.fileName,
        savedLocallyOnly,
      });
      setSaveStatus("saved");

      setImportMessage(
        savedLocallyOnly
          ? `Saved ${biometricSaved} row(s) in browser session only — connect Supabase to persist permanently for ${savedDate}.`
          : `Saved ${biometricSaved} biometric row(s) and ${workflowSaved} workflow row(s) for ${savedDate}. Scroll down to view saved records.`
      );

      if (result.errors.length > 0) {
        setImportError(result.errors.slice(0, 3).join(" · "));
      }

      await syncFromApi();
      await loadGridRows(savedDate);
      gridSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bulk attendance processing failed.";
      setImportError(message);
      setSaveStatus("failed");
    } finally {
      setIsProcessing(false);
    }
  }, [employees, importPreview, ingestManualEntry, loadGridRows, prependEmployee, syncFromApi]);

  const handleBulkRowIndexChange = useCallback(
    (index: number) => {
      try {
        if (index == null || !Number.isFinite(index) || index < 0) return;
        if (!importPreview?.bulkRows?.length) return;
        if (index >= importPreview.bulkRows.length) return;
        setSelectedBulkRowIndex(index);
      } catch (error) {
        console.error(error);
      }
    },
    [importPreview?.bulkRows]
  );

  const handleBulkRowsChange = useCallback(
    (nextRows: Biometric23ColumnRecord[]) => {
      try {
        if (!importPreview) return;
        if (!Array.isArray(nextRows)) return;

        const bulkRows = nextRows.map((row) =>
          normalizeBiometric23ColumnRecord(row, { defaultDate: importPreview.reportDate })
        );
        setImportPreview((current) => {
          if (!current) return current;
          return { ...current, bulkRows };
        });
      } catch (error) {
        console.error(error);
      }
    },
    [importPreview]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFileSelect(file);
  };

  const uploadBusy = isParsing || isProcessing;

  const selectedRows = gridRows.filter((row) => selectedRowIds.has(rowSelectionKey(row)));

  const toggleRowSelection = (row: BiometricAttendanceGridRow) => {
    const key = rowSelectionKey(row);
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisibleRows = () => {
    setSelectedRowIds(new Set(gridRows.map((row) => rowSelectionKey(row))));
  };

  const clearRowSelection = () => setSelectedRowIds(new Set());

  const renderHistoryGrid = () => (
    <section
      ref={gridSectionRef}
      className="flex min-h-[420px] w-full min-w-0 flex-col gap-3"
      aria-label="Attendance history grid"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-corporate-text">Saved Upload Records</h3>
            <p className="text-xs text-corporate-muted">
              {filterDate
                ? `Showing records for ${normalizeAttendanceDateIso(filterDate)} — select rows to review or open the workflow panel below`
                : "Pick an uploaded date above to view your Excel sheet records, or browse all saved rows"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllVisibleRows}
            disabled={gridRows.length === 0}
            className="rounded-lg border border-corporate-border bg-white px-3 py-2 text-xs font-medium text-corporate-text hover:bg-corporate-bg"
          >
            Select All Visible
          </button>
          {selectedRowIds.size > 0 && (
            <button
              type="button"
              onClick={clearRowSelection}
              className="rounded-lg border border-corporate-border bg-white px-3 py-2 text-xs font-medium text-corporate-text hover:bg-corporate-bg"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3 text-sm text-corporate-text">
          <p className="font-semibold text-corporate-brand">
            {selectedRows.length} row(s) selected
          </p>
          <p className="mt-1 text-xs text-corporate-muted">
            Storage: <strong>biometric_attendance</strong> (Excel columns) and{" "}
            <strong>employee_attendance</strong> (workflow). Selected:{" "}
            {selectedRows
              .slice(0, 5)
              .map((row) => `${row.employeeName || row.payCode} (${row.date})`)
              .join(" · ")}
            {selectedRows.length > 5 ? " · …" : ""}
          </p>
        </div>
      )}

      <div
        className={cn(
          MASTER_LIST_TABLE_WRAPPER_CLASS,
          "workspace-table-scroll min-h-[360px] max-h-[calc(100vh-14rem)] w-full overflow-auto"
        )}
      >
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[2700px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Select</th>
              {BIOMETRIC_ATTENDANCE_GRID_COLUMNS.map((column) => (
                <th key={column.key} className={MASTER_LIST_HEADER_CELL_CLASS}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border bg-white">
            {isGridLoading ? (
              <tr>
                <td
                  colSpan={BIOMETRIC_ATTENDANCE_GRID_COLUMNS.length + 1}
                  className="px-3 py-10 text-center text-corporate-muted"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading attendance records...
                  </span>
                </td>
              </tr>
            ) : gridRows.length === 0 ? (
              <tr>
                <td
                  colSpan={BIOMETRIC_ATTENDANCE_GRID_COLUMNS.length + 1}
                  className="px-3 py-10 text-center text-sm text-corporate-muted"
                >
                  {filterDate
                    ? `No saved records for ${normalizeAttendanceDateIso(filterDate)}. Upload an Excel file for this date or pick another uploaded date above.`
                    : "No attendance records found. Upload an Excel file or choose an uploaded date chip above."}
                </td>
              </tr>
            ) : (
              gridRows.map((row) => {
                const key = rowSelectionKey(row);
                const isSelected = selectedRowIds.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      isSelected && "bg-corporate-brand-light/40",
                      row.source === "legacy" && !isSelected && "bg-amber-50/40",
                      row.source === "biometric" && !isSelected && "hover:bg-corporate-bg/40"
                    )}
                  >
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-center")}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(row)}
                        aria-label={`Select ${row.employeeName || row.payCode}`}
                        className="h-4 w-4 rounded border-corporate-border"
                      />
                    </td>
                    {BIOMETRIC_ATTENDANCE_GRID_COLUMNS.map((column) => {
                      const value = row[column.key] ?? "";
                      return (
                        <td
                          key={`${key}-${column.key}`}
                          className={cn(
                            MASTER_LIST_BODY_CELL_CLASS,
                            "whitespace-nowrap text-xs text-corporate-text",
                            (column.key === "shift" ||
                              column.key === "status" ||
                              column.key === "otHours") &&
                              "font-semibold text-corporate-brand"
                          )}
                        >
                          {value || "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              Attendance Control Center
            </h2>
            <p className="text-sm text-corporate-muted">
              Filter historical records, upload biometric exports, and review the unified attendance grid
            </p>
          </div>
        </div>
        {(isParsing || isProcessing) && (
          <div className="inline-flex items-center gap-2 rounded-full border border-corporate-brand/30 bg-corporate-brand-light px-3 py-1.5 text-xs font-medium text-corporate-brand">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {isParsing ? "Parsing file..." : "Saving records..."}
          </div>
        )}
      </div>

      {/* Mandatory filter bar — always rendered at top of workspace */}
      <section
        className="rounded-xl border-2 border-corporate-brand/25 bg-corporate-surface p-4 shadow-card"
        aria-label="Attendance filter controls"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-corporate-text">Filter & Search Controls</h3>
            <p className="text-xs text-corporate-muted">
              {isGridLoading
                ? "Loading attendance history..."
                : `${gridMeta.mergedCount} record(s) — ${gridMeta.legacyCount} legacy · ${gridMeta.biometricCount} biometric`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadGridRows()}
            disabled={isGridLoading}
            className="btn-secondary inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <RefreshCw
              className={cn("h-4 w-4", isGridLoading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label
            htmlFor="attendance-filter-date"
            className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            Attendance Date
            <input
              id="attendance-filter-date"
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-11 rounded-lg border border-corporate-border bg-white px-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
            />
          </label>

          <label
            htmlFor="attendance-filter-search"
            className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            Text Search
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
                aria-hidden
              />
              <input
                id="attendance-filter-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by Name or Pay Code..."
                className="h-11 w-full rounded-lg border border-corporate-border bg-white pl-9 pr-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
              />
            </div>
          </label>

          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate("")}
              className="h-11 rounded-lg border border-corporate-border bg-white px-4 text-sm font-medium text-corporate-text hover:bg-corporate-bg"
            >
              Clear Date
            </button>
          )}
        </div>

        {gridError && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {gridError}
          </p>
        )}

        {lastSaveSummary && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Last upload saved successfully</p>
            <p className="mt-1 text-xs">
              File: <strong>{lastSaveSummary.fileName}</strong> · Date:{" "}
              <strong>{lastSaveSummary.savedDate}</strong>
            </p>
            <p className="mt-1 text-xs">
              Saved to <strong>public.biometric_attendance</strong> (
              {lastSaveSummary.biometricSaved} rows) and{" "}
              <strong>public.employee_attendance</strong> workflow (
              {lastSaveSummary.workflowSaved} rows). Use the date chip below or the date picker to
              view them in the grid.
            </p>
          </div>
        )}

        {availableDates.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
              Uploaded Dates (click to view saved Excel records)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableDates.slice(0, 24).map((entry) => (
                <button
                  key={entry.date}
                  type="button"
                  onClick={() => setFilterDate(entry.date)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    filterDate === entry.date
                      ? "border-corporate-brand bg-corporate-brand text-white"
                      : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40"
                  )}
                >
                  {entry.date} · {entry.totalCount} rows
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Upload engine — choose file, preview, Process & Save */}
      <section className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
            <FileSpreadsheet className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-corporate-text">Excel Upload</h3>
            <p className="mt-1 text-xs text-corporate-muted">
              Upload biometric Daily Performance exports (.xls, .xlsx, .csv). Drag and drop or browse
              to ingest attendance records into the database.
            </p>
            {dbConnected === false && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Database not connected — Process &amp; Save will store rows in browser session only.
                Run <strong>npm run setup:supabase</strong> for permanent storage in{" "}
                <strong>biometric_attendance</strong>.
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            isDragging
              ? "border-corporate-brand bg-corporate-brand-light/50"
              : "border-corporate-border bg-corporate-bg",
            uploadBusy && "pointer-events-none opacity-70"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isParsing ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-corporate-brand" aria-hidden />
          ) : (
            <Upload className="mb-2 h-8 w-8 text-corporate-muted" aria-hidden />
          )}
          <p className="text-sm font-medium text-corporate-text">
            {isDragging ? "Drop file to upload" : "Drag and drop or select a file"}
          </p>
          <p className="mt-1 text-xs text-corporate-muted">Supported: .xlsx, .xls, .pdf, .csv</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-corporate-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <Upload className="h-4 w-4" aria-hidden />
            Choose File
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,.csv"
              className="sr-only"
              disabled={uploadBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileSelect(file);
              }}
            />
          </label>
        </div>

        {importPreview && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3">
              <div>
                <p className="text-sm font-bold text-corporate-brand">
                  {saveStatus === "saved"
                    ? `Saved: ${importPreview.bulkRows.length} row(s) for ${normalizeAttendanceDateIso(importPreview.reportDate || importPreview.bulkRows[0]?.date || "")}`
                    : `Ready to import: ${importPreview.bulkRows.length} row(s)`}
                </p>
                <p className="text-xs text-corporate-muted">
                  {importPreview.fileName} · Report date:{" "}
                  <strong>
                    {normalizeAttendanceDateIso(
                      importPreview.reportDate || importPreview.bulkRows[0]?.date || ""
                    )}
                  </strong>{" "}
                  · {importPreview.pendingNewEmployees.length} new employee(s) detected
                </p>
              </div>
              {saveStatus !== "saved" && (
                <button
                  type="button"
                  onClick={() => void processBulkImport()}
                  disabled={isProcessing}
                  className="btn-primary inline-flex h-11 min-h-[44px] items-center gap-2 px-5 text-sm"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  {isProcessing ? "Saving to database..." : "Process & Save"}
                </button>
              )}
            </div>

            {importPreview.alignmentInfo && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <p className="font-semibold">Column alignment</p>
                <p className="mt-1">{importPreview.alignmentInfo}</p>
              </div>
            )}

            <AttendanceBulkImportPreviewGrid
              rows={importPreview.bulkRows}
              selectedRowIndex={selectedBulkRowIndex}
              onSelectedRowIndexChange={handleBulkRowIndexChange}
              onRowsChange={handleBulkRowsChange}
            />
          </div>
        )}

        {importMessage && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {importMessage}
          </p>
        )}
        {importError && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {importError}
          </p>
        )}

        {(saveStatus === "saved" || lastSaveSummary) && lastSaveSummary && (
          <div className="mt-4 space-y-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Save complete — records stored for {lastSaveSummary.savedDate}
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  File: <strong>{lastSaveSummary.fileName}</strong>
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  {lastSaveSummary.savedLocallyOnly ? (
                    <>Browser session only — connect database for permanent storage.</>
                  ) : (
                    <>
                      <strong>public.biometric_attendance</strong>: {lastSaveSummary.biometricSaved}{" "}
                      rows · <strong>public.employee_attendance</strong>:{" "}
                      {lastSaveSummary.workflowSaved} workflow rows
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => viewSavedDate(lastSaveSummary.savedDate)}
                className="btn-primary inline-flex h-10 items-center gap-2 px-4 text-sm"
              >
                View saved records below
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Pick a saved date to open in the grid
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => viewSavedDate(lastSaveSummary.savedDate)}
                  className="rounded-full border border-emerald-400 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"
                >
                  {lastSaveSummary.savedDate} · just saved
                </button>
                {availableDates
                  .filter((entry) => entry.date !== lastSaveSummary.savedDate)
                  .slice(0, 12)
                  .map((entry) => (
                    <button
                      key={entry.date}
                      type="button"
                      onClick={() => viewSavedDate(entry.date)}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      {entry.date} · {entry.totalCount} rows
                    </button>
                  ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setImportPreview(null);
                setSaveStatus("idle");
                setImportMessage(null);
                setImportError(null);
              }}
              className="text-xs font-medium text-emerald-800 underline"
            >
              Upload another Excel file
            </button>
          </div>
        )}

        {saveStatus === "failed" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Save did not complete</p>
            <p className="mt-1 text-xs">
              Click <strong>Process &amp; Save</strong> again after checking the error above. If the
              database is not connected, run Supabase setup first.
            </p>
            <button
              type="button"
              onClick={() => void processBulkImport()}
              disabled={isProcessing}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-xs font-semibold text-white"
            >
              Retry Process &amp; Save
            </button>
          </div>
        )}
      </section>

      {renderHistoryGrid()}

      {/* Restored live verification workflow — original attendance operations screen */}
      <section className="space-y-4 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div>
          <h3 className="text-sm font-bold text-corporate-text">Live Attendance Workflow</h3>
          <p className="text-xs text-corporate-muted">
            Restored four-stage verification view — review uploaded biometric rows by employee,
            date, punch times, and machine assignment after Process &amp; Save
          </p>
        </div>
        <AttendanceSystemPanel />
      </section>

      <section className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <ManualAttendanceEntryPanel />
      </section>
    </div>
  );
}
