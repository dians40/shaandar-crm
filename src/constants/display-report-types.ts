import type { DisplayCriteriaViewId } from "./display-criteria-config";

export type TransactionFilterMode = "all" | "group" | "specific";

export type ReportTypeDefinition = {
  id: string;
  label: string;
  labelHi: string;
  requiresDateRange: boolean;
  showTransactionFilter?: boolean;
  showEntityFilter?: boolean;
  entityFilterLabel?: string;
  showAccountGroupFilter?: boolean;
  showSpecificAccountFilter?: boolean;
};

export type ReportTypeCategory = {
  id: string;
  label: string;
  labelHi: string;
  reports: ReportTypeDefinition[];
};

export const REPORT_TYPE_CATEGORIES: ReportTypeCategory[] = [
  {
    id: "final-results",
    label: "FINAL RESULTS SUMMARY",
    labelHi: "अंतिम परिणाम",
    reports: [
      {
        id: "final-results.profit-loss",
        label: "Profit & Loss Statement",
        labelHi: "लाभ-हानि खाता",
        requiresDateRange: true,
      },
      {
        id: "final-results.daily-balance-sheet",
        label: "Daily Balance Sheet & Daily Summary",
        labelHi: "दैनिक बैलेंस शीट",
        requiresDateRange: true,
      },
      {
        id: "final-results.monthly-summary",
        label: "Monthly Summary Log",
        labelHi: "मासिक सारांश",
        requiresDateRange: true,
      },
      {
        id: "final-results.consolidated-account-wise",
        label: "Consolidated Summary — Account-wise",
        labelHi: "खाता-वार सारांश",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Account Head Search",
      },
      {
        id: "final-results.consolidated-group-wise",
        label: "Consolidated Summary — Account Group-wise",
        labelHi: "खाता समूह-वार सारांश",
        requiresDateRange: true,
        showAccountGroupFilter: true,
      },
    ],
  },
  {
    id: "accounts-transaction",
    label: "ACCOUNTS & TRANSACTION SUMMARY",
    labelHi: "खाता एवं ट्रांजैक्शन समरी",
    reports: [
      {
        id: "accounts-transaction.summary",
        label: "Transaction Summary Engine",
        labelHi: "ट्रांजैक्शन सारांश",
        requiresDateRange: true,
        showTransactionFilter: true,
      },
    ],
  },
  {
    id: "outstanding",
    label: "OUTSTANDING ANALYSIS SUMMARY",
    labelHi: "बकाया विश्लेषण",
    reports: [
      {
        id: "outstanding.receivables-payables-aging",
        label: "Receivables & Payables Aging Analysis",
        labelHi: "प्राप्य / देय एजिंग",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Party / Account Search",
      },
      {
        id: "outstanding.overdue-party-logs",
        label: "Overdue Party Logs (साधारी Status Flags)",
        labelHi: "अतिदेय पार्टी लॉग",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Party Name Search",
      },
    ],
  },
  {
    id: "inventory",
    label: "INVENTORY & STOCK SUMMARY",
    labelHi: "स्टॉक एवं इन्वेंट्री बुक्स",
    reports: [
      {
        id: "inventory.item-wise-logs",
        label: "Inventory Books — Item-wise Inward/Outward Logs",
        labelHi: "आइटम-वार आवक/जावक",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Item / Supplier Search",
      },
      {
        id: "inventory.universal-summary",
        label: "Inventory Summary — Universal Threshold Checker",
        labelHi: "सार्वभौमिक स्टॉक सारांश",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Item / Category Search",
      },
      {
        id: "inventory.stock-status-audit",
        label: "Stock Status Audit",
        labelHi: "स्टॉक स्थिति ऑडिट",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Item Search",
      },
    ],
  },
  {
    id: "payroll",
    label: "PAYROLL REPORTS HUB",
    labelHi: "कर्मचारी एवं लेबर रिपोर्ट",
    reports: [
      {
        id: "payroll.daily-attendance",
        label: "Daily Labor Attendance & Machine Floor Logs",
        labelHi: "दैनिक उपस्थिति लॉग",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Employee / Machine Search",
      },
      {
        id: "payroll.contractor-overtime",
        label: "Contractor vs Internal Payroll & Overtime Tracker",
        labelHi: "ठेकेदार बनाम आंतरिक पेरोल",
        requiresDateRange: true,
        showEntityFilter: true,
        entityFilterLabel: "Employee / Contractor Search",
      },
    ],
  },
];

export const ALL_REPORT_TYPES: ReportTypeDefinition[] = REPORT_TYPE_CATEGORIES.flatMap(
  (category) => category.reports
);

export const DEFAULT_REPORT_TYPE_ID = "final-results.profit-loss";

const VIEW_DEFAULT_REPORT_TYPE: Record<DisplayCriteriaViewId, string> = {
  daybook: "accounts-transaction.summary",
  ledgers: "accounts-transaction.summary",
  "material-ledger": "inventory.universal-summary",
  "cash-bank": "accounts-transaction.summary",
  "daily-production": "payroll.daily-attendance",
};

export function getDefaultReportTypeForView(viewId: DisplayCriteriaViewId): string {
  return VIEW_DEFAULT_REPORT_TYPE[viewId] ?? DEFAULT_REPORT_TYPE_ID;
}

export function getReportTypeDefinition(reportTypeId: string): ReportTypeDefinition | undefined {
  return ALL_REPORT_TYPES.find((report) => report.id === reportTypeId);
}

export function formatReportTypeLabel(report: ReportTypeDefinition): string {
  return `${report.label} (${report.labelHi})`;
}

export const TRANSACTION_FILTER_OPTIONS: {
  value: TransactionFilterMode;
  label: string;
}[] = [
  { value: "all", label: "Option A — All Accounts View" },
  { value: "group", label: "Option B — Group of Accounts Selection" },
  { value: "specific", label: "Option C — Select Specific Account" },
];

export const ACCOUNT_GROUP_SUGGESTIONS = [
  "Assets",
  "Liabilities",
  "Income",
  "Expenses",
  "Cash & Bank",
  "Sundry Debtors",
  "Sundry Creditors",
];

export const ACCOUNT_SUGGESTIONS = [
  "Cash Account",
  "HDFC Bank",
  "Sales Account",
  "Purchase Account",
  "Diesel Expense",
  "ABC Traders",
];
