export type DisplayCriteriaViewId =
  | "daybook"
  | "ledgers"
  | "material-ledger"
  | "cash-bank"
  | "trial-balance";

export type DisplayReportCriteria = {
  fromDate: string;
  toDate: string;
  reportSubType: string;
  entityFilter: string;
};

export const DISPLAY_SUB_TYPE_OPTIONS: Record<DisplayCriteriaViewId, string[]> = {
  daybook: ["Summary View", "Detailed Voucher Log", "Vehicle Cost Comparison"],
  ledgers: ["Summary View", "Detailed Voucher Log", "Account Head Comparison"],
  "material-ledger": ["Summary View", "Detailed Voucher Log", "Vehicle Cost Comparison"],
  "cash-bank": ["Summary View", "Detailed Voucher Log", "Party Receipt Analysis"],
  "trial-balance": ["Summary View", "Detailed Voucher Log", "Group Comparison"],
};

export const DISPLAY_ENTITY_LABELS: Record<DisplayCriteriaViewId, string> = {
  daybook: "Party / Voucher Search",
  ledgers: "Account Head Search",
  "material-ledger": "Vehicle Number / Supplier Search",
  "cash-bank": "Party Name Search",
  "trial-balance": "Account Group Search",
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
  "trial-balance": ["Assets", "Liabilities", "Income", "Expenses", "Cash & Bank"],
};

export function matchesEntityFilter(
  haystack: string,
  entityFilter: string
): boolean {
  const query = entityFilter.trim().toLowerCase();
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}
