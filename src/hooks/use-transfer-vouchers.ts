"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeTransferVoucherRecord,
  type TransferVoucherFormState,
  type TransferVoucherRecord,
} from "@/types/accounting-voucher";

const STORAGE_KEY = "shaandar-crm-transfer-vouchers";

function readTransfers(): TransferVoucherRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<TransferVoucherRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<TransferVoucherRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeTransferVoucherRecord(row));
  } catch {
    return [];
  }
}

function writeTransfers(records: TransferVoucherRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useTransferVouchers() {
  const [records, setRecords] = useState<TransferVoucherRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readTransfers());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: TransferVoucherRecord[]) => {
    setRecords(next);
    writeTransfers(next);
  }, []);

  const addTransfer = useCallback(
    (input: TransferVoucherFormState) => {
      const now = new Date().toISOString();
      const record = normalizeTransferVoucherRecord({
        ...input,
        id: `transfer-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readTransfers()]);
      return record;
    },
    [persist]
  );

  return { records, isReady, addTransfer };
}
