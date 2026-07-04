export type OpeningBalanceType = "DR" | "CR";

export type AccountRecord = {
  id: string;
  name: string;
  groupName: string;
  openingBalanceAmount: number;
  openingBalanceType: OpeningBalanceType;
  address: string;
  gstNumber: string;
  panNumber: string;
  others: string;
  mobileNumber: string;
  contactPersonNumber: string;
  stationDestination: string;
  distanceKm: number;
  bankAccountNo: string;
  bankIfsc: string;
  bankName: string;
  maintenanceFlags: string;
  billByBillBalancing: boolean;
  creditDays: number;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_ACCOUNT_FORM: Omit<
  AccountRecord,
  "id" | "createdAt" | "updatedAt"
> = {
  name: "",
  groupName: "",
  openingBalanceAmount: 0,
  openingBalanceType: "DR",
  address: "",
  gstNumber: "",
  panNumber: "",
  others: "",
  mobileNumber: "",
  contactPersonNumber: "",
  stationDestination: "",
  distanceKm: 0,
  bankAccountNo: "",
  bankIfsc: "",
  bankName: "",
  maintenanceFlags: "",
  billByBillBalancing: false,
  creditDays: 0,
};

export function normalizeAccountRecord(
  row: Partial<AccountRecord> & Pick<AccountRecord, "id">
): AccountRecord {
  return {
    id: row.id,
    name: row.name ?? "",
    groupName: row.groupName ?? "",
    openingBalanceAmount: Number(row.openingBalanceAmount) || 0,
    openingBalanceType: row.openingBalanceType === "CR" ? "CR" : "DR",
    address: row.address ?? "",
    gstNumber: row.gstNumber ?? "",
    panNumber: row.panNumber ?? "",
    others: row.others ?? "",
    mobileNumber: row.mobileNumber ?? "",
    contactPersonNumber: row.contactPersonNumber ?? "",
    stationDestination: row.stationDestination ?? "",
    distanceKm: Number(row.distanceKm) || 0,
    bankAccountNo: row.bankAccountNo ?? "",
    bankIfsc: row.bankIfsc ?? "",
    bankName: row.bankName ?? "",
    maintenanceFlags: row.maintenanceFlags ?? "",
    billByBillBalancing: Boolean(row.billByBillBalancing),
    creditDays: Number(row.creditDays) || 0,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

const GST_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

export function validateAccountForm(
  form: Omit<AccountRecord, "id" | "createdAt" | "updatedAt">
): string | null {
  if (!form.name.trim()) return "Account / party name is required.";
  if (!form.groupName.trim()) return "Account group is required.";

  if (form.gstNumber.trim() && !GST_PATTERN.test(form.gstNumber.trim())) {
    return "GST number format is invalid (15-character GSTIN expected).";
  }

  if (form.panNumber.trim() && !PAN_PATTERN.test(form.panNumber.trim())) {
    return "PAN number format is invalid (e.g. ABCDE1234F).";
  }

  if (form.creditDays < 0) return "Credit days cannot be negative.";
  if (form.distanceKm < 0) return "Distance cannot be negative.";

  return null;
}
