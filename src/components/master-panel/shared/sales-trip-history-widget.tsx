"use client";

import type { TripHistoryAuditRow } from "@/lib/vehicle-trip-history";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  rows: TripHistoryAuditRow[];
  title?: string;
};

export default function SalesTripHistoryWidget({
  rows,
  title = "Last 2 Trips — Station Route Audit",
}: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
      <h3 className="text-sm font-semibold text-sky-950">{title}</h3>
      <p className="mt-1 text-xs text-sky-800">
        Comparative audit for the identical destination station
      </p>
      <div className="workspace-table-scroll mt-3 rounded-lg border border-sky-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100/80 text-left text-xs uppercase text-sky-900">
            <tr>
              <th className="px-3 py-2">Trip Date</th>
              <th className="px-3 py-2">Vehicle No</th>
              <th className="px-3 py-2 text-right">Total Fuel Spent</th>
              <th className="px-3 py-2 text-right">Total Freight Paid</th>
              <th className="px-3 py-2 text-right">Food Allowance</th>
              <th className="px-3 py-2 text-right">Total Extra Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.tripDate}-${row.vehicleRegistration}-${index}`} className="border-t border-sky-100">
                <td className="px-3 py-2">{row.tripDate}</td>
                <td className="px-3 py-2 font-medium">{row.vehicleRegistration}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.fuelCost)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.freight)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.foodAllowance)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.extraCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
