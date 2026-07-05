"use client";

import { useCallback, useEffect, useState } from "react";
import { computeVoucherTotals } from "@/lib/inventory-voucher-calculator";
import {
  normalizeInventoryVoucherRecord,
  type InventoryVoucherFormState,
  type InventoryVoucherKind,
  type InventoryVoucherRecord,
} from "@/types/inventory-voucher";

const STORAGE_PREFIX = "shaandar-crm-inventory-vouchers";

function storageKey(kind: InventoryVoucherKind): string {
  return `${STORAGE_PREFIX}-${kind}`;
}

function readVouchers(kind: InventoryVoucherKind): InventoryVoucherRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<InventoryVoucherRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<InventoryVoucherRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeInventoryVoucherRecord(row));
  } catch {
    return [];
  }
}

function writeVouchers(kind: InventoryVoucherKind, records: InventoryVoucherRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(kind), JSON.stringify(records));
}

export function useInventoryVouchers(kind: InventoryVoucherKind) {
  const [records, setRecords] = useState<InventoryVoucherRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readVouchers(kind));
    setIsReady(true);
  }, [kind]);

  const persist = useCallback(
    (next: InventoryVoucherRecord[]) => {
      setRecords(next);
      writeVouchers(kind, next);
    },
    [kind]
  );

  const addVoucher = useCallback(
    (input: InventoryVoucherFormState) => {
      const computed = computeVoucherTotals(input);
      const now = new Date().toISOString();
      const record = normalizeInventoryVoucherRecord({
        ...input,
        ...computed,
        id: `voucher-${kind}-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readVouchers(kind)]);
      return record;
    },
    [kind, persist]
  );

  const updateVoucher = useCallback(
    (id: string, input: InventoryVoucherFormState) => {
      const computed = computeVoucherTotals(input);
      const next = readVouchers(kind).map((row) =>
        row.id === id
          ? normalizeInventoryVoucherRecord({
              ...row,
              ...input,
              ...computed,
              id: row.id,
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
