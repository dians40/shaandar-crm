import type { UnitRecord } from "@/types/unit";

type UnitSeedSpec = {
  name: string;
  shortCode: string;
};

/** Standard business units — English only, pre-seeded and available instantly. */
export const BUSINESS_UNIT_SEEDS: UnitSeedSpec[] = [
  { name: "Bag", shortCode: "Bag" },
  { name: "Bundle", shortCode: "Bdl" },
  { name: "Bottle", shortCode: "Btl" },
  { name: "Box", shortCode: "Box" },
  { name: "Crate", shortCode: "Crt" },
  { name: "Carton", shortCode: "Ctn" },
  { name: "Dozen", shortCode: "Dzn" },
  { name: "Drums", shortCode: "Drm" },
  { name: "Feet", shortCode: "Ft" },
  { name: "Gram", shortCode: "g" },
  { name: "KG", shortCode: "KG" },
  { name: "Liter", shortCode: "L" },
  { name: "Pieces", shortCode: "Pcs" },
  { name: "Strip", shortCode: "Str" },
  { name: "Meter", shortCode: "m" },
  { name: "Peti", shortCode: "Peti" },
  { name: "Packet", shortCode: "Pkt" },
  { name: "Numbers", shortCode: "No" },
];

export function formatUnitLabel(unit: Pick<UnitRecord, "name">): string {
  return unit.name;
}

export function buildSeedUnits(now = new Date().toISOString()): UnitRecord[] {
  return BUSINESS_UNIT_SEEDS.map((seed, index) => ({
    id: `unit-seed-${index + 1}`,
    name: seed.name,
    nameHindi: "",
    shortCode: seed.shortCode,
    isSystemSeed: true,
    createdAt: now,
    updatedAt: now,
  }));
}
