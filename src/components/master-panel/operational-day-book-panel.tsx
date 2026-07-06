"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Package,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

type DayBookPageId = "material" | "financial" | "commercial";

const DAYBOOK_PAGES: { id: DayBookPageId; label: string; icon: typeof Package }[] = [
  { id: "material", label: "Material / Stock", icon: Package },
  { id: "financial", label: "Financial Log", icon: Receipt },
  { id: "commercial", label: "Commercial Log", icon: ShoppingCart },
];

type MaterialInwardRow = {
  date: string;
  time: string;
  reference: string;
  category: string;
  supplier: string;
  item: string;
  quantity: string;
  vehicleNo: string;
};

type MaterialOutwardRow = {
  date: string;
  time: string;
  reference: string;
  customer: string;
  item: string;
  quantity: string;
  vehicleNo: string;
};

type FinancialReceiptRow = {
  date: string;
  partyName: string;
  amount: number;
  remark: string;
};

type FinancialPaymentRow = {
  date: string;
  voucher: string;
  particulars: string;
  amount: number;
  accountHead: string;
  vehicleNo?: string;
};

type CommercialRow = {
  date: string;
  time: string;
  reference: string;
  type: "Purchase" | "Sales";
  party: string;
  particulars: string;
  amount: number;
  vehicleNo?: string;
};

const MATERIAL_INWARD_ROWS: MaterialInwardRow[] = [
  {
    date: "2026-07-05",
    time: "08:15",
    reference: "INW-221",
    category: "Material Receipt",
    supplier: "Shree Steel Suppliers",
    item: "MS Round Bar 12mm",
    quantity: "2.4 MT",
    vehicleNo: "MH-14-GT-8821",
  },
  {
    date: "2026-07-05",
    time: "09:30",
    reference: "INW-228",
    category: "Material Receipt",
    supplier: "Patel Packaging",
    item: "Corrugated Carton Boxes",
    quantity: "500 Nos",
    vehicleNo: "GJ-06-TR-5520",
  },
  {
    date: "2026-07-05",
    time: "11:20",
    reference: "PV-883",
    category: "Purchase Entry",
    supplier: "Metro Castings Pvt Ltd",
    item: "Pig Iron Grade A",
    quantity: "5.0 MT",
    vehicleNo: "MH-14-GT-8821",
  },
  {
    date: "2026-07-05",
    time: "14:00",
    reference: "STK-77",
    category: "Stock Adjustment In",
    supplier: "Internal Floor Audit",
    item: "Raw Sand Grade A",
    quantity: "8 MT",
    vehicleNo: "—",
  },
];

const MATERIAL_OUTWARD_ROWS: MaterialOutwardRow[] = [
  {
    date: "2026-07-05",
    time: "10:45",
    reference: "DSP-1042",
    customer: "ABC Traders — Pune",
    item: "Finished Casting Lot #A-18",
    quantity: "142 Nos",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "12:30",
    reference: "ISS-331",
    customer: "Machining Bay 2",
    item: "Semi-finished Gear Blanks",
    quantity: "36 Nos",
    vehicleNo: "—",
  },
  {
    date: "2026-07-05",
    time: "15:45",
    reference: "DSP-1051",
    customer: "Metro Engineering",
    item: "Gear Assembly Dispatch",
    quantity: "36 Nos",
    vehicleNo: "MH-09-EF-1190",
  },
  {
    date: "2026-07-05",
    time: "16:30",
    reference: "TRF-88",
    customer: "Godown B — Transfer Out",
    item: "Packaging Material Roll",
    quantity: "12 Rolls",
    vehicleNo: "GJ-06-TR-5520",
  },
];

const FINANCIAL_RECEIPT_ROWS: FinancialReceiptRow[] = [
  {
    date: "2026-07-05",
    partyName: "Sharma Traders",
    amount: 45000,
    remark: "Settlement Satisfied",
  },
  {
    date: "2026-07-05",
    partyName: "Metro Engineering",
    amount: 28500,
    remark: "Partial — Follow Up",
  },
  {
    date: "2026-07-05",
    partyName: "Cash Counter — Gate 1",
    amount: 18200,
    remark: "Settlement Satisfied",
  },
  {
    date: "2026-07-05",
    partyName: "HDFC Bank Transfer — ABC Traders",
    amount: 125000,
    remark: "Bank Receipt Cleared",
  },
  {
    date: "2026-07-05",
    partyName: "Patel Packaging",
    amount: 8600,
    remark: "Settlement Satisfied",
  },
];

