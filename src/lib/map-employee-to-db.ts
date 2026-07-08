import type { EmployeeFormData, DocumentNumbers } from "@/types/employee-form";
import type { DocumentPaths, EmployeeInsert, EmployeeRow } from "@/types/employee-db";
import type { EmployeeListItem } from "@/types/employee-list";
import { combineAssignedFromGroup } from "@/lib/employee-assigned-from";
import {
  parseStatutoryStatusFromDb,
} from "@/lib/statutory-status";
import {
  calculateAllowances,
  calculateContractTotal,
} from "@/lib/salary-breakdown";
import {
  calculateVariableSalary,
  getEffectiveGrossSalary,
} from "@/lib/statutory-calculations";

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountToString(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function cleanDocumentNumbers(numbers: DocumentNumbers): DocumentNumbers {
  return {
    pan: numbers.pan.trim(),
    esi: numbers.esi.trim(),
    pf: numbers.pf.trim(),
    drivingLicense: numbers.drivingLicense.trim(),
    rationCard: numbers.rationCard.trim(),
    voterId: numbers.voterId.trim(),
  };
}

function resolveAssignedFromGroup(row: {
  assigned_from_group?: string | null;
  assigned_firm?: string | null;
  assigned_contractor?: string | null;
}): string {
  return (
    row.assigned_from_group?.trim() ||
    combineAssignedFromGroup(row.assigned_firm, row.assigned_contractor)
  );
}

export function mapFormToEmployeeInsert(
  formData: EmployeeFormData,
  documentPaths: DocumentPaths = {}
): EmployeeInsert {
  const basic = formData.basicInformation;
  const work = formData.workAssignment;
  const bank = formData.bankAndSalary;
  const docNumbers = cleanDocumentNumbers(formData.documentNumbers);

  const mergedPaths = { ...formData.existingDocumentPaths, ...documentPaths };
  const basicSalary = parseAmount(bank.basicSalary) ?? parseAmount(bank.fixSalaryAmount);
  const allowanceBreakdown =
    basicSalary !== null ? calculateAllowances(basicSalary) : null;
  const contractPacking = bank.contractPacking ?? {
    itemName: "",
    minimumOutput: "",
    quantityProduced: "",
    ratePerPiece: "",
  };
  const contractTotal = calculateContractTotal(
    contractPacking.quantityProduced,
    contractPacking.ratePerPiece
  );

  const photoUrl =
    mergedPaths.profilePhoto ??
    formData.existingDocumentPaths.profilePhoto ??
    null;

  return {
    full_name: basic.name.trim(),
    father_name: basic.fatherName.trim() || null,
    mother_name: basic.motherName.trim() || null,
    date_of_birth: basic.dateOfBirth,
    age: basic.age,
    joining_date: basic.joiningDate || null,
    gender: basic.gender || null,
    mobile_number: basic.mobileNumber,
    alternative_mobile_number: basic.alternativeMobileNumber.trim() || null,
    full_address: basic.fullAddress.trim() || null,
    pin_code: basic.pinCode.trim() || null,
    vehicle_number: null,
    police_station: basic.policeStationName.trim() || null,
    reference_name: basic.referenceFromName.trim() || null,
    reference_mobile: basic.referenceMobileNumber.trim() || null,
    photo_url: photoUrl,
    employee_type: basic.employeeType,
    salary_basis: basic.salaryBasis || null,
    assigned_from_group: basic.assignedFromGroup.trim() || null,
    machine_assignment: (work.machineAssignment ?? "").trim() || null,
    family_members: formData.familyMembers,
    document_paths: mergedPaths,
    pan_number: docNumbers.pan || null,
    pf_number: docNumbers.pf || null,
    esi_number: docNumbers.esi || null,
    voter_id_number: docNumbers.voterId || null,
    ration_card_number: docNumbers.rationCard || null,
    driving_license_number: docNumbers.drivingLicense || null,
    bank_account_number: bank.bankAccountNumber.trim() || null,
    ifsc_code: bank.ifscCode.trim() || null,
    branch_name: bank.branchName.trim() || null,
    basic_salary: basicSalary,
    allowances: allowanceBreakdown
      ? {
          basicSalary: allowanceBreakdown.basicSalary,
          conveyance: allowanceBreakdown.conveyance,
          hra: allowanceBreakdown.hra,
          tea: allowanceBreakdown.tea,
          washing: allowanceBreakdown.washing,
          grossWithAllowances: allowanceBreakdown.grossWithAllowances,
        }
      : {},
    fix_salary_amount: basicSalary,
    variable_salary_enabled: bank.variableSalaryEnabled,
    daily_rate: parseAmount(bank.dailyRate),
    worked_days: parseAmount(bank.workedDays),
    esi_status: bank.esiStatus || null,
    pf_status: bank.pfStatus || null,
    firm_head_profile: (bank.firmHeadProfile ?? "").trim() || null,
    pf_firm: (bank.pfFirm ?? "").trim() || null,
    fooding_allowance: bank.foodingAllowance || null,
    contract_packing: {
      itemName: contractPacking.itemName,
      minimumOutput: contractPacking.minimumOutput,
      quantityProduced: contractPacking.quantityProduced,
      ratePerPiece: contractPacking.ratePerPiece,
      totalEarned: contractTotal,
    },
    bonus_last_year: parseAmount(bank.bonusLastYear),
    extra_payment: parseAmount(bank.extraPayment),
    advance_paid: parseAmount(bank.advancePaid),
    overtime_hourly_rate: parseAmount(bank.overtimeHourlyRate),
  };
}

export function mapEmployeeRowToListItem(
  row: {
  id: string;
  full_name: string;
  employee_type: string;
  mobile_number: string;
  machine_assignment: string | null;
  fix_salary_amount?: number | null;
  basic_salary?: number | null;
  variable_salary_enabled?: boolean | null;
  daily_rate?: number | null;
  worked_days?: number | null;
  assigned_from_group?: string | null;
  assigned_firm?: string | null;
  assigned_contractor?: string | null;
  esi_status?: string | null;
  pf_status?: string | null;
  esi_enabled?: boolean | null;
  pf_enabled?: boolean | null;
  overtime_hourly_rate?: number | null;
},
  options?: { hasAttendanceRecords?: boolean }
): EmployeeListItem {
  const variableEnabled = Boolean(row.variable_salary_enabled);
  const salaryBase = row.basic_salary ?? row.fix_salary_amount;
  const effectiveSalary = getEffectiveGrossSalary(
    salaryBase,
    variableEnabled,
    row.daily_rate,
    row.worked_days
  );
  return {
    id: row.id,
    name: row.full_name,
    employeeType: row.employee_type as EmployeeListItem["employeeType"],
    mobileNumber: row.mobile_number,
    machineAssignment: row.machine_assignment || "—",
    fixSalaryAmount: salaryBase ?? null,
    variableSalaryEnabled: variableEnabled,
    dailyRate: row.daily_rate ?? null,
    workedDays: row.worked_days ?? null,
    effectiveSalary: effectiveSalary > 0 ? effectiveSalary : salaryBase ?? null,
    assignedFromGroup: resolveAssignedFromGroup(row) || "—",
    esiStatus: parseStatutoryStatusFromDb(row.esi_status, row.esi_enabled),
    pfStatus: parseStatutoryStatusFromDb(row.pf_status, row.pf_enabled),
    hasAttendanceRecords: options?.hasAttendanceRecords ?? false,
    overtimeHourlyRate: row.overtime_hourly_rate ?? null,
  };
}

export function mapEmployeeRowToFormData(row: EmployeeRow): EmployeeFormData {
  const basicSalary = row.basic_salary ?? row.fix_salary_amount;

  return {
    basicInformation: {
      name: row.full_name ?? "",
      fatherName: row.father_name ?? "",
      motherName: row.mother_name ?? "",
      dateOfBirth: row.date_of_birth,
      age: row.age,
      joiningDate: row.joining_date ?? "",
      gender: (row.gender ?? "") as EmployeeFormData["basicInformation"]["gender"],
      mobileNumber: row.mobile_number,
      alternativeMobileNumber: row.alternative_mobile_number ?? "",
      fullAddress: row.full_address ?? "",
      pinCode: row.pin_code ?? "",
      policeStationName: row.police_station ?? "",
      referenceFromName: row.reference_name ?? "",
      referenceMobileNumber: row.reference_mobile ?? "",
      employeeType: row.employee_type as EmployeeFormData["basicInformation"]["employeeType"],
      salaryBasis: (row.salary_basis ?? "") as EmployeeFormData["basicInformation"]["salaryBasis"],
      assignedFromGroup: resolveAssignedFromGroup(row),
    },
    workAssignment: {
      machineAssignment: row.machine_assignment ?? "",
    },
    familyMembers: Array.isArray(row.family_members) ? row.family_members : [],
    documents: {
      profilePhoto: null,
      aadhar: null,
      pan: null,
      esi: null,
      pf: null,
      drivingLicense: null,
      rationCard: null,
      voterId: null,
      otherDocuments: null,
    },
    documentNumbers: {
      pan: row.pan_number ?? "",
      esi: row.esi_number ?? "",
      pf: row.pf_number ?? "",
      drivingLicense: row.driving_license_number ?? "",
      rationCard: row.ration_card_number ?? "",
      voterId: row.voter_id_number ?? "",
    },
    existingDocumentPaths: {
      ...(row.document_paths ?? {}),
      profilePhoto: row.photo_url ?? row.document_paths?.profilePhoto ?? null,
    },
    bankAndSalary: {
      bankAccountNumber: row.bank_account_number ?? "",
      ifscCode: row.ifsc_code ?? "",
      branchName: row.branch_name ?? "",
      basicSalary: amountToString(basicSalary),
      fixSalaryAmount: amountToString(row.fix_salary_amount),
      variableSalaryEnabled: row.variable_salary_enabled ?? false,
      dailyRate: amountToString(row.daily_rate),
      workedDays: amountToString(row.worked_days),
      esiStatus: parseStatutoryStatusFromDb(row.esi_status, row.esi_enabled),
      pfStatus: parseStatutoryStatusFromDb(row.pf_status, row.pf_enabled),
      firmHeadProfile: (row.firm_head_profile ?? "") as EmployeeFormData["bankAndSalary"]["firmHeadProfile"],
      pfFirm: (row.pf_firm ?? "") as EmployeeFormData["bankAndSalary"]["pfFirm"],
      foodingAllowance: (row.fooding_allowance ?? "") as EmployeeFormData["bankAndSalary"]["foodingAllowance"],
      contractPacking: {
        itemName: row.contract_packing?.itemName ?? "",
        minimumOutput: row.contract_packing?.minimumOutput ?? "",
        quantityProduced: row.contract_packing?.quantityProduced ?? "",
        ratePerPiece: row.contract_packing?.ratePerPiece ?? "",
      },
      bonusLastYear: amountToString(row.bonus_last_year),
      extraPayment: amountToString(row.extra_payment),
      advancePaid: amountToString(row.advance_paid),
      overtimeHourlyRate: amountToString(row.overtime_hourly_rate),
    },
  };
}

export function formatSalaryDisplay(employee: EmployeeListItem): string {
  if (employee.variableSalaryEnabled && employee.dailyRate) {
    const variable = calculateVariableSalary(employee.dailyRate, employee.workedDays);
    if (variable > 0) {
      return `₹${variable.toLocaleString("en-IN")} (var)`;
    }
    return `₹${employee.dailyRate}/day`;
  }
  if (employee.fixSalaryAmount !== null) {
    return `₹${employee.fixSalaryAmount.toLocaleString("en-IN")}`;
  }
  return "—";
}
