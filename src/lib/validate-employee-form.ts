import type { BasicInformation, BankAndSalary } from "@/types/employee-form";
import { isStatutoryActive } from "@/lib/statutory-status";

export type BasicInformationField =
  | "name"
  | "mobileNumber"
  | "dateOfBirth"
  | "employeeType"
  | "gender"
  | "assignedFromGroup";

export type BankAndSalaryField =
  | "esiStatus"
  | "pfStatus"
  | "firmHeadProfile"
  | "pfFirm";

export type BasicInformationErrors = Partial<
  Record<BasicInformationField, string>
>;

export type BankAndSalaryErrors = Partial<Record<BankAndSalaryField, string>>;

export function validateBasicInformation(
  data: BasicInformation
): BasicInformationErrors {
  const errors: BasicInformationErrors = {};

  if (!data.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required.";
  }

  if (!data.gender) {
    errors.gender = "Gender is required.";
  }

  if (!data.employeeType) {
    errors.employeeType = "Employee type is required.";
  }

  if (!data.assignedFromGroup.trim()) {
    errors.assignedFromGroup =
      "Assigned From / Contractor Group is required.";
  }

  if (!data.mobileNumber.trim()) {
    errors.mobileNumber = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(data.mobileNumber)) {
    errors.mobileNumber = "Mobile number must be exactly 10 digits.";
  }

  return errors;
}

export function validateBankAndSalary(data: BankAndSalary): BankAndSalaryErrors {
  const errors: BankAndSalaryErrors = {};

  if (!data.esiStatus) {
    errors.esiStatus = "ESI Status is required.";
  }

  if (!data.pfStatus) {
    errors.pfStatus = "PF Status is required.";
  }

  if (isStatutoryActive(data.esiStatus) && !data.firmHeadProfile) {
    errors.firmHeadProfile =
      "Firm / Head Profile is required when ESI status is Active.";
  }

  if (isStatutoryActive(data.pfStatus) && !data.pfFirm) {
    errors.pfFirm = "PF Firm selection is required when PF status is Active.";
  }

  return errors;
}

export function hasValidationErrors(
  errors: BasicInformationErrors | BankAndSalaryErrors
): boolean {
  return Object.keys(errors).length > 0;
}

export function validateEmployeeForm(data: {
  basicInformation: BasicInformation;
  bankAndSalary: BankAndSalary;
}): { basic: BasicInformationErrors; bank: BankAndSalaryErrors } {
  return {
    basic: validateBasicInformation(data.basicInformation),
    bank: validateBankAndSalary(data.bankAndSalary),
  };
}
