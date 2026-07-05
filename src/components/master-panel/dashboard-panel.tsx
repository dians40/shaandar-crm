"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Boxes,
  Fuel,
  IndianRupee,
  LayoutDashboard,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

const MACHINE_ALLOCATIONS = [
  { machine: "CNC Line A", assigned: 4, minimum: 5, maximum: 6 },
  { machine: "Press Unit B", assigned: 3, minimum: 3, maximum: 4 },
  { machine: "Assembly Bay C", assigned: 7, minimum: 4, maximum: 5 },
  { machine: "Packaging Line D", assigned: 2, minimum: 3, maximum: 4 },
  { machine: "Welding Station E", assigned: 5, minimum: 4, maximum: 5 },
];

const CRITICAL_PARTS = [
  { part: "Hydraulic Seal Kit", stock: 8, safetyLevel: 15, unit: "Nos" },
  { part: "Conveyor Roller Set", stock: 5, safetyLevel: 12, unit: "Nos" },
  { part: "Gear Oil Filter", stock: 11, safetyLevel: 20, unit: "Nos" },
  { part: "Drive Belt Type-X", stock: 6, safetyLevel: 10, unit: "Nos" },
  { part: "Control Panel Fuse", stock: 9, safetyLevel: 18, unit: "Nos" },
];

const QUICK_GLANCE = {
  salesDispatch: 845000,
  pendingCashier: 126500,
  unapprovedExpenses: 48200,
};

const FLEET_STATUS = {
  onRoute: 6,
  maintenanceLock: 2,
  awaitingAccountant: 3,
  dieselBurnRate: 28450,
};

function StaffingBadge({
  assigned,
  minimum,
  maximum,
}: {
  assigned: number;
  minimum: number;
  maximum: number;
}) {
  if (assigned < minimum) {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
        Short
      </span>
    );
  }

  if (assigned > maximum) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
        Excess
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
      Optimal
    </span>
  );
}

function formatRupee(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function DashboardPanel() {
  const totalActiveLabor = useMemo(
    () => MACHINE_ALLOCATIONS.reduce((sum, row) => sum + row.assigned, 0),
    []
  );

  const shortageCount = useMemo(
    () => MACHINE_ALLOCATIONS.filter((row) => row.assigned < row.minimum).length,
    []
  );

  const excessCount = useMemo(
    () => MACHINE_ALLOCATIONS.filter((row) => row.assigned > row.maximum).length,
    []
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Command center dashboard">
      <div className="border-b border-corporate-border pb-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-corporate-text">
              Main Command Center
            </h2>
            <p className="text-sm text-corporate-muted">
              Single-phase operational live dashboard for labor, fleet, inventory, and
              transaction control.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1 — Labor & Attendance */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
          Row 1 — Labor &amp; Attendance Matrices
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card md:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-corporate-muted">Total Active Labor</p>
                <p className="mt-2 text-4xl font-bold text-corporate-text">
                  {totalActiveLabor}
                </p>
                <p className="mt-1 text-xs text-corporate-muted">Checked-in workers now</p>
              </div>
              <div className="rounded-lg bg-corporate-brand-light p-2.5 text-corporate-brand">
                <Users className="h-5 w-5" aria-hidden />
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card md:col-span-2">
            <p className="mb-3 text-sm font-semibold text-corporate-text">
              Machine Allocation Analytics
            </p>
            <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Machine Name</th>
                    <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>
                      Assigned Labor Count
                    </th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Staffing Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {MACHINE_ALLOCATIONS.map((row) => (
                    <tr key={row.machine}>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                        {row.machine}
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                        {row.assigned}
                      </td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <StaffingBadge
                          assigned={row.assigned}
                          minimum={row.minimum}
                          maximum={row.maximum}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card md:col-span-1">
            <p className="text-sm font-semibold text-corporate-text">Staffing Alerts</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />
                  <span className="text-sm font-medium text-red-800">Target Shortage</span>
                </div>
                <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-bold uppercase text-red-700">
                  Short · {shortageCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" aria-hidden />
                  <span className="text-sm font-medium text-amber-800">Overstaffing</span>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold uppercase text-amber-700">
                  Excess · {excessCount}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Row 2 — Logistics & Fleet */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
          Row 2 — Logistics &amp; Fleet Management
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card md:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-corporate-brand" aria-hidden />
              <p className="text-sm font-semibold text-corporate-text">Vehicle Status Tracker</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">On-Route</p>
                <p className="mt-1 text-3xl font-bold text-emerald-800">{FLEET_STATUS.onRoute}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Maintenance Lock</p>
                <p className="mt-1 text-3xl font-bold text-amber-800">
                  {FLEET_STATUS.maintenanceLock}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs uppercase tracking-wide text-red-700">
                  Awaiting Accountant Approval
                </p>
                <p className="mt-1 text-3xl font-bold text-red-800">
                  {FLEET_STATUS.awaitingAccountant}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-corporate-muted">Diesel Expense Burn Rate</p>
                <p className="mt-2 text-3xl font-bold text-red-700">
                  {formatRupee(FLEET_STATUS.dieselBurnRate)}
                </p>
                <p className="mt-1 text-xs text-corporate-muted">
                  Fuel cost on active routes today
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
                <Fuel className="h-5 w-5" aria-hidden />
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Row 3 — Inventory & Transactions */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
          Row 3 — Inventory &amp; Transaction Metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-corporate-brand" aria-hidden />
              <p className="text-sm font-semibold text-corporate-text">
                Critical Parts Level Watcher
              </p>
            </div>
            <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Part Name</th>
                    <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Stock</th>
                    <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Safety Level</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {CRITICAL_PARTS.map((row) => (
                    <tr key={row.part}>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                        {row.part}
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                        {row.stock} {row.unit}
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                        {row.safetyLevel} {row.unit}
                      </td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold uppercase text-red-700">
                          Re-Order
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-corporate-brand" aria-hidden />
              <p className="text-sm font-semibold text-corporate-text">
                Single Phase Quick Glance
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-corporate-border bg-corporate-bg p-4">
                <p className="text-xs uppercase tracking-wide text-corporate-muted">
                  Today&apos;s Sales Dispatch
                </p>
                <p className="mt-2 flex items-center gap-1 text-xl font-bold text-corporate-text">
                  <IndianRupee className="h-4 w-4" aria-hidden />
                  {QUICK_GLANCE.salesDispatch.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">
                  Pending Cashier Balance
                </p>
                <p className="mt-2 flex items-center gap-1 text-xl font-bold text-amber-800">
                  <IndianRupee className="h-4 w-4" aria-hidden />
                  {QUICK_GLANCE.pendingCashier.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs uppercase tracking-wide text-red-700">
                  Unapproved Operation Expenses
                </p>
                <p className="mt-2 flex items-center gap-1 text-xl font-bold text-red-800">
                  <IndianRupee className="h-4 w-4" aria-hidden />
                  {QUICK_GLANCE.unapprovedExpenses.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
