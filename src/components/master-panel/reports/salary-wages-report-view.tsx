"use client";

import { useMemo } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useGlassPackingRecords } from "@/hooks/use-glass-packing-records";
import { useOvertimeRecords } from "@/hooks/use-overtime";
import { resolveEmployeeWage } from "@/lib/department-employee-filter";
import { cn } from "@/lib/utils";
import type { SalaryWagesReportId } from "@/constants/reports-navigation";
import { getSalaryWagesReport } from "@/constants/reports-navigation";
import WorkspaceDateRangeFilter, {
  isWithinDateRange,
} from "../workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "../universal-master-list";

type Props = {
  reportId: SalaryWagesReportId;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

function EmptyReportRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-corporate-muted">
        {message}
      </td>
    </tr>
  );
}

export default function SalaryWagesReportView({
  reportId,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: Props) {
  const report = getSalaryWagesReport(reportId);
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { records: overtimeRecords, isReady: overtimeReady } = useOvertimeRecords();
  const { records: glassRecords, isReady: glassReady } = useGlassPackingRecords();

  const salaryRows = useMemo(
    () =>
      employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        department: employee.machineAssignment,
        employeeType: employee.employeeType,
        fixedSalary: employee.fixSalaryAmount,
        dailyRate: employee.dailyRate,
        overtimeRate: employee.overtimeHourlyRate,
        effectiveWage: resolveEmployeeWage(employee),
      })),
    [employees]
  );

  const filteredOvertime = useMemo(
    () =>
      overtimeRecords.filter((row) => isWithinDateRange(row.workDate, fromDate, toDate)),
    [overtimeRecords, fromDate, toDate]
  );

  const filteredGlass = useMemo(
    () =>
      glassRecords.filter((row) => isWithinDateRange(row.workDate, fromDate, toDate)),
    [glassRecords, fromDate, toDate]
  );

  const isLoading =
    (reportId === "salary" && employeesLoading) ||
    (reportId === "overtime" && !overtimeReady) ||
    (reportId === "glass-packing" && !glassReady);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label={report?.label ?? "Report"}>
      <div className="border-b border-corporate-border pb-3">
        <h2 className="text-base font-semibold text-corporate-text">{report?.label ?? "Report"}</h2>
        <p className="text-sm text-corporate-muted">
          {report?.description ?? "Salary and wages report workspace"}
        </p>
      </div>

      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />

      <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-corporate-muted">Loading report data...</p>
        ) : (
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              {reportId === "salary" && (
                <>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Department</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Fixed Salary</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Daily Rate</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>OT Rate</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Effective Wage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {salaryRows.length === 0 ? (
                      <EmptyReportRow
                        colSpan={7}
                        message="No employee salary profiles found for this report period."
                      />
                    ) : (
                      salaryRows.map((row) => (
                        <tr key={row.id}>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                            {row.name}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.department}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.employeeType}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.fixedSalary != null
                              ? `₹${row.fixedSalary.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.dailyRate != null
                              ? `₹${row.dailyRate.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.overtimeRate != null
                              ? `₹${row.overtimeRate.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                            {row.effectiveWage > 0
                              ? `₹${row.effectiveWage.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}

              {reportId === "overtime" && (
                <>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Work Date</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Department</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reason</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Hours</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Paid</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredOvertime.length === 0 ? (
                      <EmptyReportRow
                        colSpan={7}
                        message="No overtime submissions in the selected date range."
                      />
                    ) : (
                      filteredOvertime.map((row) => (
                        <tr key={row.id}>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.workDate}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                            {row.employeeName}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>
                            {row.assignedMachine || "—"}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>
                            {row.overtimeReason || "—"}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.totalHours}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                            ₹{row.amountPaidToday.toLocaleString("en-IN")}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>
                            {row.paymentStatus === "paid" ? "Paid" : "Due"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}

              {reportId === "glass-packing" && (
                <>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Work Date</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Target</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Achievement</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Shortage</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Excess</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredGlass.length === 0 ? (
                      <EmptyReportRow
                        colSpan={8}
                        message="No glass packing records in the selected date range."
                      />
                    ) : (
                      filteredGlass.map((row) => (
                        <tr key={row.id}>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.workDate}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                            {row.employeeName}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.itemName || "—"}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.targetPackets}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.achievementPackets}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.shortagePackets}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                            {row.excessPackets}
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                            ₹{row.amountSalary.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}

              {(reportId === "dining-packing" ||
                reportId === "vacuum-forming" ||
                reportId === "printing-glass") && (
                <>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Work Date</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Department</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    <EmptyReportRow
                      colSpan={5}
                      message={`No ${report?.label ?? "production"} transaction records in the selected date range yet.`}
                    />
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
