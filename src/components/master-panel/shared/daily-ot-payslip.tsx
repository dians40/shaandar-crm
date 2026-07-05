"use client";

import { CheckCircle2 } from "lucide-react";
import type { OvertimeRecord } from "@/types/overtime";
import { cn } from "@/lib/utils";

type Props = {
  record: OvertimeRecord;
  onMarkPaid: () => void;
  onBack: () => void;
};

export default function DailyOtPayslip({ record, onMarkPaid, onBack }: Props) {
  const isDue = record.paymentStatus === "due";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-corporate-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              Daily Overtime Payslip
            </p>
            <h2 className="mt-1 text-xl font-semibold text-corporate-text">
              {record.employeeName}
            </h2>
            <p className="text-sm text-corporate-muted">
              {record.workDate} · {record.overtimeReason || record.shiftType}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide",
              isDue
                ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                : "bg-emerald-100 text-emerald-800"
            )}
          >
            Status: {isDue ? "DUE" : "PAID"}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Assigned From</dt>
            <dd className="text-sm font-medium">{record.assignedFromGroup || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Machine</dt>
            <dd className="text-sm font-medium">{record.assignedMachine || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Duration</dt>
            <dd className="text-sm font-medium">
              {record.fromTime} – {record.toTime} ({record.totalHours}h)
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Amount Paid Today</dt>
            <dd className="text-lg font-bold text-corporate-brand">
              ₹{record.amountPaidToday.toLocaleString("en-IN")}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Supervisor</dt>
            <dd className="text-sm font-medium">{record.supervisorApprovedBy || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-corporate-muted">Operator Verified</dt>
            <dd className="text-sm font-medium">{record.operatorVerifiedBy || "—"}</dd>
          </div>
        </dl>

        {record.attachmentPhotos.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase text-corporate-muted">
              Supervisor Attachments
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {record.attachmentPhotos.map((photo, index) => (
                <div
                  key={`payslip-photo-${index}`}
                  className="overflow-hidden rounded-lg border border-corporate-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`Attachment ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isDue && (
          <button
            type="button"
            onClick={onMarkPaid}
            className="inline-flex items-center gap-1.5 rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Paid / Clear Settlement
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-corporate-border px-5 py-2 text-sm font-medium"
        >
          Back to Queue
        </button>
      </div>
    </div>
  );
}
