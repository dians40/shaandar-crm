"use client";

import { useCallback, useEffect, useState } from "react";
import { computeExpenseReceiptTotal } from "@/lib/accounting-voucher-calculator";
import {
  normalizeExpenseReceiptRecord,
  type ExpenseReceiptFormState,
  type ExpenseReceiptKind,
  type ExpenseReceiptVoucherRecord,
} from "@/types/accounting-voucher";

const STORAGE_PREFIX = "shaandar-crm-expense-receipt-vouchers";

function storageKey(kind: ExpenseReceiptKind): string {
  return `${STORAGE_PREFIX}-${kind}`;
}

function readVouchers(kind: ExpenseReceiptKind): ExpenseReceiptVoucherRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ExpenseReceiptVoucherRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<ExpenseReceiptVoucherRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeExpenseReceiptRecord(row));
  } catch {
    return [];
  }
}

function writeVouchers(kind: ExpenseReceiptKind, records: ExpenseReceiptVoucherRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(kind), JSON.stringify(records));
}

export function useExpenseReceiptVouchers(kind: ExpenseReceiptKind) {
  const [records, setRecords] = useState<ExpenseReceiptVoucherRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readVouchers(kind));
    setIsReady(true);
  }, [kind]);

  const persist = useCallback(
    (next: ExpenseReceiptVoucherRecord[]) => {
      setRecords(next);
      writeVouchers(kind, next);
    },
    [kind]
  );

  const addVoucher = useCallback(
    (input: ExpenseReceiptFormState) => {
      const now = new Date().toISOString();
      const record = normalizeExpenseReceiptRecord({
        ...input,
        id: `${kind}-${Date.now()}`,
        totalAmount: computeExpenseReceiptTotal(input),
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readVouchers(kind)]);
      return record;
    },
    [kind, persist]
  );

  const updateVoucher = useCallback(
    (id: string, input: ExpenseReceiptFormState) => {
      const next = readVouchers(kind).map((row) =>
        row.id === id
          ? normalizeExpenseReceiptRecord({
              ...row,
              ...input,
              id: row.id,
              totalAmount: computeExpenseReceiptTotal(input),
              createdAt: row.createdAt,
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [kind, persist]
  );

  return { records, isReady, addVoucher, updateVoucher };
}