const FINANCIAL_PAYMENT_ROWS: FinancialPaymentRow[] = [
  {
    date: "2026-07-05",
    voucher: "EX-119",
    particulars: "Vehicle diesel expense — Pune Depot outbound trip",
    amount: 4800,
    accountHead: "Fuel & Logistics",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    voucher: "PY-412",
    particulars: "CNC Line A — Bearing Replacement",
    amount: 6200,
    accountHead: "Machine Repairs Head",
  },
  {
    date: "2026-07-05",
    voucher: "PY-425",
    particulars: "Labor OT payout — Assembly Bay C",
    amount: 5600,
    accountHead: "Labor Overtime Head",
  },
  {
    date: "2026-07-05",
    voucher: "PY-431",
    particulars: "OT Payout — Packaging Line D",
    amount: 2800,
    accountHead: "Labor Overtime Head",
  },
  {
    date: "2026-07-05",
    voucher: "EX-122",
    particulars: "Toll & route charges — Ahmedabad route",
    amount: 1650,
    accountHead: "Fuel & Logistics",
    vehicleNo: "MH-09-EF-1190",
  },
];

const COMMERCIAL_ROWS: CommercialRow[] = [
  {
    date: "2026-07-05",
    time: "08:15",
    reference: "PV-883",
    type: "Purchase",
    party: "Shree Steel Suppliers",
    particulars: "MS Round Bar 12mm — vendor purchase invoice",
    amount: 48500,
    vehicleNo: "MH-14-GT-8821",
  },
  {
    date: "2026-07-05",
    time: "11:00",
    reference: "SI-1042",
    type: "Sales",
    party: "ABC Traders",
    particulars: "Machined Gear Assembly — outbound sales invoice",
    amount: 125000,
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "13:00",
    reference: "PV-891",
    type: "Purchase",
    party: "Patel Packaging",
    particulars: "Corrugated carton boxes — packaging material purchase",
    amount: 22400,
    vehicleNo: "GJ-06-TR-5520",
  },
  {
    date: "2026-07-05",
    time: "15:45",
    reference: "SI-1051",
    type: "Sales",
    party: "Metro Engineering",
    particulars: "Gear assembly dispatch — customer sales entry",
    amount: 86400,
    vehicleNo: "MH-09-EF-1190",
  },
  {
    date: "2026-07-05",
    time: "17:30",
    reference: "PR-044",
    type: "Purchase",
    party: "Precision Tools India",
    particulars: "Cutting inserts and tooling — purchase return offset",
    amount: 3200,
    vehicleNo: "—",
  },
];

function formatRupee(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-corporate-muted">
        {message}
      </td>
    </tr>
  );
}

type OperationalDayBookPanelProps = {
  fromDate: string;
  toDate: string;
  entityFilter?: string;
};

