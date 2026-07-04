import type { UnitRecord } from "@/types/unit";

type UnitSeedSpec = {
  name: string;
  nameHindi: string;
  shortCode: string;
};

/** Standard business units — pre-seeded and available instantly. */
export const BUSINESS_UNIT_SEEDS: UnitSeedSpec[] = [
  { name: "Bag", nameHindi: "बैग", shortCode: "Bag" },
  { name: "Bundle", nameHindi: "बंडल", shortCode: "Bdl" },
  { name: "Bottle", nameHindi: "बोतल", shortCode: "Btl" },
  { name: "Box", nameHindi: "बॉक्स", shortCode: "Box" },
  { name: "Crate", nameHindi: "क्रेट", shortCode: "Crt" },
  { name: "Carton", nameHindi: "कार्टुन", shortCode: "Ctn" },
  { name: "Dozen", nameHindi: "दर्जन / रजन", shortCode: "Dzn" },
  { name: "Drums", nameHindi: "ड्रम्स", shortCode: "Drm" },
  { name: "Feet", nameHindi: "फूट", shortCode: "Ft" },
  { name: "Gram", nameHindi: "ग्राम", shortCode: "g" },
  { name: "KG", nameHindi: "केजी", shortCode: "KG" },
  { name: "Liter", nameHindi: "लीटर", shortCode: "L" },
  { name: "Pieces", nameHindi: "पिसेस", shortCode: "Pcs" },
  { name: "Strip", nameHindi: "पत्ता", shortCode: "Str" },
  { name: "Meter", nameHindi: "मीटर", shortCode: "m" },
  { name: "Peti", nameHindi: "पेटी", shortCode: "Peti" },
  { name: "Packet", nameHindi: "पेकेट", shortCode: "Pkt" },
  { name: "Numbers", nameHindi: "नंबर", shortCode: "No" },
];

export function formatUnitLabel(unit: Pick<UnitRecord, "name" | "nameHindi">): string {
  if (unit.nameHindi?.trim()) {
    return `${unit.name} (${unit.nameHindi})`;
  }
  return unit.name;
}

export function buildSeedUnits(now = new Date().toISOString()): UnitRecord[] {
  return BUSINESS_UNIT_SEEDS.map((seed, index) => ({
    id: `unit-seed-${index + 1}`,
    name: seed.name,
    nameHindi: seed.nameHindi,
    shortCode: seed.shortCode,
    isSystemSeed: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export const IMPLEMENTED_ADMINISTRATION_MODULE_IDS = new Set([
  "accounts",
  "account-group",
  "employee-management",
  "godowns-locations",
  "units",
  "unit-conversion",
]);
