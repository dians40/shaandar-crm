export const GLASS_PACKING_DEPARTMENT = "glass packing";

export type GlassPackingRecord = {
  id: string;
  workDate: string;
  department: string;
  employeeId: string;
  employeeName: string;
  timeIn: string;
  timeOut: string;
  shiftType: string;
  amountSalary: number;
  itemName: string;
  targetPackets: number;
  achievementPackets: number;
  shortagePackets: number;
  excessPackets: number;
  createdAt: string;
  updatedAt: string;
};

export type GlassPackingFormState = Omit<
  GlassPackingRecord,
  "id" | "shortagePackets" | "excessPackets" | "createdAt" | "updatedAt"
>;

export const EMPTY_GLASS_PACKING_FORM: GlassPackingFormState = {
  workDate: new Date().toISOString().slice(0, 10),
  department: GLASS_PACKING_DEPARTMENT,
  employeeId: "",
  employeeName: "",
  timeIn: "",
  timeOut: "",
  shiftType: "",
  amountSalary: 0,
  itemName: "",
  targetPackets: 0,
  achievementPackets: 0,
};

export const GLASS_PACKING_ITEM_FALLBACKS = [
  "Glass Jar 500 ml",
  "Glass Jar 750 ml",
  "Glass Bottle 1 L",
  "Glass Bottle 500 ml",
  "Glass Container Set",
];

export function computePacketVariance(target: number, achievement: number): {
  shortagePackets: number;
  excessPackets: number;
} {
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const safeAchievement = Number.isFinite(achievement) ? Math.max(0, achievement) : 0;

  return {
    shortagePackets: safeTarget > safeAchievement ? safeTarget - safeAchievement : 0,
    excessPackets: safeAchievement > safeTarget ? safeAchievement - safeTarget : 0,
  };
}

export function normalizeGlassPackingRecord(
  row: Partial<GlassPackingRecord> & Pick<GlassPackingRecord, "id">
): GlassPackingRecord {
  const variance = computePacketVariance(
    row.targetPackets ?? 0,
    row.achievementPackets ?? 0
  );

  return {
    id: row.id,
    workDate: row.workDate ?? new Date().toISOString().slice(0, 10),
    department: row.department ?? GLASS_PACKING_DEPARTMENT,
    employeeId: row.employeeId ?? "",
    employeeName: row.employeeName ?? "",
    timeIn: row.timeIn ?? "",
    timeOut: row.timeOut ?? "",
    shiftType: row.shiftType ?? "",
    amountSalary: row.amountSalary ?? 0,
    itemName: row.itemName ?? "",
    targetPackets: row.targetPackets ?? 0,
    achievementPackets: row.achievementPackets ?? 0,
    shortagePackets: row.shortagePackets ?? variance.shortagePackets,
    excessPackets: row.excessPackets ?? variance.excessPackets,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateGlassPackingForm(form: GlassPackingFormState): string | null {
  if (!form.employeeId.trim()) return "Employee selection is required.";
  if (!form.itemName.trim()) return "Item name is required.";
  if (form.targetPackets < 0 || form.achievementPackets < 0) {
    return "Packet counts cannot be negative.";
  }
  return null;
}
