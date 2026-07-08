"use client";

import { useCallback, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import SearchableSelectInput from "@/components/forms/searchable-select-input";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import { useGlassPackingRecords } from "@/hooks/use-glass-packing-records";
import { useItems } from "@/hooks/use-items";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import {
  filterEmployeesByDepartment,
  resolveEmployeeWage,
} from "@/lib/department-employee-filter";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  PAYROLL_SHIFT_OPTIONS,
  validatePayrollShiftOrTime,
} from "@/lib/overtime-shift-config";
import {
  EMPTY_GLASS_PACKING_FORM,
  GLASS_PACKING_DEPARTMENT,
  GLASS_PACKING_ITEM_FALLBACKS,
  computePacketVariance,
  validateGlassPackingForm,
  type GlassPackingRecord,
} from "@/types/glass-packing";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
  useMasterListFilters,
} from "./universal-master-list";

type ViewMode = "list" | "add";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GlassPackingPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { items, isReady: itemsReady } = useItems();
  const { records, isReady: recordsReady, addRecord, deleteRecord } =
    useGlassPackingRecords();
  const { records: attendanceRecords, isReady: attendanceReady } = useAttendanceWorkflow();

  const [view, setView] = useState<ViewMode>("list");
  const [form, setForm] = useState(EMPTY_GLASS_PACKING_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isReady = !employeesLoading && itemsReady && recordsReady && attendanceReady;

  const departmentEmployees = useMemo(
    () =>
      filterEmployeesByDepartment(employees, GLASS_PACKING_DEPARTMENT, attendanceRecords),
    [employees, attendanceRecords]
  );

  const employeeOptions = useMemo(
    () =>
      departmentEmployees.map((employee) => ({
        value: employee.id,
        label: employee.name,
      })),
    [departmentEmployees]
  );

  const itemOptions = useMemo(() => {
    const fromMaster = items.map((row) => ({ value: row.itemName, label: row.itemName }));
    const existing = new Set(fromMaster.map((row) => row.label.toLowerCase()));
    const fallbacks = GLASS_PACKING_ITEM_FALLBACKS.filter(
      (name) => !existing.has(name.toLowerCase())
    ).map((name) => ({ value: name, label: name }));
    return [...fromMaster, ...fallbacks];
  }, [items]);

  const packetVariance = useMemo(
    () => computePacketVariance(form.targetPackets, form.achievementPackets),
    [form.targetPackets, form.achievementPackets]
  );

  const resetPanelState = useCallback(() => {
    setView("list");
    setForm(EMPTY_GLASS_PACKING_FORM);
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const applySelectedEmployee = (employeeId: string) => {
    const employee = employees.find((row) => row.id === employeeId);
    if (!employee) return;
    const wage = resolveEmployeeWage(employee);
    setForm((prev) => ({
      ...prev,
      employeeId,
      employeeName: employee.name,
      amountSalary: wage,
    }));
  };

  const handleSubmit = () => {
    const validationError =
      validateGlassPackingForm(form) ??
      validatePayrollShiftOrTime({
        shiftType: form.shiftType,
        fromTime: form.timeIn,
        toTime: form.timeOut,
      });
    if (validationError) {
      setError(validationError);
      return;
    }

    addRecord(form);
    resetPanelState();
  };

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-8 text-center text-sm text-corporate-muted">
        Loading Glass Packing…
      </div>
    );
  }

  if (view === "add") {
    return (
      <>
        <ModuleAddListTabBar
          moduleName="Glass Packing"
          active="add"
          onAdd={() => setView("add")}
          onList={resetPanelState}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
            <h3 className="text-sm font-semibold text-corporate-text">
              Part 1 · Labor / Time Log
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Department"
                value={GLASS_PACKING_DEPARTMENT}
                readOnly
                className="bg-corporate-bg"
              />
              <TextInput
                label="Work Date"
                type="date"
                value={form.workDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, workDate: event.target.value }))
                }
              />
              <SearchableSelectInput
                id="glass-packing-employee"
                label="Employee Name"
                required
                value={form.employeeId}
                placeholder="Search glass packing employee..."
                onChange={applySelectedEmployee}
                options={employeeOptions}
                hint={
                  departmentEmployees.length === 0
                    ? "No employees matched glass packing — assign department in Employee Master or attendance"
                    : "Filtered by Employee Master department and attendance records"
                }
              />
              <SelectInput
                label="Shift Type"
                value={form.shiftType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, shiftType: event.target.value }))
                }
                options={PAYROLL_SHIFT_OPTIONS}
                placeholder="Select shift"
                hint="Optional when Time In / Time Out is provided"
              />
              <TextInput
                label="Time In (HH:MM)"
                placeholder="09:00"
                value={form.timeIn}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timeIn: event.target.value }))
                }
              />
              <TextInput
                label="Time Out (HH:MM)"
                placeholder="21:00"
                value={form.timeOut}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timeOut: event.target.value }))
                }
              />
              <TextInput
                label="Amount / Salary"
                type="number"
                min="0"
                step="0.01"
                readOnly={form.amountSalary > 0}
                value={String(form.amountSalary)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amountSalary: Number(event.target.value) || 0,
                  }))
                }
                className={form.amountSalary > 0 ? "bg-corporate-bg" : undefined}
                hint="Auto-filled from Employee Master fixed salary or daily wage when available"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
            <h3 className="text-sm font-semibold text-corporate-text">
              Part 2 · Production Calculation
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput
                label="Item Name"
                required
                value={form.itemName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, itemName: event.target.value }))
                }
                options={itemOptions}
                placeholder="Select item"
              />
              <TextInput
                label="Target Packets (Expected)"
                type="number"
                min="0"
                value={String(form.targetPackets)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetPackets: Number(event.target.value) || 0,
                  }))
                }
              />
              <TextInput
                label="Achievement Packets (Actual)"
                type="number"
                min="0"
                value={String(form.achievementPackets)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    achievementPackets: Number(event.target.value) || 0,
                  }))
                }
              />
              <TextInput
                label="Shortage"
                readOnly
                value={String(packetVariance.shortagePackets)}
                className="bg-corporate-bg"
                hint="Target minus achievement when target is higher"
              />
              <TextInput
                label="Excess"
                readOnly
                value={String(packetVariance.excessPackets)}
                className="bg-corporate-bg"
                hint="Achievement minus target when achievement is higher"
              />
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
          >
            Save Glass Packing Entry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <ModuleAddListTabBar
        moduleName="Glass Packing"
        active="list"
        onAdd={() => {
          setError(null);
          setForm(EMPTY_GLASS_PACKING_FORM);
          setView("add");
        }}
        onList={() => setView("list")}
      />

      <UniversalMasterListShell
        moduleName="Glass Packing"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <GlassPackingListContent
          records={records}
          searchQuery={searchQuery}
          onDelete={deleteRecord}
        />
      </UniversalMasterListShell>
    </>
  );
}

