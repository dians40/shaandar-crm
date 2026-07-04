"use client";

import { useMemo } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useItems } from "@/hooks/use-items";
import { useOvertimeRecords } from "@/hooks/use-overtime";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import {
  isUsedInTransactions,
  type MasterEntityType,
} from "@/lib/master-transaction-usage";

export function useMasterDeletionGuard() {
  const { records: overtimeRecords, isReady: overtimeReady } = useOvertimeRecords();
  const { items, isReady: itemsReady } = useItems();
  const { accounts, isReady: accountsReady } = useAccounts();
  const { conversions, isReady: conversionsReady } = useUnitConversions();

  const context = useMemo(
    () => ({
      overtimeRecords,
      items,
      accounts,
      conversions,
    }),
    [overtimeRecords, items, accounts, conversions]
  );

  const isReady = overtimeReady && itemsReady && accountsReady && conversionsReady;

  const checkUsedInTransactions = (
    entityType: MasterEntityType,
    entityId: string,
    entityName?: string
  ) => isUsedInTransactions(entityType, entityId, entityName, context);

  return { isReady, checkUsedInTransactions };
}
