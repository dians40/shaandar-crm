export type VehicleDocumentKey =
  | "pollutionCertificate"
  | "vehicleInsurance"
  | "fitnessPermit"
  | "driverLicense"
  | "allIndiaPermit"
  | "roadTaxReceipt"
  | "gprLicenseCertificate"
  | "nationalPermit";

export type VehicleExpiryAlert =
  | "Notify 24 Hours Before"
  | "Notify 15 Days Before"
  | "Notify 20 Days Before"
  | "";

export const VEHICLE_EXPIRY_ALERT_OPTIONS: VehicleExpiryAlert[] = [
  "Notify 24 Hours Before",
  "Notify 15 Days Before",
  "Notify 20 Days Before",
];

export type VehicleDocumentBlock = {
  expiryDate: string;
  fileName: string | null;
  expiryAlert: VehicleExpiryAlert;
};

export type VehicleDriverEntry = {
  id: string;
  driverName: string;
  joiningDate: string;
};

export type VehicleMasterRecord = {
  id: string;
  registrationNumber: string;
  model: string;
  ownerDetails: string;
  /** Fixed average fuel efficiency — KM per liter */
  averageMileageKmPerLiter: number;
  driverName: string;
  driverJoiningDate: string;
  driverHistory: VehicleDriverEntry[];
  documents: Record<VehicleDocumentKey, VehicleDocumentBlock>;
  createdAt: string;
  updatedAt: string;
};

export type VehicleMasterFormState = Omit<
  VehicleMasterRecord,
  "id" | "createdAt" | "updatedAt"
>;

export const VEHICLE_DOCUMENT_LABELS: Record<VehicleDocumentKey, string> = {
  pollutionCertificate: "Pollution Certificate",
  vehicleInsurance: "Vehicle Insurance",
  fitnessPermit: "Fitness Certificate & Permit",
  driverLicense: "Linked Driver License Details",
  allIndiaPermit: "All India Permit",
  roadTaxReceipt: "Road Tax Receipt",
  gprLicenseCertificate: "GPR License Certificate",
  nationalPermit: "National Permit",
};

function emptyDocumentBlock(): VehicleDocumentBlock {
  return { expiryDate: "", fileName: null, expiryAlert: "" };
}

export function emptyVehicleDocuments(): Record<VehicleDocumentKey, VehicleDocumentBlock> {
  return {
    pollutionCertificate: emptyDocumentBlock(),
    vehicleInsurance: emptyDocumentBlock(),
    fitnessPermit: emptyDocumentBlock(),
    driverLicense: emptyDocumentBlock(),
    allIndiaPermit: emptyDocumentBlock(),
    roadTaxReceipt: emptyDocumentBlock(),
    gprLicenseCertificate: emptyDocumentBlock(),
    nationalPermit: emptyDocumentBlock(),
  };
}

export const EMPTY_VEHICLE_MASTER_FORM: VehicleMasterFormState = {
  registrationNumber: "",
  model: "",
  ownerDetails: "",
  averageMileageKmPerLiter: 0,
  driverName: "",
  driverJoiningDate: "",
  driverHistory: [],
  documents: emptyVehicleDocuments(),
};

function mergeDocumentBlock(
  defaults: VehicleDocumentBlock,
  incoming?: Partial<VehicleDocumentBlock>
): VehicleDocumentBlock {
  return {
    expiryDate: incoming?.expiryDate ?? defaults.expiryDate,
    fileName: incoming?.fileName ?? defaults.fileName,
    expiryAlert: incoming?.expiryAlert ?? defaults.expiryAlert,
  };
}

/** Migrate legacy records that used vehicleName or combined gprLicense key. */
export function normalizeVehicleMasterRecord(
  row: Partial<VehicleMasterRecord> & Pick<VehicleMasterRecord, "id"> & {
    vehicleName?: string;
    documents?: Partial<Record<string, VehicleDocumentBlock>>;
  }
): VehicleMasterRecord {
  const defaults = emptyVehicleDocuments();
  const legacyDocs = (row.documents ?? {}) as Partial<
    Record<VehicleDocumentKey | "gprLicense", VehicleDocumentBlock>
  >;
  const legacyGpr = legacyDocs.gprLicense;

  const documents = {
    pollutionCertificate: mergeDocumentBlock(
      defaults.pollutionCertificate,
      legacyDocs.pollutionCertificate
    ),
    vehicleInsurance: mergeDocumentBlock(
      defaults.vehicleInsurance,
      legacyDocs.vehicleInsurance
    ),
    fitnessPermit: mergeDocumentBlock(defaults.fitnessPermit, legacyDocs.fitnessPermit),
    driverLicense: mergeDocumentBlock(defaults.driverLicense, legacyDocs.driverLicense),
    allIndiaPermit: mergeDocumentBlock(defaults.allIndiaPermit, legacyDocs.allIndiaPermit),
    roadTaxReceipt: mergeDocumentBlock(defaults.roadTaxReceipt, legacyDocs.roadTaxReceipt),
    gprLicenseCertificate: mergeDocumentBlock(
      defaults.gprLicenseCertificate,
      legacyDocs.gprLicenseCertificate ?? legacyGpr
    ),
    nationalPermit: mergeDocumentBlock(
      defaults.nationalPermit,
      legacyDocs.nationalPermit
    ),
  };

  return {
    id: row.id,
    registrationNumber: row.registrationNumber ?? row.vehicleName ?? "",
    model: row.model ?? "",
    ownerDetails: row.ownerDetails ?? "",
    averageMileageKmPerLiter: Number(row.averageMileageKmPerLiter) || 0,
    driverName: row.driverName ?? "",
    driverJoiningDate: row.driverJoiningDate ?? "",
    driverHistory: Array.isArray(row.driverHistory) ? row.driverHistory : [],
    documents,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateVehicleMasterForm(form: VehicleMasterFormState): string | null {
  if (!form.registrationNumber.trim()) return "Registration number is required.";
  if (!form.driverName.trim()) return "Driver name is required.";
  if (!form.driverJoiningDate.trim()) return "Driver joining date is required.";
  if (!form.averageMileageKmPerLiter || form.averageMileageKmPerLiter <= 0) {
    return "Average Mileage (KM per Liter) is required and must be greater than zero.";
  }
  return null;
}

export type ExpiryStatus = "valid" | "expiring" | "expired" | "unset";

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  if (!expiryDate?.trim()) return "unset";
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return "unset";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return "expired";
  const days = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return "expiring";
  return "valid";
}

export function createDriverHistoryEntry(
  driverName: string,
  joiningDate: string
): VehicleDriverEntry {
  return {
    id: `driver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    driverName,
    joiningDate,
  };
}