export default function OperationalDayBookPanel({
  fromDate,
  toDate,
  entityFilter = "",
}: OperationalDayBookPanelProps) {
  const [activePage, setActivePage] = useState<DayBookPageId>("material");

  const filterText = (parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(" ");

  const filteredInward = useMemo(
    () =>
      MATERIAL_INWARD_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            filterText([
              row.reference,
              row.category,
              row.supplier,
              row.item,
              row.vehicleNo,
            ]),
            entityFilter
          )
      ),
    [entityFilter, fromDate, toDate]
  );

  const filteredOutward = useMemo(
    () =>
      MATERIAL_OUTWARD_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            filterText([row.reference, row.customer, row.item, row.vehicleNo]),
            entityFilter
          )
      ),
    [entityFilter, fromDate, toDate]
  );

  const filteredReceipts = useMemo(
    () =>
      FINANCIAL_RECEIPT_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            filterText([row.partyName, row.remark]),
            entityFilter
          )
      ),
    [entityFilter, fromDate, toDate]
  );

  const filteredPayments = useMemo(
    () =>
      FINANCIAL_PAYMENT_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            filterText([
              row.voucher,
              row.particulars,
              row.accountHead,
              row.vehicleNo,
            ]),
            entityFilter
          )
      ),
    [entityFilter, fromDate, toDate]
  );

  const filteredCommercial = useMemo(
    () =>
      COMMERCIAL_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            filterText([
              row.reference,
              row.type,
              row.party,
              row.particulars,
              row.vehicleNo,
            ]),
            entityFilter
          )
      ).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [entityFilter, fromDate, toDate]
  );

  const totalReceipts = useMemo(
    () => filteredReceipts.reduce((sum, row) => sum + row.amount, 0),
    [filteredReceipts]
  );

  const totalPayments = useMemo(
    () => filteredPayments.reduce((sum, row) => sum + row.amount, 0),
    [filteredPayments]
  );

  const commercialTotals = useMemo(() => {
    let purchase = 0;
    let sales = 0;
    for (const row of filteredCommercial) {
      if (row.type === "Purchase") purchase += row.amount;
      else sales += row.amount;
    }
    return { purchase, sales };
  }, [filteredCommercial]);

  return (
    <div className="w-full space-y-4" aria-label="Three-page operational day book">
      <div className="flex flex-col gap-3 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-corporate-text">
              Operations Day Book — 3-Page Split View
            </h3>
            <p className="text-xs text-corporate-muted">
              Material, financial, and commercial logs for the selected date range
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Day book pages">
        {DAYBOOK_PAGES.map((page) => {
          const Icon = page.icon;
          const isActive = activePage === page.id;
          return (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActivePage(page.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                  : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {page.label}
            </button>
          );
        })}
      </div>

      {activePage === "material" && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          role="tabpanel"
          aria-label="Material and stock log"
        >
          <article className="flex min-w-0 flex-col rounded-xl border-2 border-emerald-300 bg-corporate-surface shadow-card">
            <header className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
              <ArrowDownToLine className="h-5 w-5 text-emerald-700" aria-hidden />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Inward</h4>
                <p className="text-xs text-emerald-800">
                  Material receipts and factory inward entries
                </p>
              </div>
            </header>
            <div className="min-w-0 flex-1 p-3">
              <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "border-emerald-200")}>
                <table className={MASTER_LIST_TABLE_CLASS}>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reference</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Supplier</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Qty</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredInward.length === 0 ? (
                      <EmptyRow
                        colSpan={7}
                        message="No inward material logs match the selected criteria."
                      />
                    ) : (
                      filteredInward.map((row) => (
                        <tr key={`${row.reference}-${row.time}`}>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                            {row.date}
                            <br />
                            <span className="text-corporate-muted">{row.time}</span>
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                            {row.reference}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.category}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.supplier}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.item}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.quantity}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-semibold")}>
                            {row.vehicleNo}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-emerald-300 bg-emerald-50">
                    <tr>
                      <td
                        colSpan={7}
                        className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-emerald-900")}
                      >
                        Total Inward Entries: {filteredInward.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </article>

          <article className="flex min-w-0 flex-col rounded-xl border-2 border-red-300 bg-corporate-surface shadow-card">
            <header className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-3">
              <ArrowUpFromLine className="h-5 w-5 text-red-700" aria-hidden />
              <div>
                <h4 className="text-sm font-bold text-red-900">Outward</h4>
                <p className="text-xs text-red-800">
                  Dispatches and material issues leaving the factory
                </p>
              </div>
            </header>
            <div className="min-w-0 flex-1 p-3">
              <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "border-red-200")}>
                <table className={MASTER_LIST_TABLE_CLASS}>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reference</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Customer / Destination</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Qty</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredOutward.length === 0 ? (
                      <EmptyRow
                        colSpan={6}
                        message="No outward material logs match the selected criteria."
                      />
                    ) : (
                      filteredOutward.map((row) => (
                        <tr key={`${row.reference}-${row.time}`}>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                            {row.date}
                            <br />
                            <span className="text-corporate-muted">{row.time}</span>
                          </td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                            {row.reference}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.customer}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.item}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.quantity}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-semibold")}>
                            {row.vehicleNo}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-red-300 bg-red-50">
                    <tr>
                      <td
                        colSpan={6}
                        className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-red-900")}
                      >
                        Total Outward Entries: {filteredOutward.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </article>
        </div>
      )}

      {activePage === "financial" && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          role="tabpanel"
          aria-label="Financial log"
        >
          <article className="flex min-w-0 flex-col rounded-xl border-2 border-emerald-300 bg-corporate-surface shadow-card">
            <header className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
              <ArrowDownToLine className="h-5 w-5 text-emerald-700" aria-hidden />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Receipts</h4>
                <p className="text-xs text-emerald-800">Incoming cash and bank collections</p>
              </div>
            </header>
            <div className="min-w-0 flex-1 p-3">
              <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "border-emerald-200")}>
                <table className={MASTER_LIST_TABLE_CLASS}>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Party Name</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Received</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Remark / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredReceipts.length === 0 ? (
                      <EmptyRow
                        colSpan={3}
                        message="No receipt logs match the selected criteria."
                      />
                    ) : (
                      filteredReceipts.map((row) => (
                        <tr key={`${row.date}-${row.partyName}`}>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                            {row.partyName}
                          </td>
                          <td
                            className={cn(
                              MASTER_LIST_BODY_CELL_CLASS,
                              "text-right font-semibold text-emerald-700"
                            )}
                          >
                            {formatRupee(row.amount)}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-1 text-xs font-semibold",
                                row.remark.includes("Satisfied") || row.remark.includes("Cleared")
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              )}
                            >
                              {row.remark}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-emerald-300 bg-emerald-50">
                    <tr>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-emerald-900")}>
                        Total Receipts Sum
                      </td>
                      <td
                        className={cn(
                          MASTER_LIST_BODY_CELL_CLASS,
                          "text-right text-base font-bold text-emerald-800"
                        )}
                      >
                        {formatRupee(totalReceipts)}
                      </td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </article>

          <article className="flex min-w-0 flex-col rounded-xl border-2 border-red-300 bg-corporate-surface shadow-card">
            <header className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-3">
              <ArrowUpFromLine className="h-5 w-5 text-red-700" aria-hidden />
              <div>
                <h4 className="text-sm font-bold text-red-900">Payments</h4>
                <p className="text-xs text-red-800">Expenses and outgoing fund settlements</p>
              </div>
            </header>
            <div className="min-w-0 flex-1 p-3">
              <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "border-red-200")}>
                <table className={MASTER_LIST_TABLE_CLASS}>
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Particulars</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {filteredPayments.length === 0 ? (
                      <EmptyRow
                        colSpan={5}
                        message="No payment logs match the selected criteria."
                      />
                    ) : (
                      filteredPayments.map((row) => (
                        <tr key={row.voucher}>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                            {row.voucher}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.particulars}</td>
                          <td
                            className={cn(
                              MASTER_LIST_BODY_CELL_CLASS,
                              "text-right font-semibold text-red-700"
                            )}
                          >
                            {formatRupee(row.amount)}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.accountHead}</td>
                          <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-semibold")}>
                            {row.vehicleNo ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-red-300 bg-red-50">
                    <tr>
                      <td
                        colSpan={2}
                        className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-red-900")}
                      >
                        Total Payments Sum
                      </td>
                      <td
                        className={cn(
                          MASTER_LIST_BODY_CELL_CLASS,
                          "text-right text-base font-bold text-red-800"
                        )}
                      >
                        {formatRupee(totalPayments)}
                      </td>
                      <td colSpan={2} className={MASTER_LIST_BODY_CELL_CLASS} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </article>
        </div>
      )}

      {activePage === "commercial" && (
        <section
          className="rounded-xl border-2 border-corporate-border bg-corporate-surface shadow-card"
          role="tabpanel"
          aria-label="Commercial purchase and sales log"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-corporate-border bg-corporate-bg px-4 py-3">
            <div>
              <h4 className="text-sm font-bold text-corporate-text">Purchase &amp; Sales Register</h4>
              <p className="text-xs text-corporate-muted">
                All commercial transactions registered on the selected day
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-800">
                Purchase Total: {formatRupee(commercialTotals.purchase)}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
                Sales Total: {formatRupee(commercialTotals.sales)}
              </span>
            </div>
          </header>
          <div className="p-3">
            <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reference</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Party</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Particulars</th>
                    <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {filteredCommercial.length === 0 ? (
                    <EmptyRow
                      colSpan={7}
                      message="No purchase or sales transactions match the selected criteria."
                    />
                  ) : (
                    filteredCommercial.map((row) => (
                      <tr key={`${row.reference}-${row.time}`} className="hover:bg-corporate-bg/50">
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                          {row.date}
                          <br />
                          <span className="text-corporate-muted">{row.time}</span>
                        </td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                          {row.reference}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-2 py-1 text-xs font-semibold",
                              row.type === "Purchase"
                                ? "border-blue-300 bg-blue-50 text-blue-800"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800"
                            )}
                          >
                            [{row.type.toUpperCase()}]
                          </span>
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.party}</td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.particulars}</td>
                        <td
                          className={cn(
                            MASTER_LIST_BODY_CELL_CLASS,
                            "text-right font-semibold",
                            row.type === "Purchase" ? "text-blue-700" : "text-emerald-700"
                          )}
                        >
                          {formatRupee(row.amount)}
                        </td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-semibold")}>
                          {row.vehicleNo ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-corporate-border bg-corporate-bg">
                  <tr>
                    <td
                      colSpan={5}
                      className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-corporate-text")}
                    >
                      Net Commercial Activity — {filteredCommercial.length} entries
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        "text-right text-base font-bold text-corporate-brand"
                      )}
                    >
                      {formatRupee(commercialTotals.purchase + commercialTotals.sales)}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