type GlassPackingListContentProps = {
  records: GlassPackingRecord[];
  searchQuery: string;
  onDelete: (id: string) => void;
};

function GlassPackingListContent({
  records,
  searchQuery,
  onDelete,
}: GlassPackingListContentProps) {
  const { departmentFilter, designationFilter } = useMasterListFilters();
  const filteredRows = useMemo(
    () =>
      records.filter((row) =>
        matchesUniversalNameSearch(
          searchQuery,
          row.employeeName,
          [row.itemName, row.workDate, row.department],
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }
        )
      ),
    [records, searchQuery, departmentFilter, designationFilter]
  );

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white px-4 py-12 text-center text-sm text-corporate-muted">
        {searchQuery.trim()
          ? LIST_SEARCH_EMPTY_MESSAGE
          : "No glass packing records yet. Use Add Glass Packing to log labor and production."}
      </div>
    );
  }

  return (
    <UniversalMasterListTable>
      <thead className={MASTER_LIST_HEAD_CLASS}>
        <tr>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Work Date</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
          <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Target</th>
          <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Achievement</th>
          <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Salary</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredRows.map((row) => (
          <UniversalMasterListRow key={row.id} onEdit={() => undefined}>
            <td className={MASTER_LIST_BODY_CELL_CLASS}>
              <span className="font-medium text-corporate-text">{row.employeeName}</span>
              <p className="text-xs text-corporate-muted">
                {row.shortagePackets} shortage · {row.excessPackets} excess
              </p>
            </td>
            <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.workDate}</td>
            <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.itemName}</td>
            <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
              {row.targetPackets}
            </td>
            <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
              {row.achievementPackets}
            </td>
            <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
              {formatCurrency(row.amountSalary)}
            </td>
            <td className={MASTER_LIST_BODY_CELL_CLASS}>
              <button
                type="button"
                onClick={() => onDelete(row.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                aria-label={`Delete ${row.employeeName}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </button>
            </td>
          </UniversalMasterListRow>
        ))}
      </tbody>
    </UniversalMasterListTable>
  );
}
