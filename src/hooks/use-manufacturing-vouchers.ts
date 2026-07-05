"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeManufacturingVoucherRecord,
  type ManufacturingVoucherFormState,
  type ManufacturingVoucherRecord,
} from "@/types/manufacturing-voucher";

const STORAGE_KEY = "shaandar-crm-manufacturing-vouchers";

function readVouchers(): ManufacturingVoucherRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ManufacturingVoucherRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<ManufacturingVoucherRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeManufacturingVoucherRecord(row));
  } catch {
    return [];
  }
}

function writeVouchers(records: ManufacturingVoucherRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useManufacturingVouchers() {
  const [records, setRecords] = useState<ManufacturingVoucherRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readVouchers());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: ManufacturingVoucherRecord[]) => {
    setRecords(next);
    writeVouchers(next);
  }, []);

  const addVoucher = useCallback((input: ManufacturingVoucherFormState) => {
    const now = new Date().toISOString();
    const totalUnitExpense = input.unitExpenses.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );
    const record = normalizeManufacturingVoucherRecord({
      ...input,
      id: `mfg-${Date.now()}`,
      totalUnitExpense,
      createdAt: now,
      updatedAt: now,
    });
    persist([record, ...readVouchers()]);
    return record;
  }, [persist]);

  return { records, isReady, addVoucher };
}
