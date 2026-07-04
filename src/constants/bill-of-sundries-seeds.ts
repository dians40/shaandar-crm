import type { BillOfSundryRecord } from "@/types/bill-of-sundry";

const NOW = "2020-01-01T00:00:00.000Z";

/** Pre-seeded Bill of Sundries entries — merged on every load. */
export function buildSeedBillOfSundries(): BillOfSundryRecord[] {
  const seeds: Omit<BillOfSundryRecord, "accountGroupId" | "accountGroupName">[] = [
    {
      id: "sundry-gst",
      sundryName: "GST",
      natureType: "plus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-igst",
      sundryName: "IGST",
      natureType: "plus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-sgst",
      sundryName: "SGST",
      natureType: "plus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-cgst",
      sundryName: "CGST",
      natureType: "plus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-dev-tax",
      sundryName: "Development Tax",
      natureType: "plus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-discount",
      sundryName: "Discount",
      natureType: "minus",
      calculationType: "percentage",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-freight",
      sundryName: "Freight",
      natureType: "plus",
      calculationType: "absolute",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-extra-freight",
      sundryName: "Extra Freight",
      natureType: "plus",
      calculationType: "absolute",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sundry-round-off",
      sundryName: "Round off",
      natureType: "plus",
      calculationType: "absolute",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  return seeds.map((row) => ({
    ...row,
    accountGroupId: "",
    accountGroupName: "",
  }));
}
