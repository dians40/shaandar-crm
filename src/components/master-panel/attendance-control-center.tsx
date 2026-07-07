"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
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
  ATTENDANCE_BULK_IMPORT_COLUMNS,
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
import AttendanceUploadRecordModule from "./attendance-upload-record-module";
import AttendanceStagingWorkflowPanel from "./attendance-staging-workflow-panel";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
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
import { gridRowToUploadRecord } from "@/lib/attendance-upload-record-mapper";

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
  storageFallback?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "failed";

type SchemaStatus = "checking" | "ready" | "missing" | "ensuring" | "storage";

function isSchemaSetupError(message: string): boolean {
  return /schema cache|not find table|setuprequired|SUPABASE_DB_PASSWORD|DATABASE_URL|503/i.test(
    message
  );
}

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
  const stagingSectionRef = useRef<HTMLDivElement>(null);
  const pendingSaveAfterSchemaRef = useRef(false);

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
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus>("checking");
  const [schemaMessage, setSchemaMessage] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [stagingRefreshToken, setStagingRefreshToken] = useState(0);

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
    setSchemaStatus("checking");
    setSchemaMessage(null);
    setSelectedRowIds(new Set());
  }, []);

  const ensureAttendanceSchema = useCallback(async (): Promise<boolean> => {
    if (dbConnected === false) {
      setSchemaStatus("ready");
      setSchemaMessage(null);
      return true;
    }

    setSchemaStatus((current) => (current === "ready" ? current : "ensuring"));
    try {
      const response = await fetch("/api/v1/attendance/schema/ensure", {
        method: "POST",
      });
      const body = (await response.json()) as {
        ok?: boolean;
        ready?: boolean;
        mode?: "sql" | "storage" | "local" | "none";
        message?: string;
        hint?: string;
        error?: string;
      };

      if (response.ok && body.ok) {
        if (body.mode === "storage") {
          setSchemaStatus("storage");
          setSchemaMessage(
            body.message ??
              "Cloud storage is ready — Process & Save works without SQL tables."
          );
        } else {
          setSchemaStatus("ready");
          setSchemaMessage(null);
        }
        return true;
      }

      setSchemaStatus("missing");
      setSchemaMessage(body.hint ?? body.error ?? body.message ?? "Attendance tables are not set up.");
      return false;
    } catch (error) {
      console.error("[attendance] schema ensure failed:", error);
      setSchemaStatus("missing");
      setSchemaMessage(
        "Could not verify attendance schema. Run npm run setup:supabase or npm run migrate:attendance."
      );
      return false;
    }
  }, [dbConnected]);

  useEffect(() => {
    fetch("/api/health/supabase")
      .then((response) => response.json())
      .then((health: { ok?: boolean }) => setDbConnected(Boolean(health.ok)))
      .catch(() => setDbConnected(false));
  }, []);

  useEffect(() => {
    if (dbConnected === null) return;
    void ensureAttendanceSchema();
  }, [dbConnected, ensureAttendanceSchema]);

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

  const scrollToLayer = useCallback((layer: 1 | 2 | 3 | 4) => {
    const targetId =
      layer === 1
        ? "attendance-layer-1"
        : layer === 2
          ? "attendance-layer-2"
          : layer === 3
            ? "attendance-layer-3"
            : "attendance-layer-4";
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

      const stagingResponse = await fetch("/api/v1/attendance/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-upload",
          rows: bulkPayloadRows,
          changedBy: "Supervisor",
          remark: `Step 1 upload — ${importPreview.fileName}`,
        }),
      });
      const stagingBody = (await stagingResponse.json()) as {
        ok?: boolean;
        saved?: number;
        error?: string;
      };
      if (!stagingResponse.ok) {
        throw new Error(stagingBody.error ?? "Failed to save to attendance_staging.");
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
        hint?: string;
        setupRequired?: boolean;
        storageFallback?: boolean;
        savedReportDate?: string;
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
        const failureMessage = (body.error ?? "Bulk attendance submission failed.") + detail;

        if (response.status === 503 || body.setupRequired || isSchemaSetupError(failureMessage)) {
          pendingSaveAfterSchemaRef.current = true;
          setSchemaStatus("missing");
          setSchemaMessage(body.hint ?? body.error ?? failureMessage);
          void ensureAttendanceSchema();
        }

        throw new Error(failureMessage);
      }

      const biometricSaved = body.biometricSaved ?? 0;
      const workflowSaved = body.imported ?? 0;
      const savedViaStorage = body.storageFallback === true;
      const savedLocallyOnly =
        !savedViaStorage && (body.message?.toLowerCase().includes("locally") ?? false);

      if (biometricSaved === 0 && workflowSaved === 0 && bulkPayloadRows.length > 0) {
        const schemaErrors =
          body.errors?.filter((entry) => isSchemaSetupError(entry)) ?? [];
        const schemaFailure =
          schemaErrors.slice(0, 2).join(" · ") ||
          body.errors?.slice(0, 2).join(" · ") ||
          "Save did not complete — no rows were persisted. Check Supabase connection and retry.";

        if (isSchemaSetupError(schemaFailure)) {
          pendingSaveAfterSchemaRef.current = true;
          setSchemaStatus("missing");
          setSchemaMessage(schemaFailure);
          void ensureAttendanceSchema();
        }

        throw new Error(schemaFailure);
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
        body.savedReportDate ||
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
        storageFallback: savedViaStorage,
      });
      setSaveStatus("saved");
      if (savedViaStorage) {
        setSchemaStatus("storage");
        setSchemaMessage(
          "Saved to Supabase cloud storage. Records appear in the grid below by date."
        );
      }

      setImportMessage(
        savedViaStorage
          ? `Saved ${biometricSaved} row(s) to server cloud storage for ${savedDate}. Staging cleared — view records below.`
          : savedLocallyOnly
            ? `Saved ${biometricSaved} row(s) in browser session for ${savedDate}. Staging cleared.`
            : `Saved ${biometricSaved} row(s) to server for ${savedDate}. Staging cleared — view Saved Upload Records below.`
      );

      setImportPreview(null);
      setSelectedBulkRowIndex(0);
      setSaveStatus("idle");

      if (result.errors.length > 0) {
        setImportError(result.errors.slice(0, 3).join(" · "));
      }

      await syncFromApi();
      await loadGridRows(savedDate);
      setStagingRefreshToken((token) => token + 1);
      stagingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bulk attendance processing failed.";
      setImportError(message);
      setSaveStatus("failed");
    } finally {
      setIsProcessing(false);
    }
  }, [employees, importPreview, ingestManualEntry, loadGridRows, prependEmployee, syncFromApi, ensureAttendanceSchema]);

  useEffect(() => {
    if (
      (schemaStatus !== "ready" && schemaStatus !== "storage") ||
      !pendingSaveAfterSchemaRef.current ||
      !importPreview
    ) {
      return;
    }
    pendingSaveAfterSchemaRef.current = false;
    void processBulkImport();
  }, [schemaStatus, importPreview, processBulkImport]);

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
      id="attendance-layer-4"
      className="flex min-h-[420px] w-full min-w-0 scroll-mt-28 flex-col gap-3"
      aria-label="Layer 4 — Attendance history grid"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-corporate-brand">
              Layer 4
            </p>
            <h3 className="text-sm font-bold text-corporate-text">Saved Upload Records</h3>
            <p className="text-xs text-corporate-muted">
              {filterDate
                ? `Server records for ${normalizeAttendanceDateIso(filterDate)} — same 22 columns as upload editor`
                : "Committed server records — pick a date above or upload and save from the editor module"}
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
              {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => (
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
                  colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length + 1}
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
                  colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length + 1}
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
                const uploadRecord = gridRowToUploadRecord(row);
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
                    {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => {
                      const value = uploadRecord[column.key] ?? "";
                      return (
                        <td
                          key={`${key}-${column.key}`}
                          className={cn(
                            MASTER_LIST_BODY_CELL_CLASS,
                            "whitespace-nowrap text-xs text-corporate-text",
                            (column.key === "shift" ||
                              column.key === "status" ||
                              column.key === "ot") &&
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
              Four-layer approval pipeline — upload, staging review, live workflow verification, then
              saved server records
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

      {dbConnected !== false && schemaStatus === "storage" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <div className="space-y-1 text-sm text-emerald-900">
              <p className="font-semibold">Cloud storage ready — Process &amp; Save is enabled</p>
              {schemaMessage && <p className="text-emerald-800">{schemaMessage}</p>}
              <p className="text-xs text-emerald-700">
                Upload Excel and click Process &amp; Save. Records are stored in Supabase cloud
                storage and appear in the grid below by date.
              </p>
            </div>
          </div>
        </div>
      )}

      {dbConnected !== false && schemaStatus !== "ready" && schemaStatus !== "storage" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-card">
          <div className="flex items-start gap-3">
            {schemaStatus === "ensuring" || schemaStatus === "checking" ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            )}
            <div className="space-y-2 text-sm text-amber-900">
              <p className="font-semibold">
                {schemaStatus === "ensuring" || schemaStatus === "checking"
                  ? "Preparing attendance database tables…"
                  : "Attendance tables missing — retrying cloud storage setup"}
              </p>
              {schemaMessage && (
                <p className="text-amber-800">{schemaMessage}</p>
              )}
              {schemaStatus === "missing" && (
                <>
                  <p className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-amber-950">
                    One-time fix: npm run setup:supabase
                  </p>
                  <p className="text-xs text-amber-800">
                    Or add <strong>SUPABASE_DB_PASSWORD</strong> to <code className="rounded bg-white px-1">.env.local</code>{" "}
                    (Supabase Dashboard → Project Settings → Database), restart{" "}
                    <code className="rounded bg-white px-1">npm run dev</code>, then retry save.
                    Tables are created automatically when credentials are present.
                  </p>
                  <button
                    type="button"
                    onClick={() => void ensureAttendanceSchema()}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Retry schema setup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <nav
        className="sticky top-[4.25rem] z-20 -mx-1 rounded-xl border border-corporate-brand/25 bg-white/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90"
        aria-label="Attendance four-layer pipeline navigation"
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-corporate-muted">
          Four-layer pipeline — always visible
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { layer: 1 as const, label: "Upload Editor" },
              { layer: 2 as const, label: "Staging Approval" },
              { layer: 3 as const, label: "Live Workflow" },
              { layer: 4 as const, label: "Saved Records" },
            ] as const
          ).map(({ layer, label }) => (
            <button
              key={layer}
              type="button"
              onClick={() => scrollToLayer(layer)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-corporate-border bg-corporate-surface px-3 py-1.5 text-xs font-semibold text-corporate-text transition-colors hover:border-corporate-brand/40 hover:bg-corporate-brand-light"
            >
              <span className="rounded-full bg-corporate-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                L{layer}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

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

      {/* Layer 1 — Upload record editor (22-column Excel staging) */}
      <div id="attendance-layer-1" className="scroll-mt-28 min-h-[280px]">
        <AttendanceUploadRecordModule
        importPreview={
          importPreview
            ? {
                fileName: importPreview.fileName,
                bulkRows: importPreview.bulkRows,
                pendingNewEmployees: importPreview.pendingNewEmployees,
                alignmentInfo: importPreview.alignmentInfo,
                reportDate: importPreview.reportDate,
              }
            : null
        }
        selectedBulkRowIndex={selectedBulkRowIndex}
        onSelectedBulkRowIndexChange={handleBulkRowIndexChange}
        onBulkRowsChange={handleBulkRowsChange}
        onFileInputChange={(file) => void handleFileSelect(file)}
        onProcessSave={() => void processBulkImport()}
        isParsing={isParsing}
        isProcessing={isProcessing}
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        fileInputRef={fileInputRef}
        importMessage={importMessage}
        importError={importError}
        dbConnected={dbConnected}
        />
      </div>

      {lastSaveSummary && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Last save: {lastSaveSummary.biometricSaved} row(s) for {lastSaveSummary.savedDate}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            File: {lastSaveSummary.fileName} — continue in Layer 2 (staging review), then Layer 3
            (live workflow). Committed rows appear in Layer 4 — Saved Upload Records.
          </p>
          <button
            type="button"
            onClick={() => scrollToLayer(2)}
            className="btn-primary mt-3 inline-flex h-9 items-center gap-2 px-4 text-xs"
          >
            Continue to Layer 2 — Staging Approval
          </button>
          <button
            type="button"
            onClick={() => viewSavedDate(lastSaveSummary.savedDate)}
            className="btn-secondary mt-3 ml-2 inline-flex h-9 items-center gap-2 px-4 text-xs"
          >
            View in Layer 4 — Saved Upload Records
          </button>
        </div>
      )}

      {/* Layer 2 — Biometric staging review & approval */}
      <div
        id="attendance-layer-2"
        ref={stagingSectionRef}
        className="scroll-mt-28 min-h-[320px]"
      >
        <AttendanceStagingWorkflowPanel
          filterDate={filterDate}
          refreshToken={stagingRefreshToken}
        />
      </div>

      {/* Layer 3 — Live four-stage verification workflow */}
      <section
        id="attendance-layer-3"
        className="scroll-mt-28 min-h-[360px] space-y-4 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card"
        aria-label="Layer 3 — Live attendance workflow"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-corporate-brand">
            Layer 3
          </p>
          <h3 className="text-sm font-bold text-corporate-text">Live Attendance Workflow</h3>
          <p className="text-xs text-corporate-muted">
            Four-stage verification — allocation, operator verification, supervisor approval, payroll
            commit. Review uploaded biometric rows by employee, date, punch times, and machine
            assignment after staging approval.
          </p>
        </div>
        <AttendanceSystemPanel />
      </section>

      {/* Layer 4 — Saved / merged server records */}
      {renderHistoryGrid()}

      <section className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <ManualAttendanceEntryPanel />
      </section>
    </div>
  );
}
