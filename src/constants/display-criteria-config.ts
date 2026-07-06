import type { TransactionFilterMode } from "./display-report-types";
import { getDefaultReportTypeForView } from "./display-report-types";

export type DisplayCriteriaViewId =
  | "daybook"
  | "ledgers"
  | "material-ledger"
  | "cash-bank"
  | "daily-production";

export type DisplayReportCriteria = {
  fromDate: string;
  toDate: string;
  reportTypeId: string;
  entityFilter: string;
  transactionFilterMode: TransactionFilterMode;
  accountGroupFilter: string;
  specificAccountFilter: string;
};

export const DISPLAY_ENTITY_LABELS: Record<DisplayCriteriaViewId, string> = {
  daybook: "Party / Voucher Search",
  ledgers: "Account Head Search",
  "material-ledger": "Vehicle Number / Supplier Search",
  "cash-bank": "Party Name Search",
  "daily-production": "Production Line / Shift Search",
};

export const DISPLAY_ENTITY_SUGGESTIONS: Record<DisplayCriteriaViewId, string[]> = {
  daybook: ["ABC Traders", "Steel Components", "Cash Collection", "Factory Diesel"],
  ledgers: ["Cash Account", "HDFC Bank", "Sales Account", "Diesel Expense"],
  "material-ledger": [
    "MH-12-AB-4521",
    "Shree Steel Suppliers",
    "Metro Engineering",
    "Hydraulic Works",
  ],
  "cash-bank": [
    "Sharma Traders",
    "Metro Engineering",
    "HDFC Bank Transfer — ABC Traders",
    "MH-12-AB-4521",
  ],
  "daily-production": [
    "Casting Line A",
    "Machining Bay 2",
    "Morning Shift",
    "Finished Goods Dispatch",
  ],
};

export function createDefaultDisplayCriteria(
  viewId: DisplayCriteriaViewId,
  fromDate: string,
  toDate: string
): DisplayReportCriteria {
  return {
    fromDate,
    toDate,
    reportTypeId: getDefaultReportTypeForView(viewId),
    entityFilter: "",
    transactionFilterMode: "all",
    accountGroupFilter: "",
    specificAccountFilter: "",
  };
}

export function matchesEntityFilter(haystack: string, entityFilter: string): boolean {
  const query = entityFilter.trim().toLowerCase();
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}
