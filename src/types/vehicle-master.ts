export type VehicleDocumentKey =
  | "pollutionCertificate"
  | "vehicleInsurance"
  | "fitnessPermit"
  | "driverLicense"
  | "allIndiaPermit"
  | "roadTaxReceipt"
  | "gprLicense";

export type VehicleDocumentBlock = {
  expiryDate: string;
  fileName: string | null;
};

export type VehicleMasterRecord = {
  id: string;
  vehicleName: string;
  registrationNumber: string;
  model: string;
  ownerDetails: string;
  documents: Record<VehicleDocumentKey, VehicleDocumentBlock>;
  createdAt: string;
  updatedAt: string;
};

export type VehicleMasterFormState = Omit<VehicleMasterRecord, "id" | "createdAt" | "updatedAt">;

export const VEHICLE_DOCUMENT_LABELS: Record<VehicleDocumentKey, string> = {
  pollutionCertificate: "Pollution Certificate",
  vehicleInsurance: "Vehicle Insurance",
  fitnessPermit: "Fitness Certificate & Permit",
  driverLicense: "Linked Driver License Details",
  allIndiaPermit: "All India Permit",
  roadTaxReceipt: "Road Tax Receipt",
  gprLicense: "GPR License / National Goods Permit",
};

export function emptyVehicleDocuments(): Record<VehicleDocumentKey, VehicleDocumentBlock> {
  return {
    pollutionCertificate: { expiryDate: "", fileName: null },
    vehicleInsurance: { expiryDate: "", fileName: null },
    fitnessPermit: { expiryDate: "", fileName: null },
    driverLicense: { expiryDate: "", fileName: null },
    allIndiaPermit: { expiryDate: "", fileName: null },
    roadTaxReceipt: { expiryDate: "", fileName: null },
    gprLicense: { expiryDate: "", fileName: null },
  };
}

export const EMPTY_VEHICLE_MASTER_FORM: VehicleMasterFormState = {
  vehicleName: "",
  registrationNumber: "",
  model: "",
  ownerDetails: "",
  documents: emptyVehicleDocuments(),
};

export function normalizeVehicleMasterRecord(
  row: Partial<VehicleMasterRecord> & Pick<VehicleMasterRecord, "id">
): VehicleMasterRecord {
  const defaults = emptyVehicleDocuments();
  const docs = row.documents ?? defaults;

  return {
    id: row.id,
    vehicleName: row.vehicleName ?? "",
    registrationNumber: row.registrationNumber ?? "",
    model: row.model ?? "",
    ownerDetails: row.ownerDetails ?? "",
    documents: {
      pollutionCertificate: { ...defaults.pollutionCertificate, ...docs.pollutionCertificate },
      vehicleInsurance: { ...defaults.vehicleInsurance, ...docs.vehicleInsurance },
      fitnessPermit: { ...defaults.fitnessPermit, ...docs.fitnessPermit },
      driverLicense: { ...defaults.driverLicense, ...docs.driverLicense },
      allIndiaPermit: { ...defaults.allIndiaPermit, ...docs.allIndiaPermit },
      roadTaxReceipt: { ...defaults.roadTaxReceipt, ...docs.roadTaxReceipt },
      gprLicense: { ...defaults.gprLicense, ...docs.gprLicense },
    },
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateVehicleMasterForm(form: VehicleMasterFormState): string | null {
  if (!form.vehicleName.trim()) return "Vehicle name is required.";
  if (!form.registrationNumber.trim()) return "Registration number is required.";
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
