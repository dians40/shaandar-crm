import type { AccountRecord } from "@/types/account";
import type { GodownRecord } from "@/types/godown";
import type { ItemRecord } from "@/types/item";
import type { OvertimeRecord } from "@/types/overtime";
import type { UnitConversionRecord } from "@/types/unit-conversion";

export type MasterEntityType =
  | "employee"
  | "account"
  | "account-group"
  | "item"
  | "item-group"
  | "unit"
  | "unit-conversion"
  | "godown";

type UsageContext = {
  overtimeRecords?: OvertimeRecord[];
  items?: ItemRecord[];
  accounts?: AccountRecord[];
  conversions?: UnitConversionRecord[];
  godowns?: GodownRecord[];
};

const TRANSACTION_STORAGE_KEYS = ["shaandar-crm-overtime"] as const;

function readTransactionJson(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isReferencedInTransactionStorage(entityId: string, entityName?: string): boolean {
  for (const key of TRANSACTION_STORAGE_KEYS) {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!raw) continue;
    if (raw.includes(entityId)) return true;
    if (entityName && raw.toLowerCase().includes(entityName.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function overtimeUsesEmployee(
  records: OvertimeRecord[],
  employeeId: string
): boolean {
  return records.some((row) => row.employeeId === employeeId);
}

function overtimeUsesGodown(
  records: OvertimeRecord[],
  godownName: string
): boolean {
  const normalized = godownName.trim().toLowerCase();
  if (!normalized) return false;

  return records.some((row) => {
    const haystack = [
      row.workLocation,
      row.workLocationAssignment,
      row.narration,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      haystack.includes(normalized) ||
      haystack.includes(`godown: ${normalized}`)
    );
  });
}

function unitUsedInMasters(
  unitId: string,
  items: ItemRecord[],
  conversions: UnitConversionRecord[]
): boolean {
  const inItems = items.some(
    (row) => row.primaryUnitId === unitId || row.alternateUnitId === unitId
  );
  const inConversions = conversions.some(
    (row) =>
      row.baseUnitId === unitId ||
      row.intermediateUnitId === unitId ||
      row.finalUnitId === unitId
  );
  return inItems || inConversions;
}

/** Returns true when a master record must not be deleted due to transaction or dependent usage. */
export function isUsedInTransactions(
  entityType: MasterEntityType,
  entityId: string,
  entityName?: string,
  context: UsageContext = {}
): boolean {
  const overtime =
    context.overtimeRecords ??
    (readTransactionJson("shaandar-crm-overtime") as OvertimeRecord[]);

  if (isReferencedInTransactionStorage(entityId, entityName)) {
    return true;
  }

  switch (entityType) {
    case "employee":
      return overtimeUsesEmployee(overtime, entityId);

    case "godown":
      return entityName ? overtimeUsesGodown(overtime, entityName) : false;

    case "unit": {
      const items =
        context.items ??
        (readTransactionJson("shaandar-crm-items") as ItemRecord[]);
      const conversions =
        context.conversions ??
        (readTransactionJson("shaandar-crm-unit-conversions") as UnitConversionRecord[]);
      return unitUsedInMasters(entityId, items, conversions);
    }

    case "item-group": {
      const items =
        context.items ??
        (readTransactionJson("shaandar-crm-items") as ItemRecord[]);
      return items.some((row) => row.itemGroupId === entityId);
    }

    case "account-group": {
      const accounts =
        context.accounts ??
        (readTransactionJson("shaandar-crm-accounts") as AccountRecord[]);
      return entityName
        ? accounts.some((row) => row.groupName === entityName)
        : false;
    }

    case "account":
    case "item":
    case "unit-conversion":
    default:
      return false;
  }
}
