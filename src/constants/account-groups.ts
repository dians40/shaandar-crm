import type {
  AccountGroupCategory,
  AccountGroupNature,
  AccountGroupRecord,
} from "@/types/account-group";

type SeedSpec = {
  name: string;
  category: AccountGroupCategory;
  nature: AccountGroupNature;
};

/** Balance sheet & P&L heads — seeded as system groups with Primary parent. */
export const BALANCE_SHEET_ACCOUNT_GROUP_SEEDS: SeedSpec[] = [
  { name: "Fixed Assets", category: "ASSETS", nature: "Asset" },
  { name: "Current Assets", category: "ASSETS", nature: "Asset" },
  { name: "Bank Accounts", category: "ASSETS", nature: "Asset" },
  { name: "Cash-in-hand", category: "ASSETS", nature: "Asset" },
  { name: "Loans & Advances", category: "ASSETS", nature: "Asset" },
  { name: "Deposits", category: "ASSETS", nature: "Asset" },
  { name: "Current Liabilities", category: "LIABILITIES", nature: "Liability" },
  { name: "Loans (Liability)", category: "LIABILITIES", nature: "Liability" },
  { name: "Capital Account", category: "LIABILITIES", nature: "Liability" },
  { name: "Reserves & Surplus", category: "LIABILITIES", nature: "Liability" },
  { name: "Direct Income", category: "INCOME", nature: "Income" },
  { name: "Indirect Income", category: "INCOME", nature: "Income" },
  { name: "Direct Expenses", category: "EXPENSES", nature: "Expense" },
  { name: "Indirect Expenses", category: "EXPENSES", nature: "Expense" },
  { name: "Revenue Accounts", category: "REVENUE", nature: "Revenue" },
];

export function buildSeedAccountGroups(now = new Date().toISOString()): AccountGroupRecord[] {
  return BALANCE_SHEET_ACCOUNT_GROUP_SEEDS.map((seed, index) => ({
    id: `ag-seed-${index + 1}`,
    name: seed.name,
    parentGroup: "Primary",
    nature: seed.nature,
    category: seed.category,
    isSystemSeed: true,
    createdAt: now,
    updatedAt: now,
  }));
}

/** @deprecated Use account group records — kept for legacy name lists */
export const DEFAULT_ACCOUNT_GROUP_NAMES = BALANCE_SHEET_ACCOUNT_GROUP_SEEDS.map(
  (seed) => seed.name
);

export const IMPLEMENTED_ADMINISTRATION_MODULE_IDS = new Set([
  "accounts",
  "account-group",
  "employee-management",
  "godowns-locations",
]);
