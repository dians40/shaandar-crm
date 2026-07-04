import type { BasicInformation } from "@/types/employee-form";

export type BasicInformationField =
  | "firstName"
  | "lastName"
  | "mobileNumber"
  | "dateOfBirth"
  | "employeeType"
  | "gender";

export type BasicInformationErrors = Partial<
  Record<BasicInformationField, string>
>;

export function validateBasicInformation(
  data: BasicInformation
): BasicInformationErrors {
  const errors: BasicInformationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required.";
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

  if (!data.mobileNumber.trim()) {
    errors.mobileNumber = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(data.mobileNumber)) {
    errors.mobileNumber = "Mobile number must be exactly 10 digits.";
  }

  return errors;
}

export function hasValidationErrors(
  errors: BasicInformationErrors
): boolean {
  return Object.keys(errors).length > 0;
}
