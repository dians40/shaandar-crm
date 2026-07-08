export type EmployeeType = string;

export type SalaryBasis =
  | "Branch Salary"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Contract-based";

export type AssignedFirm = "Krishna Food Product" | "MAHEK Industries";

export type FirmHeadProfile =
  | "Krishna Food Product"
  | "Mehak Industries"
  | "KFP Abhay Mishra"
  | "KFP Dipankar Kalita"
  | "KFP Lalit Lakhotia"
  | "KFP Hazir Ali"
  | "MI Hazir Ali"
  | "MI Lalit Lakhotia"
  | "MI Dipankar Kalita"
  | "MI Abhay Kumar Mishra";

export type PfFirm = "Krishna Food Products" | "Mehak Industries";

export type AssignedContractor = string;

export type StatutoryStatus = "Active" | "Non-Active";

export type FoodingAllowance =
  | "Daily Food Provided by Company"
  | "Self-Managed / Eaten by Self";

export type Gender = "Male" | "Female" | "Other";

export type FamilyRelationship = "Mother" | "Father" | "Child";

export type EsIRole =
  | "Primary Beneficiary"
  | "Dependent Spouse"
  | "Dependent Child"
  | "Dependent Parent"
  | "ESI Nominee"
  | "Not Applicable";

export type DocumentKey =
  | "profilePhoto"
  | "aadhar"
  | "pan"
  | "esi"
  | "pf"
  | "drivingLicense"
  | "rationCard"
  | "voterId"
  | "otherDocuments";

/** Document ID numbers — Aadhaar excluded (file upload only) */
export type DocumentNumberKey = Exclude<DocumentKey, "aadhar" | "profilePhoto" | "otherDocuments">;

export type DocumentNumbers = Record<DocumentNumberKey, string>;

export type FileMeta = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export type FamilyMember = {
  id: string;
  fullName: string;
  relationship: FamilyRelationship;
  esiRole: EsIRole;
};

export type ContractPacking = {
  itemName: string;
  minimumOutput: string;
  quantityProduced: string;
  ratePerPiece: string;
};

export type BasicInformation = {
  name: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  age: number | null;
  joiningDate: string;
  gender: Gender | "";
  mobileNumber: string;
  alternativeMobileNumber: string;
  fullAddress: string;
  pinCode: string;
  policeStationName: string;
  referenceFromName: string;
  referenceMobileNumber: string;
  employeeType: EmployeeType | "";
  salaryBasis: SalaryBasis | "";
  assignedFromGroup: string;
};

export type WorkAssignment = {
  machineAssignment: string;
};

export type DocumentFiles = Record<DocumentKey, File | null>;

export type Documents = Record<DocumentKey, FileMeta | null>;

export type DocumentPaths = Partial<Record<DocumentKey, string | null>>;

export type BankAndSalary = {
  bankAccountNumber: string;
  ifscCode: string;
  branchName: string;
  basicSalary: string;
  fixSalaryAmount: string;
  variableSalaryEnabled: boolean;
  dailyRate: string;
  workedDays: string;
  esiStatus: StatutoryStatus | "";
  pfStatus: StatutoryStatus | "";
  firmHeadProfile: FirmHeadProfile | "";
  pfFirm: PfFirm | "";
  foodingAllowance: FoodingAllowance | "";
  contractPacking: ContractPacking;
  bonusLastYear: string;
  extraPayment: string;
  advancePaid: string;
  overtimeHourlyRate: string;
};

export type EmployeeFormData = {
  basicInformation: BasicInformation;
  workAssignment: WorkAssignment;
  familyMembers: FamilyMember[];
  documents: DocumentFiles;
  documentNumbers: DocumentNumbers;
  existingDocumentPaths: DocumentPaths;
  bankAndSalary: BankAndSalary;
};

export type FormSectionId =
  | "basic"
  | "work"
  | "family"
  | "documents"
  | "bank";

export const EMPTY_DOCUMENTS: DocumentFiles = {
  profilePhoto: null,
  aadhar: null,
  pan: null,
  esi: null,
  pf: null,
  drivingLicense: null,
  rationCard: null,
  voterId: null,
  otherDocuments: null,
};

export const EMPTY_DOCUMENT_NUMBERS: DocumentNumbers = {
  pan: "",
  esi: "",
  pf: "",
  drivingLicense: "",
  rationCard: "",
  voterId: "",
};

export const INITIAL_CONTRACT_PACKING: ContractPacking = {
  itemName: "",
  minimumOutput: "",
  quantityProduced: "",
  ratePerPiece: "",
};

export const INITIAL_EMPLOYEE_FORM: EmployeeFormData = {
  basicInformation: {
    name: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    age: null,
    joiningDate: "",
    gender: "",
    mobileNumber: "",
    alternativeMobileNumber: "",
    fullAddress: "",
    pinCode: "",
    policeStationName: "",
    referenceFromName: "",
    referenceMobileNumber: "",
    employeeType: "",
    salaryBasis: "",
    assignedFromGroup: "",
  },
  workAssignment: {
    machineAssignment: "",
  },
  familyMembers: [],
  documents: { ...EMPTY_DOCUMENTS },
  documentNumbers: { ...EMPTY_DOCUMENT_NUMBERS },
  existingDocumentPaths: {},
  bankAndSalary: {
    bankAccountNumber: "",
    ifscCode: "",
    branchName: "",
    basicSalary: "",
    fixSalaryAmount: "",
    variableSalaryEnabled: false,
    dailyRate: "",
    workedDays: "",
    esiStatus: "",
    pfStatus: "",
    firmHeadProfile: "",
    pfFirm: "",
    foodingAllowance: "",
    contractPacking: { ...INITIAL_CONTRACT_PACKING },
    bonusLastYear: "",
    extraPayment: "",
    advancePaid: "",
    overtimeHourlyRate: "",
  },
};
